# Configuration Setup Guide

This guide explains how to set up the required configuration files for the Ryland LMS API.

## Required Configuration Files

The following files contain sensitive credentials and are **not tracked in Git**. You need to create them locally:

### 1. `.env.development` (Environment Variables)
Create this file in the root directory with your AWS credentials:

```env
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
```

### 2. `config/default.json` (Main Configuration)
Copy `config/default.example.json` and update with your actual credentials:
- MongoDB connection string
- Redis URL
- SMTP/Mailgun credentials
- OpenAI API key
- JWT secret

### 3. `config/staging.json` (Staging Configuration)
Copy `config/staging.example.json` and update with:
- Staging MongoDB connection
- Twilio credentials (Account SID & Auth Token)
- AWS S3 bucket details

### 4. `testEmail.js` (Email Testing - Optional)
Copy `testEmail.example.js` if you need to test email functionality.
Update with your SendGrid API key.

## Quick Setup

```bash
# Copy example files
cp config/default.example.json config/default.json
cp config/staging.example.json config/staging.json
cp testEmail.example.js testEmail.js

# Create .env.development
cat > .env.development << EOF
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
EOF

# Edit the files with your actual credentials
# DO NOT commit these files to Git!
```

## Security Notes

⚠️ **IMPORTANT**: Never commit files containing real credentials to Git!

- All credential files are listed in `.gitignore`
- Use example files as templates
- Store actual credentials securely (use environment variables in production)
- Rotate credentials if accidentally exposed

## Required Services

Make sure you have accounts and API keys for:
- **MongoDB** - Database
- **Redis** - Caching/Queue
- **AWS S3** - File storage
- **SendGrid** or **Mailgun** - Email service
- **Twilio** - SMS service (optional)
- **OpenAI** - AI features (optional)

