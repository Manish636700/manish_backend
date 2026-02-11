# Database Migration TODO

## Tasks to Complete
- [x] Update DATABASE_URL to new Hostinger MySQL database
- [x] Execute the migration script `migrate-neon-to-mysql.ts` to migrate data from NeonDB (PostgreSQL) to new MySQL DB
- [ ] Verify migration success and data integrity (optional manual check)

## Notes
- Migration script: `scripts/migrate-neon-to-mysql.ts`
- NeonDB URL: postgresql://neondb_owner:npg_nF1GtboR8BOP@ep-cool-lab-a1scgicy-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
- New MySQL URL: mysql://u743813221_sassybackend:Sassy%40backend1234@auth-db2201.hstgr.io:3306/u743813221_sassyshringaar
- The script clears existing MySQL data before migrating
