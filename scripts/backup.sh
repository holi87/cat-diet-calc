#!/bin/bash
# CatCal — backup bazy danych PostgreSQL
# Uruchamiać przez crona: 0 3 * * * /path/to/scripts/backup.sh

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/catcal}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="catcal_${DATE}.sql.gz"

# Load .env if available
if [ -f "$(dirname "$0")/../.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env" | xargs)
fi

mkdir -p "$BACKUP_DIR"

echo "[$DATE] Starting backup..."

docker exec catcal-db pg_dump \
  -U "${POSTGRES_USER:-catcal}" \
  -d "${POSTGRES_DB:-catcal}" \
  --no-owner \
  --no-acl \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[$DATE] Backup saved: ${BACKUP_DIR}/${FILENAME}"

# Keep only last 30 backups
ls -t "${BACKUP_DIR}"/*.sql.gz 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null || true

echo "[$DATE] Done."
