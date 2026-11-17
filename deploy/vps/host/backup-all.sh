#!/usr/bin/env bash
# Sauvegarde nocturne chiffrée : bases du MariaDB Docker partagé, configurations, secrets et volumes persistants.
# Chiffrée avec age pour la clé PUBLIQUE de ~/deploy/backup-recipients.txt : le VPS peut écrire les sauvegardes mais ne peut pas les relire,
# seul le Mac (clé privée) peut restaurer. Les fichiers .age sont rapatriés par pull-backups.sh (côté Mac).
#   BACKUP_DIR=~/backups/nightly ./backup-all.sh
set -euo pipefail
root="${BACKUP_DIR:-$HOME/backups/nightly}"
recipients="${AGE_RECIPIENTS:-$HOME/deploy/backup-recipients.txt}"
keep_days="${KEEP_DAYS:-14}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
# Un dossier par sauvegarde, nommé par sa date (UTC) : nightly/2026-10-27_100804/…
dest="$root/$(date -u +%Y-%m-%d_%H%M%S)"
[ -s "$recipients" ] || { echo "clé publique age absente : $recipients" >&2; exit 1; }
command -v age >/dev/null || { echo "installer age (apt install age)" >&2; exit 1; }
umask 077
mkdir -p "$dest"
set -a; . "$HOME/db-credentials/dbadmin.env"; set +a
export MYSQL_PWD="$DB_PASSWORD"
sql=(mariadb --socket=/run/mysqld/mysqld.sock -u"$DB_USER")

# Chaque fichier est écrit sous un nom provisoire puis renommé : un échec ne laisse jamais un fichier tronqué qui passerait pour bon.
keep() { mv "$1.part" "$1"; echo "$(basename "$1") ($(wc -c < "$1") octets)"; }

# Les bases *_test sont jetables.
databases="$("${sql[@]}" -N -e "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('mysql','information_schema','performance_schema','sys') AND schema_name NOT LIKE '%\_test'")"
for db in $databases; do
  out="$dest/$stamp-db-$db.sql.gz.age"
  mariadb-dump --socket=/run/mysqld/mysqld.sock -u"$DB_USER" --single-transaction --quick --routines --triggers --events --default-character-set=utf8mb4 "$db" \
    | gzip -9 | age -R "$recipients" > "$out.part"
  keep "$out"
done

# Ce qui n'est pas dans Git : secrets et réglages.
out="$dest/$stamp-config.tar.gz.age"
files=(db-credentials deploy/state deploy/shared deploy/backup-all.sh deploy/auto-deploy.sh deploy/backup-recipients.txt)
for f in repos/*/server/.env repos/fr/deploy/vps/.env Cadence/.env Cadence/docker-compose.prod.yml deploy/carvizo/.env deploy/carvizo/docker-compose.yml deploy/arbigo/.env deploy/arbigo/migration.env; do [ -f "$HOME/$f" ] && files+=("$f"); done
# /etc/monitor.env n'est lisible que par root et le groupe monitor : copie temporaire protégée, supprimée ensuite.
trap 'rm -rf "${extra:-}" "${pending:-}"' EXIT   # posé avant les dossiers temporaires : un échec ne laisse rien derrière
extra="$(mktemp -d)"
sudo -n cat /etc/monitor.env > "$extra/monitor.env" 2>/dev/null || { rm -f "$extra/monitor.env"; echo "avertissement : /etc/monitor.env non sauvegardé" >&2; }
# Collect recovery configuration with sudo; fail rather than silently omit it.
sudo -n tar -C / -czf "$extra/host-config.tar.gz" etc/monitor.env etc/systemd/system/monitor.service etc/systemd/system/shared-mariadb.service etc/tmpfiles.d/shared-mariadb.conf etc/mysql opt/phpmyadmin/config.user.inc.php opt/phpmyadmin/docker-compose.yml
sudo -n chown "$(id -u):$(id -g)" "$extra/host-config.tar.gz"
crontab -l > "$extra/crontab.txt"
# MariaDB users and grants are needed to restore the application accounts.
sudo -n mariadb-dump --socket=/run/mysqld/mysqld.sock --system=users > "$extra/database-users.sql"
extra_files=(-C "$extra" host-config.tar.gz crontab.txt database-users.sql)
[ ! -s "$extra/monitor.env" ] || extra_files+=(monitor.env)
tar --exclude=deploy/shared/mariadb/data -czf - -C "$HOME" "${files[@]}" "${extra_files[@]}" | age -R "$recipients" > "$out.part"
keep "$out"

# Le code est sur GitHub : on ne garde ici que ce qui n'y est pas (fichiers modifiés ou nouveaux non commités, commits non poussés).
pending="$(mktemp -d)"
for repo in "$HOME"/repos/*/ "$HOME"/Cadence/; do
  name="$(basename "$repo")"
  files="$(git -C "$repo" status --porcelain --untracked-files=all | sed -E 's/^.. //; s/.* -> //' || true)"
  [ -n "$files" ] && printf '%s\n' "$files" | tar -C "$repo" -czf "$pending/$name-uncommitted.tar.gz" -T - 2>/dev/null
  [ -n "$(git -C "$repo" log '@{u}..HEAD' --oneline 2>/dev/null)" ] && git -C "$repo" format-patch --stdout '@{u}..HEAD' > "$pending/$name-unpushed.patch"
