#!/bin/sh
set -eu
umask 077
: "${RESTORE_AGE_IDENTITY:?set RESTORE_AGE_IDENTITY to the decryption key file}"
: "${RESTORE_CONFIRM:?set RESTORE_CONFIRM=RESTORE-ARBIGO to replace database and media}"
[ "$RESTORE_CONFIRM" = RESTORE-ARBIGO ] || exit 2
archive="${1:?provide backup archive}"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT INT TERM
age -d -i "$RESTORE_AGE_IDENTITY" "$archive" | tar -xz -C "$work"
docker compose stop app worker
docker compose exec -T db sh -c 'exec mariadb -u root -p"$MARIADB_ROOT_PASSWORD" arbigo' < "$work/database.sql"
docker compose run --rm -T --no-deps app sh -c 'tar -xzf - -C /app/data' < "$work/media.tar.gz"
docker compose start app worker
