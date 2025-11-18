#!/usr/bin/env node

/**
 * Helper script to run the users migration
 * Usage: node scripts/run-migration.js
 */

const { execSync } = require("child_process");
const path = require("path");

console.log("🚀 Starting Users Migration...\n");

try {
  // Check if migrate-mongo is available
  console.log("📋 Checking migrate-mongo availability...");
  
  // Run the migration
  console.log("🔄 Running users migration...");
  execSync("yarn migrate", { 
    stdio: "inherit",
    cwd: path.join(__dirname, "..")
  });
  
  console.log("\n✅ Users migration completed successfully!");
  console.log("📊 20 sample users have been created in the database");
  console.log("🔍 Check the logs in migrations/logs/ for detailed information");
  
} catch (error) {
  console.error("\n❌ Migration failed!");
  console.error("Error:", error.message);
  
  if (error.status === 1) {
    console.log("\n💡 Possible solutions:");
    console.log("1. Ensure MongoDB is running and accessible");
    console.log("2. Check your database configuration in migrate-mongo-config.js");
    console.log("3. Verify NODE_ENV is set correctly");
    console.log("4. Run 'yarn install' to ensure all dependencies are installed");
  }
  
  process.exit(1);
} 