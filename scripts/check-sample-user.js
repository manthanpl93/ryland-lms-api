const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

const CONNECTION_STRING = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'ryland_lms';
const SCHOOL_ID = '691469d095e2f04c3e08cfe6';

async function checkSampleUser() {
  await mongoose.connect(`${CONNECTION_STRING}/${DB_NAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const db = mongoose.connection.db;

  console.log('\n📋 Sample Student Data:\n');
  const student = await db.collection('users').findOne({
    schoolId: new ObjectId(SCHOOL_ID),
    role: 'Student',
    email: 'emma.wilson@test.com'
  });

  if (student) {
    console.log('✅ Student Found:');
    console.log(`   Name: ${student.firstName} ${student.lastName}`);
    console.log(`   Email: ${student.email}`);
    console.log(`   Mobile: ${student.mobileNo || '❌ MISSING'}`);
    console.log(`   Address: ${student.address || '❌ MISSING'}`);
    console.log(`   Role: ${student.role}`);
    console.log(`   Status: ${student.status}`);
  }

  console.log('\n📋 Sample Teacher Data:\n');
  const teacher = await db.collection('users').findOne({
    schoolId: new ObjectId(SCHOOL_ID),
    role: 'Teacher',
    email: 'robert.williams@test.com'
  });

  if (teacher) {
    console.log('✅ Teacher Found:');
    console.log(`   Name: ${teacher.firstName} ${teacher.lastName}`);
    console.log(`   Email: ${teacher.email}`);
    console.log(`   Mobile: ${teacher.mobileNo || '❌ MISSING'}`);
    console.log(`   Address: ${teacher.address || '❌ MISSING'}`);
    console.log(`   Role: ${teacher.role}`);
    console.log(`   Status: ${teacher.status}`);
  }

  console.log('\n');
  process.exit(0);
}

checkSampleUser().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
