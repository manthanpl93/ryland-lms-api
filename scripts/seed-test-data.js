/**
 * Script to populate test data for school: 691469d095e2f04c3e08cfe6
 * 
 * Creates:
 * - 20 Students
 * - 10 Teachers  
 * - 6 Classes
 * - 15 Courses
 * - All necessary enrollments and assignments
 * - Forum communities (class and course forums)
 * - Forum tags
 * - Forum posts with comments
 * 
 * Run with: node scripts/seed-test-data.js
 */

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// MongoDB connection details
const CONNECTION_STRING = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'ryland_lms';
const SCHOOL_ID = '691469d095e2f04c3e08cfe6';

// Test data
const STUDENTS = [
  { firstName: 'Emma', lastName: 'Wilson', email: 'emma.wilson@test.com', mobileNo: '9876543210', address: '123 Oak Street, Mumbai, Maharashtra 400001' },
  { firstName: 'Liam', lastName: 'Anderson', email: 'liam.anderson@test.com', mobileNo: '9876543211', address: '456 Maple Avenue, Delhi, NCR 110001' },
  { firstName: 'Olivia', lastName: 'Martinez', email: 'olivia.martinez@test.com', mobileNo: '9876543212', address: '789 Pine Road, Bangalore, Karnataka 560001' },
  { firstName: 'Noah', lastName: 'Garcia', email: 'noah.garcia@test.com', mobileNo: '9876543213', address: '321 Cedar Lane, Pune, Maharashtra 411001' },
  { firstName: 'Ava', lastName: 'Rodriguez', email: 'ava.rodriguez@test.com', mobileNo: '9876543214', address: '654 Birch Drive, Hyderabad, Telangana 500001' },
  { firstName: 'Ethan', lastName: 'Lopez', email: 'ethan.lopez@test.com', mobileNo: '9876543215', address: '987 Elm Street, Chennai, Tamil Nadu 600001' },
  { firstName: 'Sophia', lastName: 'Hernandez', email: 'sophia.hernandez@test.com', mobileNo: '9876543216', address: '147 Willow Way, Kolkata, West Bengal 700001' },
  { firstName: 'Mason', lastName: 'Gonzalez', email: 'mason.gonzalez@test.com', mobileNo: '9876543217', address: '258 Spruce Court, Ahmedabad, Gujarat 380001' },
  { firstName: 'Isabella', lastName: 'Perez', email: 'isabella.perez@test.com', mobileNo: '9876543218', address: '369 Ash Boulevard, Jaipur, Rajasthan 302001' },
  { firstName: 'James', lastName: 'Taylor', email: 'james.taylor@test.com', mobileNo: '9876543219', address: '741 Poplar Place, Lucknow, Uttar Pradesh 226001' },
  { firstName: 'Mia', lastName: 'Brown', email: 'mia.brown@test.com', mobileNo: '9876543220', address: '852 Walnut Street, Chandigarh, Punjab 160001' },
  { firstName: 'Benjamin', lastName: 'Davis', email: 'benjamin.davis@test.com', mobileNo: '9876543221', address: '963 Cherry Lane, Indore, Madhya Pradesh 452001' },
  { firstName: 'Charlotte', lastName: 'Miller', email: 'charlotte.miller@test.com', mobileNo: '9876543222', address: '159 Hickory Drive, Bhopal, Madhya Pradesh 462001' },
  { firstName: 'Lucas', lastName: 'Moore', email: 'lucas.moore@test.com', mobileNo: '9876543223', address: '357 Magnolia Avenue, Coimbatore, Tamil Nadu 641001' },
  { firstName: 'Amelia', lastName: 'Jackson', email: 'amelia.jackson@test.com', mobileNo: '9876543224', address: '753 Sycamore Road, Kochi, Kerala 682001' },
  { firstName: 'Henry', lastName: 'White', email: 'henry.white@test.com', mobileNo: '9876543225', address: '951 Redwood Court, Nagpur, Maharashtra 440001' },
  { firstName: 'Harper', lastName: 'Harris', email: 'harper.harris@test.com', mobileNo: '9876543226', address: '486 Dogwood Way, Visakhapatnam, Andhra Pradesh 530001' },
  { firstName: 'Alexander', lastName: 'Martin', email: 'alexander.martin@test.com', mobileNo: '9876543227', address: '627 Beech Boulevard, Patna, Bihar 800001' },
  { firstName: 'Evelyn', lastName: 'Thompson', email: 'evelyn.thompson@test.com', mobileNo: '9876543228', address: '814 Fir Place, Ludhiana, Punjab 141001' },
  { firstName: 'Sebastian', lastName: 'Garcia', email: 'sebastian.garcia@test.com', mobileNo: '9876543229', address: '925 Palm Street, Agra, Uttar Pradesh 282001' }
];

