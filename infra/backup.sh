#!/bin/bash
# ============================================================
# PostgreSQL Backup Script — ApEapcetEngine
# ============================================================
# Creates a compressed backup of the PostgreSQL database.
# Usage: ./backup.sh
# ============================================================

BACKUP_DIR="/backups/postgres"
DB_NAME="${DB_NAME:-eapcet_db}"
DB_USER="${DB_USER:-postgres}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

# Dump the database using pg_dump inside the Docker container
docker exec eapcet-db pg_dump \
    -U "$DB_USER" \
    --no-owner \
    --no-privileges \
    "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

if [ $? -eq 0 ]; then
    echo "Backup created: ${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
else
    echo "ERROR: Backup failed!" >&2
    exit 1
fi

# Remove backups older than retention period
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "Cleaned up backups older than ${RETENTION_DAYS} days."
