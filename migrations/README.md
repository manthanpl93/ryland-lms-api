# Database Migrations

This directory contains database migrations for the Ryland LMS API.

## Available Migrations

### 001-create-users.js
Creates 20 sample users with realistic data for testing and development purposes.

**Users Created:**
- **Students (14 users):** John Smith, Michael Brown, David Wilson, Robert Taylor, Jennifer Martinez, Amanda Rodriguez, Michelle White, Daniel Harris, Matthew Lewis, Nicole Robinson, Andrew Walker, Kevin King, Rachel Wright
- **Authors (5 users):** Sarah Johnson, Lisa Anderson, Christopher Garcia, Jessica Clark, Stephanie Young  
- **Admins (2 users):** Emily Davis, James Lee

**User Data Includes:**
- First and last names
- Email addresses (unique)
- Mobile phone numbers
- Gender (Male/Female/Other)
- Date of birth
- Addresses
- Roles (Student/Author/Admin)
- Status (Active/Inactive/Pending)
- Timestamps

## Running Migrations

### Prerequisites
- Ensure your MongoDB connection is configured in `migrate-mongo-config.js`
- Set the appropriate `NODE_ENV` environment variable

### Commands

**Run all pending migrations:**
```bash
yarn migrate
# or
npm run migrate
```

**Rollback the last migration:**
```bash
yarn migrate:rollback
# or
npm run migrate:rollback
```

**Check migration status:**
```bash
npx migrate-mongo status
```

## Migration Structure

Each migration file exports an object with:
- `up(db)`: Function to apply the migration
- `down(db)`: Function to rollback the migration

## Logging

Migrations use the `migration-logger.js` utility for consistent logging:
- Console output for real-time monitoring
- File-based logging in `migrations/logs/` directory
- Structured logging with timestamps and metadata

## Database Indexes

The users migration automatically creates the following indexes for performance:
- `email` (unique)
- `status`
- `roles`
- `createdAt`

## Notes

- Migrations are idempotent and safe to run multiple times
- The users migration checks for existing users before inserting
- All sample data follows the schema defined in `src/models/users.model.ts`
- Rollback functionality removes only the users created by this specific migration 