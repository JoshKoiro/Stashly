To Apply Migrations:
```bash
bashCopydocker-compose exec pocketbase ./pocketbase migrate up
```
To Create a Backup:
```bash
bashCopydocker-compose exec pocketbase ./backup.sh
```
To Restore from Backup:
```bash
bashCopydocker-compose exec pocketbase ./pocketbase restore /pb/backups/backup-filename.zip
```