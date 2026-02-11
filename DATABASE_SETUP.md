# Database Setup - MySQL Migration

This project has been migrated from PostgreSQL to MySQL. Follow these steps to set up your database:

## Environment Variables

Create a `.env` file in the backend root directory with the following variables:

```env
# Database Configuration
# MySQL connection string
# Format: mysql://username:password@host:port/database
DATABASE_URL="mysql://username:password@localhost:3306/sassyshringaar"

# JWT Configuration
JWT_SECRET="your-jwt-secret-key-here"
OTP_SECRET="your-otp-secret-key-here"

# Email Configuration (REQUIRED for OTP verification)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Razorpay Configuration (Optional)
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"

# Server Configuration
PORT=3000
NODE_ENV="development"
```

## Email Configuration Setup

### Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password as `SMTP_PASS`

### Other Email Providers

- **Outlook/Hotmail**: Use `smtp-mail.outlook.com` with port `587`
- **Yahoo**: Use `smtp.mail.yahoo.com` with port `587`
- **Custom SMTP**: Configure according to your provider's settings

### Environment Variables for Email

```env
SMTP_HOST="smtp.gmail.com"          # Your SMTP server
SMTP_PORT="587"                      # Port (587 for TLS, 465 for SSL)
SMTP_USER="your-email@gmail.com"    # Your email address
SMTP_PASS="your-app-password"        # App password or regular password
```

## Database Setup Steps

1. **Install MySQL** on your system
2. **Create a database** named `sassyshringaar` (or update the DATABASE_URL accordingly)
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Push schema to MySQL**:
   ```bash
   npx prisma db push
   ```
5. **Seed the database**:
   ```bash
   npx prisma db seed
   ```

## Key Changes Made

- **Provider**: Changed from `postgresql` to `mysql` in `prisma/schema.prisma`
- **Data Types**: MySQL-compatible types in Prisma schema
- **Migration**: Use `prisma db push` to create MySQL schema from Prisma models
- **Email Verification**: Implemented proper OTP email sending with nodemailer
- **Configuration Validation**: Added startup validation for all required environment variables

## MySQL Notes

- **Auto-increment**: Uses `AUTO_INCREMENT`
- **JSON fields**: Offer tags/categories are stored in JSON arrays

## Migrating Data from AWS to Local

### 1) Database migration (PostgreSQL ➜ MySQL)

1. Export your AWS PostgreSQL data (pg\_dump or SQL export).
2. Transform the dump or use a migration tool to import into MySQL.
3. Update your `.env` to point to the local MySQL `DATABASE_URL`.

### 2) Media migration (S3 ➜ local `public/`)

Run the migration script to download S3-hosted media and update URLs in MySQL:

```bash
ts-node scripts/migrate-aws-media-to-local.ts
```

## Email Verification System

The application now includes a robust email verification system:

- **Random OTP Generation**: 4-digit random OTPs (no more hardcoded 1234)
- **Email Templates**: Professional HTML email templates with branding
- **Error Handling**: Graceful handling of email sending failures
- **Configuration Validation**: Startup validation ensures all email settings are correct
- **Security**: OTPs expire after 5 minutes and are cryptographically hashed

## Troubleshooting

### Email Issues

- **"Email service temporarily unavailable"**: Check your SMTP credentials
- **"Missing required environment variables"**: Ensure all SMTP\_\* variables are set
- **Authentication failed**: Verify your email and app password are correct

### Database Issues

- **Connection refused**: Ensure MySQL is running and accessible
- **Authentication failed**: Check your DATABASE_URL credentials
- **Database doesn't exist**: Create the database before running migrations

### General Issues

- **Server won't start**: Check the console for configuration validation errors
- **OTP not working**: Ensure OTP_SECRET is set and email service is configured

If you encounter issues:

1. **Reset the database**: `npx prisma migrate reset`
2. **Regenerate Prisma client**: `npx prisma generate`
3. **Check connection**: Verify your DATABASE_URL is correct
4. **Check MySQL is running**: Ensure MySQL service is active