const TEACHERS = [
  { firstName: 'Dr. Robert', lastName: 'Williams', email: 'robert.williams@test.com', mobileNo: '9123456780', address: '10 University Road, Mumbai, Maharashtra 400020' },
  { firstName: 'Prof. Jennifer', lastName: 'Jones', email: 'jennifer.jones@test.com', mobileNo: '9123456781', address: '22 Academic Lane, Delhi, NCR 110021' },
  { firstName: 'Ms. Lisa', lastName: 'Anderson', email: 'lisa.anderson@test.com', mobileNo: '9123456782', address: '35 Faculty Street, Bangalore, Karnataka 560025' },
  { firstName: 'Mr. David', lastName: 'Thomas', email: 'david.thomas@test.com', mobileNo: '9123456783', address: '48 College Avenue, Pune, Maharashtra 411016' },
  { firstName: 'Dr. Emily', lastName: 'Martinez', email: 'emily.martinez@test.com', mobileNo: '9123456784', address: '61 Campus Drive, Hyderabad, Telangana 500034' },
  { firstName: 'Prof. James', lastName: 'Robinson', email: 'james.robinson@test.com', mobileNo: '9123456785', address: '74 Education Boulevard, Chennai, Tamil Nadu 600028' },
  { firstName: 'Ms. Patricia', lastName: 'Clark', email: 'patricia.clark@test.com', mobileNo: '9123456786', address: '87 Teaching Way, Kolkata, West Bengal 700019' },
  { firstName: 'Mr. Michael', lastName: 'Lewis', email: 'michael.lewis@test.com', mobileNo: '9123456787', address: '93 Learning Court, Ahmedabad, Gujarat 380015' },
  { firstName: 'Dr. Karen', lastName: 'Walker', email: 'karen.walker@test.com', mobileNo: '9123456788', address: '106 Scholar Place, Jaipur, Rajasthan 302012' },
  { firstName: 'Prof. Steven', lastName: 'Hall', email: 'steven.hall@test.com', mobileNo: '9123456789', address: '119 Instructor Lane, Lucknow, Uttar Pradesh 226010' }
];

const CLASSES = [
  { name: 'Grade 9A', description: 'Freshman class A section' },
  { name: 'Grade 9B', description: 'Freshman class B section' },
  { name: 'Grade 10A', description: 'Sophomore class A section' },
  { name: 'Grade 10B', description: 'Sophomore class B section' },
  { name: 'Grade 11A', description: 'Junior class A section' },
  { name: 'Grade 12A', description: 'Senior class A section' }
];

const COURSES = [
  { title: 'Introduction to Algebra', difficultyLevel: 'Beginner', description: 'Basic algebra concepts and operations' },
  { title: 'Geometry Fundamentals', difficultyLevel: 'Beginner', description: 'Introduction to geometric shapes and theorems' },
  { title: 'Advanced Mathematics', difficultyLevel: 'Advanced', description: 'Calculus and advanced mathematical concepts' },
  { title: 'Physics 101', difficultyLevel: 'Beginner', description: 'Introduction to physics and mechanics' },
  { title: 'Chemistry Basics', difficultyLevel: 'Beginner', description: 'Fundamental chemistry concepts' },
  { title: 'Biology Essentials', difficultyLevel: 'Beginner', description: 'Introduction to life sciences' },
  { title: 'World History', difficultyLevel: 'Intermediate', description: 'Survey of world historical events' },
  { title: 'English Literature', difficultyLevel: 'Intermediate', description: 'Classic and modern literature' },
  { title: 'Computer Science 101', difficultyLevel: 'Beginner', description: 'Introduction to programming' },
  { title: 'Spanish Language', difficultyLevel: 'Beginner', description: 'Basic Spanish language skills' },
  { title: 'Art and Design', difficultyLevel: 'Beginner', description: 'Creative arts and design principles' },
  { title: 'Physical Education', difficultyLevel: 'Beginner', description: 'Sports and fitness training' },
  { title: 'Economics', difficultyLevel: 'Intermediate', description: 'Micro and macro economics' },
  { title: 'Environmental Science', difficultyLevel: 'Intermediate', description: 'Study of environmental systems' },
  { title: 'Psychology 101', difficultyLevel: 'Intermediate', description: 'Introduction to psychology' }
];

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