done
if [ -n "$(ls -A "$pending")" ]; then
  out="$dest/$stamp-unpushed-work.tar.gz.age"
  tar -C "$pending" -czf - . | age -R "$recipients" > "$out.part"
  keep "$out"
fi

# Reverse proxy : Caddyfile, compose et certificats TLS (sinon tout est à refaire).
out="$dest/$stamp-proxy.tar.gz.age"
{ tar -C /opt/clubika -czf - --exclude=backups deploy 2>/dev/null; } | age -R "$recipients" > "$out.part"
keep "$out"
# Discover every named volume mounted by a container. New application uploads are
# automatically covered; relational database files are represented by SQL dumps.
python3 - "$extra" <<'PYV'
import json, subprocess, sys, pathlib
ids=subprocess.check_output(['docker','ps','-aq'],text=True).split()
containers=json.loads(subprocess.check_output(['docker','inspect',*ids])) if ids else []
volumes=sorted({m['Name'] for c in containers for m in c['Mounts'] if m['Type']=='volume' and m['Destination'] not in ('/var/lib/mysql','/var/lib/postgresql/data')})
pathlib.Path(sys.argv[1],'volumes.txt').write_text(''.join(v+'\n' for v in volumes))
manifest=[{'container':c['Name'].lstrip('/'),'mounts':[{'type':m['Type'],'source':m.get('Name',m['Source']),'destination':m['Destination']} for m in c['Mounts']]} for c in containers]
pathlib.Path(sys.argv[1],'coverage.json').write_text(json.dumps(manifest,indent=2))
PYV
while IFS= read -r volume; do
  out="$dest/$stamp-volume-$volume.tar.gz.age"
  docker run --rm -v "$volume:/data:ro" alpine:3.22 tar -C /data -cf - . | gzip -6 | age -R "$recipients" > "$out.part"
  keep "$out"
done < "$extra/volumes.txt"
cp "$extra/coverage.json" "$dest/coverage.json"
# The success marker belongs to a complete set only.
(cd "$dest" && sha256sum -- *.age > SHA256SUMS)
(cd "$dest" && sha256sum -c SHA256SUMS >/dev/null)

find "$root" -name '*.age' -mtime +"$keep_days" -delete
find "$root" -mindepth 1 -type d -empty -delete
date -u +%s > "$root/LAST_OK"
echo "sauvegarde $stamp terminée"
