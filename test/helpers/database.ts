import mongoose from "mongoose";

/**
 * Wait for database connection to be ready
 */
async function waitForConnection(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  // Wait for connection with timeout
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Database connection timeout"));
    }, 10000);

    mongoose.connection.once("open", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

/**
 * Clear all collections in the test database
 * SAFETY: Only works when NODE_ENV=test
 */
export async function clearTestDatabase(): Promise<void> {
  // Safety check: Only allow in test environment
  if (process.env.NODE_ENV !== "test") {
    throw new Error("❌ DANGER: Cannot clear database outside test environment!");
  }

  // Wait for database connection
  await waitForConnection();

  // Additional safety: Check database name
  const dbName = mongoose.connection.db.databaseName;
  if (!dbName.includes("test")) {
    throw new Error(`❌ DANGER: Database name '${dbName}' does not include 'test'!`);
  }

  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
  }

  // Wait a bit to ensure database has synced the deletions
  await new Promise(resolve => setTimeout(resolve, 300));
}

/**
 * Clear specific collections
 */
export async function clearCollections(collectionNames: string[]): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("❌ DANGER: Cannot clear collections outside test environment!");
  }

  for (const name of collectionNames) {
    try {
      await mongoose.connection.db.collection(name).deleteMany({});
      console.log(`✅ Cleared collection: ${name}`);
    } catch (error) {
      console.log(`⚠️  Collection ${name} not found or already empty`);
    }
  }
}

/**
 * Drop the entire test database
 */
export async function dropTestDatabase(): Promise<void> {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("❌ DANGER: Cannot drop database outside test environment!");
  }

  const dbName = mongoose.connection.db.databaseName;
  if (!dbName.includes("test")) {
    throw new Error(`❌ DANGER: Database name '${dbName}' does not include 'test'!`);
  }

  await mongoose.connection.db.dropDatabase();
  console.log(`🗑️  Dropped test database: ${dbName}`);
}

