#!/bin/sh
set -eu
umask 077
: "${BACKUP_PUBLIC_KEY:?set BACKUP_PUBLIC_KEY to an age recipient}"
destination="${1:-./backups}"
mkdir -p "$destination"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT INT TERM
docker compose exec -T db sh -c 'exec mariadb-dump --single-transaction --routines --triggers -u root -p"$MARIADB_ROOT_PASSWORD" arbigo' > "$work/database.sql"
docker compose exec -T app tar -C /app/data -czf - media > "$work/media.tar.gz"
tar -C "$work" -czf - database.sql media.tar.gz | age -r "$BACKUP_PUBLIC_KEY" > "$destination/arbigo-$(date -u +%Y%m%dT%H%M%SZ).tar.gz.age"