// Define schemas
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  mobileNo: String,
  address: String,
  role: String,
  status: String,
  schoolId: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});

const classSchema = new mongoose.Schema({
  name: String,
  status: String,
  schoolId: mongoose.Schema.Types.ObjectId,
  totalStudents: Number,
  totalCourses: Number,
  forumSettings: {
    enableClassForum: Boolean,
    enableCourseForum: Boolean,
    enableAllCourses: Boolean,
    selectedCourses: [mongoose.Schema.Types.ObjectId]
  },
  messagingSettings: {
    enableMessaging: Boolean,
    enableAllTeachers: Boolean,
    selectedTeachers: [mongoose.Schema.Types.ObjectId]
  },
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const courseSchema = new mongoose.Schema({
  title: String,
  courseDescription: String,
  difficultyLevel: String,
  learnings: [String],
  status: String,
  deleted: Boolean,
  classId: mongoose.Schema.Types.ObjectId,
  outline: Array,
  createdAt: Date,
  updatedAt: Date
}, { strict: false });

const publishedCourseSchema = new mongoose.Schema({
  mainCourse: mongoose.Schema.Types.ObjectId,
  title: String,
  courseDescription: String,
  difficultyLevel: String,
  learnings: [String],
  courseImage: Object,
  outline: Array,
  status: String,
  deleted: Boolean,
  classId: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
}, { strict: false });

const classEnrollmentSchema = new mongoose.Schema({
  classId: mongoose.Schema.Types.ObjectId,
  studentId: mongoose.Schema.Types.ObjectId,
  enrollmentDate: Date,
  status: String,
  createdAt: Date,
  updatedAt: Date
});

const classTeacherSchema = new mongoose.Schema({
  classId: mongoose.Schema.Types.ObjectId,
  teacherId: mongoose.Schema.Types.ObjectId,
  assignedDate: Date,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const communitySchema = new mongoose.Schema({
  name: String,
  type: String, // 'class' or 'course'
  classId: mongoose.Schema.Types.ObjectId,
  courseId: mongoose.Schema.Types.ObjectId,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const forumTagSchema = new mongoose.Schema({
  name: String,
  communityId: mongoose.Schema.Types.ObjectId,
  color: String,
  usageCount: Number,
  createdBy: mongoose.Schema.Types.ObjectId,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
});

const forumPostSchema = new mongoose.Schema({
  title: String,
  content: String,
  authorId: mongoose.Schema.Types.ObjectId,
  communityId: mongoose.Schema.Types.ObjectId,
  classId: mongoose.Schema.Types.ObjectId,
  tags: [mongoose.Schema.Types.ObjectId],
  upvotes: Number,
  downvotes: Number,
  voteScore: Number,
  commentCount: Number,
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});

const forumCommentSchema = new mongoose.Schema({
  postId: mongoose.Schema.Types.ObjectId,
  parentCommentId: mongoose.Schema.Types.ObjectId,
  content: String,
  authorId: mongoose.Schema.Types.ObjectId,
  upvotes: Number,
  downvotes: Number,
  voteScore: Number,
  replyCount: Number,
  isDeleted: Boolean,
  deletedAt: Date,
  deletedBy: mongoose.Schema.Types.ObjectId,
  createdAt: Date,
  updatedAt: Date
});

// Create models
const User = mongoose.model('users', userSchema);
const Class = mongoose.model('classes', classSchema);
const Course = mongoose.model('courses', courseSchema);
const PublishedCourse = mongoose.model('publishedCourses', publishedCourseSchema);
const ClassEnrollment = mongoose.model('classEnrollments', classEnrollmentSchema);
const ClassTeacher = mongoose.model('classTeachers', classTeacherSchema);
const Community = mongoose.model('communities', communitySchema);
const ForumTag = mongoose.model('forumTags', forumTagSchema);
const ForumPost = mongoose.model('forumPosts', forumPostSchema);
const ForumComment = mongoose.model('forumPostComments', forumCommentSchema);

// Helper function to clean up existing test data
async function cleanupData() {
  console.log('\n🧹 Cleaning up existing test data...\n');

  try {
    const schoolObjId = new ObjectId(SCHOOL_ID);

    // Delete students
    const studentsResult = await User.deleteMany({
      schoolId: schoolObjId,
      role: 'Student',
      email: { $regex: /@test\.com$/ }
    });
    console.log(`🗑️  Deleted ${studentsResult.deletedCount} test students`);

    // Delete teachers
    const teachersResult = await User.deleteMany({
      schoolId: schoolObjId,
      role: 'Teacher',
      email: { $regex: /@test\.com$/ }
    });
    console.log(`🗑️  Deleted ${teachersResult.deletedCount} test teachers`);

    // Get all test classes to cleanup related data
    const testClasses = await Class.find({
      schoolId: schoolObjId,
      name: { $regex: /^Grade (9|10|11|12)[AB]$/ }
    });
    const classIds = testClasses.map(c => c._id);

    if (classIds.length > 0) {
      // Delete forum comments first (references posts)
      const commentsResult = await ForumComment.deleteMany({
        postId: { $exists: true }
      });
      console.log(`🗑️  Deleted ${commentsResult.deletedCount} forum comments`);

      // Delete forum posts
      const postsResult = await ForumPost.deleteMany({
        classId: { $in: classIds }
      });
      console.log(`🗑️  Deleted ${postsResult.deletedCount} forum posts`);

      // Delete forum tags
      const tagsResult = await ForumTag.deleteMany({
        communityId: { $exists: true }
      });
      console.log(`🗑️  Deleted ${tagsResult.deletedCount} forum tags`);

      // Delete communities
      const communitiesResult = await Community.deleteMany({
        classId: { $in: classIds }
      });
      console.log(`🗑️  Deleted ${communitiesResult.deletedCount} communities`);

      // Delete class enrollments
      const enrollmentsResult = await ClassEnrollment.deleteMany({
        classId: { $in: classIds }
      });
      console.log(`🗑️  Deleted ${enrollmentsResult.deletedCount} class enrollments`);

      // Delete teacher assignments
      const assignmentsResult = await ClassTeacher.deleteMany({
        classId: { $in: classIds }
      });
      console.log(`🗑️  Deleted ${assignmentsResult.deletedCount} teacher assignments`);

      // Delete published courses
      const publishedResult = await PublishedCourse.deleteMany({
        classId: { $in: classIds }
      });
      console.log(`🗑️  Deleted ${publishedResult.deletedCount} published courses`);

      // Delete courses
      const coursesResult = await Course.deleteMany({
        classId: { $in: classIds }
      });
      console.log(`🗑️  Deleted ${coursesResult.deletedCount} courses`);

      // Delete classes
      const classesResult = await Class.deleteMany({
        _id: { $in: classIds }
      });
      console.log(`🗑️  Deleted ${classesResult.deletedCount} classes`);
    }

    console.log('\n✅ Cleanup completed!\n');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Helper function to create a course outline with modules
function createCourseOutline(courseTitle) {
  return [
    {
      title: 'Module 1: Introduction',
      lessons: [
        {
          title: 'Overview of ' + courseTitle,
          contentType: 'text',
          type: 'content',
          content: 'Welcome to this course! We will explore all the fundamental concepts.',
          category: 'lesson',
          metadata: {
            description: 'Course introduction',
            duration: 15,
            isPreviewable: true,
            requiredLesson: true
          }
        },
        {
          title: 'Getting Started',
          contentType: 'text',
          type: 'content',
          content: 'Let\'s begin with the basics and build a strong foundation.',
          category: 'lesson',
          metadata: {
            description: 'Getting started guide',
            duration: 20,
            isPreviewable: true,
            requiredLesson: false
          }
        }
      ]
    },
    {
      title: 'Module 2: Core Concepts',
      lessons: [
        {
          title: 'Key Principles',
          contentType: 'text',
          type: 'content',
          content: 'Understanding the key principles that govern this subject.',
          category: 'lesson',
          metadata: {
            description: 'Core principles',
            duration: 30,
            isPreviewable: false,
            requiredLesson: true
          }
        },
        {
          title: 'Practical Applications',
          contentType: 'text',
          type: 'content',
          content: 'How to apply these concepts in real-world scenarios.',
          category: 'lesson',
          metadata: {
            description: 'Real-world applications',
            duration: 25,
            isPreviewable: false,
            requiredLesson: true
          }
        },
        {
          title: 'Module 2 Quiz',
          contentType: 'media',
          type: 'quiz',
          quizData: {
            title: 'Test Your Knowledge',
            description: 'Quiz on Module 2 concepts',
            questions: [
              {
                id: '1',
                type: 'multiple-choice',
                question: 'What is the main principle covered in this module?',
                options: ['Option A', 'Option B', 'Option C', 'Option D'],
                correctAnswers: ['Option A'],
                feedback: 'Great job! You understood the key concept.'
              }
            ],
            settings: {
              randomizeQuestions: false,
              allowRetakes: true,
              passingPercentage: 70
            }
          },
          category: 'lesson',
          metadata: {
            description: 'Module assessment',
            duration: 15,
            isPreviewable: false,
            requiredLesson: true
          }
        }
      ]
    },
    {
      title: 'Module 3: Advanced Topics',
      lessons: [
        {
          title: 'Deep Dive',
          contentType: 'text',
          type: 'content',
          content: 'Exploring advanced topics and complex scenarios.',
          category: 'lesson',
          metadata: {
            description: 'Advanced concepts',
            duration: 40,
            isPreviewable: false,
            requiredLesson: true
          }
        },
        {
          title: 'Final Assessment',
          contentType: 'media',
          type: 'quiz',
          quizData: {
            title: 'Final Exam',
            description: 'Comprehensive assessment of all modules',
            questions: [
              {
                id: '1',
                type: 'multiple-choice',
                question: 'Which concept is most important?',
                options: ['Concept A', 'Concept B', 'Concept C', 'All of the above'],
                correctAnswers: ['All of the above'],
                feedback: 'Excellent! You have mastered the material.'
              }
            ],
            settings: {
              randomizeQuestions: true,
              allowRetakes: false,
              passingPercentage: 80
            }
          },
          category: 'lesson',
          metadata: {
            description: 'Final exam',
            duration: 45,
            isPreviewable: false,
            requiredLesson: true
          }
        }
      ]
    }
  ];
}

// Main seeding function
async function seedData() {
  console.log('\n🌱 Starting data seeding...\n');

  try {
    // Create Students
    console.log('📚 Creating students...');
    const studentDocs = STUDENTS.map(student => ({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      mobileNo: student.mobileNo,
      address: student.address,
      role: 'Student',
      status: 'Active',
      schoolId: new ObjectId(SCHOOL_ID),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    const students = await User.insertMany(studentDocs);
    console.log(`✅ Created ${students.length} students`);

    // Create Teachers
    console.log('\n👨‍🏫 Creating teachers...');
    const teacherDocs = TEACHERS.map(teacher => ({
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      mobileNo: teacher.mobileNo,
      address: teacher.address,
      role: 'Teacher',
      status: 'Active',
      schoolId: new ObjectId(SCHOOL_ID),
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    const teachers = await User.insertMany(teacherDocs);
    console.log(`✅ Created ${teachers.length} teachers`);

    // Create Classes
    console.log('\n🏫 Creating classes...');
    const classDocs = CLASSES.map(cls => ({
      name: cls.name,
      status: 'Active',
      schoolId: new ObjectId(SCHOOL_ID),
      totalStudents: 0,
      totalCourses: 0,
      forumSettings: {
        enableClassForum: true,
        enableCourseForum: true,
        enableAllCourses: true,
        selectedCourses: []
      },
      messagingSettings: {
        enableMessaging: true,
        enableAllTeachers: true,
        selectedTeachers: []
      },
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    const classes = await Class.insertMany(classDocs);
    console.log(`✅ Created ${classes.length} classes`);

    // Create Courses and assign to classes
    console.log('\n📖 Creating courses...');
    const courseDocs = COURSES.map((course, index) => {
      // Distribute courses across classes
      const classIndex = index % classes.length;
      return {
        title: course.title,
        courseDescription: course.description,
        difficultyLevel: course.difficultyLevel,
        learnings: [
          'Understand core concepts',
          'Apply knowledge in practice',
          'Master advanced techniques'
        ],
        status: 'approved',
        deleted: false,
        classId: classes[classIndex]._id,
        outline: createCourseOutline(course.title),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });
    const courses = await Course.insertMany(courseDocs);
    console.log(`✅ Created ${courses.length} courses`);

    // Publish courses (so students can see them)
    console.log('\n📚 Publishing courses...');
    const publishedCourseDocs = courses.map(course => ({
      mainCourse: course._id,
      title: course.title,
      courseDescription: course.courseDescription,
      difficultyLevel: course.difficultyLevel,
      learnings: course.learnings,
      courseImage: {
        status: 'finished',
        objectUrl: 'https://via.placeholder.com/400x300?text=' + encodeURIComponent(course.title),
        fileName: 'course-thumbnail.jpg',
        fileType: 'image/jpeg'
      },
      outline: course.outline,
      status: 'approved',
      deleted: false,
      classId: course.classId,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    const publishedCourses = await PublishedCourse.insertMany(publishedCourseDocs);
    console.log(`✅ Published ${publishedCourses.length} courses`);

    // Create Student Enrollments (3-4 students per class)
    console.log('\n🎓 Creating student enrollments...');
    const enrollments = [];
    const studentsPerClass = Math.ceil(students.length / classes.length);
    
    classes.forEach((cls, classIndex) => {
      const startIdx = classIndex * studentsPerClass;
      const endIdx = Math.min(startIdx + studentsPerClass, students.length);
      const classStudents = students.slice(startIdx, endIdx);

      classStudents.forEach(student => {
        enrollments.push({
          classId: cls._id,
          studentId: student._id,
          enrollmentDate: new Date(),
          status: 'Active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
    });
    
    await ClassEnrollment.insertMany(enrollments);
    console.log(`✅ Created ${enrollments.length} student enrollments`);

    // Create Teacher Assignments (1-2 teachers per class)
    console.log('\n👩‍🏫 Assigning teachers to classes...');
    const teacherAssignments = [];
    const teachersPerClass = Math.ceil(teachers.length / classes.length);
    
    classes.forEach((cls, classIndex) => {
      const startIdx = classIndex * teachersPerClass;
      const endIdx = Math.min(startIdx + teachersPerClass, teachers.length);
      const classTeachers = teachers.slice(startIdx, endIdx);

      classTeachers.forEach(teacher => {
        teacherAssignments.push({
          classId: cls._id,
          teacherId: teacher._id,
          assignedDate: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      });
    });
    
    await ClassTeacher.insertMany(teacherAssignments);
    console.log(`✅ Created ${teacherAssignments.length} teacher assignments`);

    // Update class counters
    console.log('\n📊 Updating class statistics...');
    for (const cls of classes) {
      const studentCount = enrollments.filter(e => e.classId.equals(cls._id)).length;
      const courseCount = courses.filter(c => c.classId.equals(cls._id)).length;
      
      await Class.updateOne(
        { _id: cls._id },
        { 
          $set: { 
            totalStudents: studentCount,
            totalCourses: courseCount
          }
        }
      );
    }
    console.log('✅ Updated class statistics');

    // Create Forum Communities
    console.log('\n💬 Creating forum communities...');
    const communities = [];

    // Create class communities
    for (const cls of classes) {
      communities.push({
        name: `${cls.name} Community`,
        type: 'class',
        classId: cls._id,
        courseId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // Create course communities (for courses where forum is enabled)
    for (const course of courses) {
      communities.push({
        name: `${course.title} Forum`,
        type: 'course',
        classId: course.classId,
        courseId: course._id,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    const createdCommunities = await Community.insertMany(communities);
    console.log(`✅ Created ${createdCommunities.length} communities (${classes.length} class + ${courses.length} course)`);

    // Update class forumSettings with community IDs
    console.log('\n🔗 Linking communities to classes...');
    const db = mongoose.connection.db;
    const classesCollection = db.collection('classes');
    
    for (const cls of classes) {
      // Find the class community for this class
      const classCommunity = createdCommunities.find(c => 
        c.type === 'class' && c.classId.equals(cls._id)
      );

      // Find all course communities for this class
      const courseCommunities = createdCommunities.filter(c => 
        c.type === 'course' && c.classId.equals(cls._id)
      );

      // Build selectedCourses array with courseId and communityId mappings
      const selectedCourses = courseCommunities.map(cc => ({
        courseId: cc.courseId,
        communityId: cc._id
      }));

      // Use raw MongoDB update to avoid Mongoose schema casting issues
      await classesCollection.updateOne(
        { _id: cls._id },
        {
          $set: {
            'forumSettings.classCommunityId': classCommunity ? classCommunity._id : null,
            'forumSettings.selectedCourses': selectedCourses
          }
        }
      );
    }
    console.log(`✅ Linked ${createdCommunities.length} communities to their classes`);

    // Create Forum Tags
    console.log('\n🏷️  Creating forum tags...');
    const tagNames = [
      { name: 'question', color: '#3B82F6' },
      { name: 'discussion', color: '#8B5CF6' },
      { name: 'help', color: '#EF4444' },
      { name: 'announcement', color: '#10B981' },
      { name: 'resource', color: '#F59E0B' },
      { name: 'feedback', color: '#EC4899' },
      { name: 'homework', color: '#6366F1' },
      { name: 'exam', color: '#DC2626' }
    ];

    const forumTags = [];
    for (const community of createdCommunities) {
      // Add 4-6 tags per community
      const numTags = Math.floor(Math.random() * 3) + 4;
      const selectedTags = tagNames.slice(0, numTags);

      for (const tag of selectedTags) {
        forumTags.push({
          name: tag.name,
          communityId: community._id,
          color: tag.color,
          usageCount: 0,
          createdBy: teachers[0]._id, // First teacher creates tags
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    const createdTags = await ForumTag.insertMany(forumTags);
    console.log(`✅ Created ${createdTags.length} forum tags`);

    // Create Forum Posts
    console.log('\n📝 Creating forum posts...');
    const forumPosts = [];
    const postTemplates = [
      {
        title: 'Welcome to our community!',
        content: 'Hello everyone! Welcome to our learning community. Feel free to ask questions, share resources, and help each other learn. Let\'s make this a great experience for everyone!'
      },
      {
        title: 'Question about homework assignment',
        content: 'Hi, I\'m having trouble understanding the homework assignment from last week. Can someone explain the key concepts? Specifically, I\'m confused about the practical applications.'
      },
      {
        title: 'Study group formation',
        content: 'Looking to form a study group for the upcoming exam. Who wants to join? We can meet after classes to review the material together and quiz each other.'
      },
      {
        title: 'Great resource I found',
        content: 'I came across this amazing resource that really helped me understand the concepts better. Thought I\'d share it with everyone here. It has great examples and explanations!'
      },
      {
        title: 'Exam preparation tips',
        content: 'Does anyone have tips for preparing for the upcoming exam? What topics should we focus on? Any study strategies that worked well for you?'
      },
      {
        title: 'Project collaboration',
        content: 'I\'m working on the group project and would love to collaborate. Anyone interested in brainstorming ideas and dividing the work?'
      },
      {
        title: 'Clarification needed on lecture topic',
        content: 'Can someone help clarify what was discussed in today\'s lecture? I didn\'t quite understand the main principle that was explained.'
      },
      {
        title: 'Assignment deadline extension?',
        content: 'Is there any chance we could get an extension on the assignment? Many of us are finding it challenging to complete on time.'
      }
    ];

    // Create 2-4 posts per community
    for (const community of createdCommunities) {
      const numPosts = Math.floor(Math.random() * 3) + 2;
      const communityTags = createdTags.filter(t => t.communityId.equals(community._id));
      
      // Get eligible authors (students + teachers from this class)
      const classStudents = students.filter(s => 
        enrollments.some(e => e.classId.equals(community.classId) && e.studentId.equals(s._id))
      );
      const classTeachers = teachers.filter(t =>
        teacherAssignments.some(ta => ta.classId.equals(community.classId) && ta.teacherId.equals(t._id))
      );
      const eligibleAuthors = [...classStudents, ...classTeachers];

      // Skip this community if no eligible authors
      if (eligibleAuthors.length === 0) {
        console.log(`⚠️  Skipping community ${community.name} - no eligible authors`);
        continue;
      }

      for (let i = 0; i < numPosts; i++) {
        const template = postTemplates[Math.floor(Math.random() * postTemplates.length)];
        const author = eligibleAuthors[Math.floor(Math.random() * eligibleAuthors.length)];
        
        // Select 1-3 random tags
        const numTagsForPost = Math.floor(Math.random() * 3) + 1;
        const selectedPostTags = [];
        for (let j = 0; j < Math.min(numTagsForPost, communityTags.length); j++) {
          const tag = communityTags[Math.floor(Math.random() * communityTags.length)];
          if (!selectedPostTags.some(t => t.equals(tag._id))) {
            selectedPostTags.push(tag._id);
          }
        }

        // Random vote scores
        const upvotes = Math.floor(Math.random() * 15);
        const downvotes = Math.floor(Math.random() * 3);

        forumPosts.push({
          title: template.title,
          content: template.content,
          authorId: author._id,
          communityId: community._id,
          classId: community.classId,
          tags: selectedPostTags,
          upvotes: upvotes,
          downvotes: downvotes,
          voteScore: upvotes - downvotes,
          commentCount: 0,
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
          updatedAt: new Date()
        });
      }
    }

    const createdPosts = await ForumPost.insertMany(forumPosts);
    console.log(`✅ Created ${createdPosts.length} forum posts`);

    // Update tag usage counts
    for (const tag of createdTags) {
      const usageCount = createdPosts.filter(p => 
        p.tags.some(t => t.equals(tag._id))
      ).length;
      await ForumTag.updateOne(
        { _id: tag._id },
        { $set: { usageCount } }
      );
    }

    // Create Forum Comments
    console.log('\n💬 Creating forum comments...');
    const forumComments = [];
    const commentTemplates = [
      'Great question! I had the same doubt.',
      'Thanks for sharing this! Really helpful.',
      'I think the key concept here is understanding the fundamentals first.',
      'Can you elaborate more on this point?',
      'This is exactly what I needed. Thank you!',
      'I disagree with this approach. I think we should consider alternatives.',
      'Has anyone tried implementing this? What were your results?',
      'The teacher explained this well in class. Check your notes from Tuesday.',
      'I found a similar resource that might help. Let me know if you want the link.',
      'Count me in! When should we meet?'
    ];

    // Add 0-5 comments per post
    for (const post of createdPosts) {
      const numComments = Math.floor(Math.random() * 6);
      const community = createdCommunities.find(c => c._id.equals(post.communityId));
      
      if (!community) continue; // Skip if community not found
      
      // Get eligible commenters
      const classStudents = students.filter(s => 
        enrollments.some(e => e.classId.equals(community.classId) && e.studentId.equals(s._id))
      );
      const classTeachers = teachers.filter(t =>
        teacherAssignments.some(ta => ta.classId.equals(community.classId) && ta.teacherId.equals(t._id))
      );
      const eligibleCommenters = [...classStudents, ...classTeachers];

      // Skip if no eligible commenters
      if (eligibleCommenters.length === 0) continue;

      for (let i = 0; i < numComments; i++) {
        const commenter = eligibleCommenters[Math.floor(Math.random() * eligibleCommenters.length)];
        const commentContent = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
        
        const upvotes = Math.floor(Math.random() * 10);
        const downvotes = Math.floor(Math.random() * 2);

        forumComments.push({
          postId: post._id,
          parentCommentId: null,
          content: commentContent,
          authorId: commenter._id,
          upvotes: upvotes,
          downvotes: downvotes,
          voteScore: upvotes - downvotes,
          replyCount: 0,
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          createdAt: new Date(post.createdAt.getTime() + Math.random() * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        });
      }
    }

    if (forumComments.length > 0) {
      const createdComments = await ForumComment.insertMany(forumComments);
      console.log(`✅ Created ${createdComments.length} forum comments`);

      // Update post comment counts
      for (const post of createdPosts) {
        const commentCount = createdComments.filter(c => c.postId.equals(post._id)).length;
        await ForumPost.updateOne(
          { _id: post._id },
          { $set: { commentCount } }
        );
      }
    } else {
      console.log(`✅ No comments created`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 DATA SEEDING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`\n📊 Summary:`);
    console.log(`   • School ID: ${SCHOOL_ID}`);
    console.log(`   • Students: ${students.length}`);
    console.log(`   • Teachers: ${teachers.length}`);
    console.log(`   • Classes: ${classes.length}`);
    console.log(`   • Courses: ${courses.length}`);
    console.log(`   • Published Courses: ${publishedCourses.length}`);
    console.log(`   • Student Enrollments: ${enrollments.length}`);
    console.log(`   • Teacher Assignments: ${teacherAssignments.length}`);
    console.log(`   • Communities: ${createdCommunities.length} (${classes.length} class + ${courses.length} course)`);
    console.log(`   • Forum Tags: ${createdTags.length}`);
    console.log(`   • Forum Posts: ${createdPosts.length}`);
    console.log(`   • Forum Comments: ${forumComments.length}`);
    
    console.log('\n📝 Sample Data:');
    console.log('\nClasses:');
    classes.forEach(cls => {
      const studentCount = enrollments.filter(e => e.classId.equals(cls._id)).length;
      const courseCount = courses.filter(c => c.classId.equals(cls._id)).length;
      const classCommunities = createdCommunities.filter(com => com.classId.equals(cls._id));
      const classPostsCount = createdPosts.filter(p => p.classId.equals(cls._id)).length;
      console.log(`   • ${cls.name} - ${studentCount} students, ${courseCount} courses, ${classCommunities.length} communities, ${classPostsCount} posts`);
    });

    console.log('\n💬 Forum Statistics:');
    const classCommunities = createdCommunities.filter(c => c.type === 'class');
    const courseCommunities = createdCommunities.filter(c => c.type === 'course');
    console.log(`   • Class Communities: ${classCommunities.length}`);
    console.log(`   • Course Communities: ${courseCommunities.length}`);
    console.log(`   • Total Posts: ${createdPosts.length}`);
    console.log(`   • Total Comments: ${forumComments.length}`);
    console.log(`   • Average Posts per Community: ${(createdPosts.length / createdCommunities.length).toFixed(1)}`);

    console.log('\n✅ You can now test the forum and other features in the browser!\n');

  } catch (error) {
    console.error('❌ Error seeding data:', error);
    throw error;
  }
}

// Run the seeding
(async () => {
  try {
    await connectDB();
    await cleanupData();
    await seedData();
    console.log('✨ All operations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
})();

