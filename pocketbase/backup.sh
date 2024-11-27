#!/bin/bash

# Backup script for PocketBase

# Configuration
BACKUP_DIR="/pb/backups"
MAX_BACKUPS=5
DATE_FORMAT=$(date +"%Y%m%d-%H%M%S")
BACKUP_NAME="backup-${DATE_FORMAT}.zip"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup: $BACKUP_NAME"
/pb/pocketbase backup "$BACKUP_DIR/$BACKUP_NAME"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup created successfully"
    
    # Clean old backups
    echo "Cleaning old backups..."
    cd "$BACKUP_DIR" || exit
    ls -t | tail -n +$((MAX_BACKUPS + 1)) | xargs -r rm
    
    # List remaining backups
    echo "Current backups:"
    ls -lh "$BACKUP_DIR"
else
    echo "Backup failed!"
    exit 1
fi