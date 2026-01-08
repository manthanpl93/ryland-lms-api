/**
 * Verify that students can see courses
 */

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const CONNECTION_STRING = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'ryland_lms';
const SCHOOL_ID = '691469d095e2f04c3e08cfe6';

async function verifyStudentCourses() {
  await mongoose.connect(`${CONNECTION_STRING}/${DB_NAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const db = mongoose.connection.db;

  console.log('\n🔍 Verifying Student Course Access\n');
  console.log('='.repeat(60));

  // Get a sample student
  const student = await db.collection('users').findOne({
    schoolId: new ObjectId(SCHOOL_ID),
    role: 'Student',
    email: 'emma.wilson@test.com'
  });

  if (!student) {
    console.log('❌ No student found!');
    process.exit(1);
  }

  console.log(`\n👤 Testing with student: ${student.firstName} ${student.lastName}`);
  console.log(`   Email: ${student.email}`);
  console.log(`   ID: ${student._id}`);

  // Check class enrollment
  const enrollment = await db.collection('classenrollments').findOne({
    studentId: student._id,
    status: 'Active'
  });

  if (!enrollment) {
    console.log('\n❌ Student is not enrolled in any class!');
    process.exit(1);
  }

  console.log(`\n✅ Student enrolled in class: ${enrollment.classId}`);

  // Get class details
  const studentClass = await db.collection('classes').findOne({
    _id: enrollment.classId
  });

  if (studentClass) {
    console.log(`   Class Name: ${studentClass.name}`);
    console.log(`   Total Courses: ${studentClass.totalCourses}`);
  }

  // Check published courses for this class
  const publishedCourses = await db.collection('publishedcourses').find({
    classId: enrollment.classId,
    $or: [{ deleted: false }, { deleted: { $exists: false } }]
  }).toArray();

  console.log(`\n📚 Published courses available: ${publishedCourses.length}`);
  
  if (publishedCourses.length > 0) {
    console.log('\n✅ Courses the student can see:');
    publishedCourses.forEach((course, index) => {
      console.log(`   ${index + 1}. ${course.title} (${course.difficultyLevel})`);
    });
  } else {
    console.log('\n❌ No published courses found for this class!');
  }

  // Check regular courses (for reference)
  const regularCourses = await db.collection('courses').countDocuments({
    classId: enrollment.classId
  });
  console.log(`\n📖 Regular courses (in courses collection): ${regularCourses}`);

  console.log('\n' + '='.repeat(60));
  if (publishedCourses.length > 0) {
    console.log('✅ Student should be able to see courses!\n');
  } else {
    console.log('❌ Student will NOT see any courses!\n');
    console.log('💡 Tip: Run "node scripts/seed-test-data.js" to publish courses.\n');
  }

  process.exit(0);
}

verifyStudentCourses().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
