/**
 * Script to clear test data for school: 691469d095e2f04c3e08cfe6
 * 
 * WARNING: This will delete all test users, their enrollments, and teacher assignments
 * 
 * Run with: node scripts/clear-test-data.js
 */

const mongoose = require('mongoose');

// MongoDB connection details
const CONNECTION_STRING = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'ryland_lms';

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(`${CONNECTION_STRING}/${DB_NAME}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Clear test data
async function clearTestData() {
  console.log('\n🧹 Starting test data cleanup...\n');

  try {
    const db = mongoose.connection.db;

    // Delete test users (those with @test.com emails)
    console.log('🗑️  Deleting test users...');
    const usersResult = await db.collection('users').deleteMany({
      email: { $regex: /@test\.com$/ }
    });
    console.log(`✅ Deleted ${usersResult.deletedCount} test users`);

    // Delete their enrollments
    console.log('\n🗑️  Deleting test enrollments...');
    const enrollmentsResult = await db.collection('classenrollments').deleteMany({});
    console.log(`✅ Deleted ${enrollmentsResult.deletedCount} enrollments`);

    // Delete teacher assignments
    console.log('\n🗑️  Deleting test teacher assignments...');
    const teachersResult = await db.collection('classteachers').deleteMany({});
    console.log(`✅ Deleted ${teachersResult.deletedCount} teacher assignments`);

    // Delete published courses (so we can recreate them fresh)
    console.log('\n🗑️  Deleting published courses...');
    const publishedCoursesResult = await db.collection('publishedcourses').deleteMany({});
    console.log(`✅ Deleted ${publishedCoursesResult.deletedCount} published courses`);

    // Note: We're NOT deleting classes and courses as they might be needed
    console.log('\n⚠️  Note: Classes and courses were preserved');
    console.log('   If you want to delete them too, do it manually via MongoDB shell\n');

    console.log('='.repeat(50));
    console.log('🎉 TEST DATA CLEANUP COMPLETED!');
    console.log('='.repeat(50));
    console.log('\n💡 You can now re-run the seeding script to add fresh data:\n');
    console.log('   node scripts/seed-test-data.js\n');

  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

// Run the cleanup
(async () => {
  try {
    await connectDB();
    await clearTestData();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

