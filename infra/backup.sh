#!/bin/bash
# ═══ EAPCET MySQL Backup Script ═══
# Schedule: Add to crontab: 0 3 * * * /path/to/backup.sh

BACKUP_DIR="/backups/mysql"
DB_NAME="eapcet_db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=14

mkdir -p "$BACKUP_DIR"

# Dump using Docker container
docker exec eapcet-db mysqldump \
    -u root -p"${DB_ROOT_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Prune old backups
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] Backup complete: ${DB_NAME}_${TIMESTAMP}.sql.gz"
