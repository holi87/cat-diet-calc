#!/bin/bash
# CatCal — backup bazy danych PostgreSQL
# Instalacja crona: patrz scripts/crontab.example i docs/DEPLOYMENT.md

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/catcal}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="catcal_${DATE}.sql.gz"

# Load .env if available — `set -a` exports every assignment and survives
# values containing spaces, '#' or '=' (the old `export $(grep | xargs)` didn't)
ENV_FILE="$(dirname "$0")/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

# Fail fast instead of dumping with a guessed user when cron runs without env
: "${POSTGRES_USER:?POSTGRES_USER is not set — provide .env or environment}"
: "${POSTGRES_DB:?POSTGRES_DB is not set — provide .env or environment}"

mkdir -p "$BACKUP_DIR"

echo "[$DATE] Starting backup..."

docker exec catcal-db pg_dump \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-acl \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[$DATE] Backup saved: ${BACKUP_DIR}/${FILENAME}"

# Keep only last 30 backups
ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true

echo "[$DATE] Done."
