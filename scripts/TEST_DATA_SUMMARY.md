# Test Data Summary

## Overview
Successfully seeded test data for **School ID: 691469d095e2f04c3e08cfe6**

## Data Created

### 📚 Students (20)
| Name | Email |
|------|-------|
| Emma Wilson | emma.wilson@test.com |
| Liam Anderson | liam.anderson@test.com |
| Olivia Martinez | olivia.martinez@test.com |
| Noah Garcia | noah.garcia@test.com |
| Ava Rodriguez | ava.rodriguez@test.com |
| Ethan Lopez | ethan.lopez@test.com |
| Sophia Hernandez | sophia.hernandez@test.com |
| Mason Gonzalez | mason.gonzalez@test.com |
| Isabella Perez | isabella.perez@test.com |
| James Taylor | james.taylor@test.com |
| Mia Brown | mia.brown@test.com |
| Benjamin Davis | benjamin.davis@test.com |
| Charlotte Miller | charlotte.miller@test.com |
| Lucas Moore | lucas.moore@test.com |
| Amelia Jackson | amelia.jackson@test.com |
| Henry White | henry.white@test.com |
| Harper Harris | harper.harris@test.com |
| Alexander Martin | alexander.martin@test.com |
| Evelyn Thompson | evelyn.thompson@test.com |
| Sebastian Garcia | sebastian.garcia@test.com |

### 👨‍🏫 Teachers (10)
| Name | Email |
|------|-------|
| Dr. Robert Williams | robert.williams@test.com |
| Prof. Jennifer Jones | jennifer.jones@test.com |
| Ms. Lisa Anderson | lisa.anderson@test.com |
| Mr. David Thomas | david.thomas@test.com |
| Dr. Emily Martinez | emily.martinez@test.com |
| Prof. James Robinson | james.robinson@test.com |
| Ms. Patricia Clark | patricia.clark@test.com |
| Mr. Michael Lewis | michael.lewis@test.com |
| Dr. Karen Walker | karen.walker@test.com |
| Prof. Steven Hall | steven.hall@test.com |

### 🏫 Classes (6)
| Class Name | Students | Courses | Description |
|------------|----------|---------|-------------|
| Grade 9A | 4 | 3 | Freshman class A section |
| Grade 9B | 4 | 3 | Freshman class B section |
| Grade 10A | 4 | 3 | Sophomore class A section |
| Grade 10B | 4 | 2 | Sophomore class B section |
| Grade 11A | 4 | 2 | Junior class A section |
| Grade 12A | 0 | 2 | Senior class A section |

### 📖 Courses (15)
1. **Introduction to Algebra** (Beginner) - Basic algebra concepts
2. **Geometry Fundamentals** (Beginner) - Geometric shapes and theorems
3. **Advanced Mathematics** (Advanced) - Calculus and advanced concepts
4. **Physics 101** (Beginner) - Introduction to physics
5. **Chemistry Basics** (Beginner) - Fundamental chemistry concepts
6. **Biology Essentials** (Beginner) - Introduction to life sciences
7. **World History** (Intermediate) - World historical events
8. **English Literature** (Intermediate) - Classic and modern literature
9. **Computer Science 101** (Beginner) - Introduction to programming
10. **Spanish Language** (Beginner) - Basic Spanish language skills
11. **Art and Design** (Beginner) - Creative arts principles
12. **Physical Education** (Beginner) - Sports and fitness
13. **Economics** (Intermediate) - Micro and macro economics
14. **Environmental Science** (Intermediate) - Environmental systems
15. **Psychology 101** (Intermediate) - Introduction to psychology

## Course Structure

Each course includes:
- **Module 1: Introduction** (2 lessons)
  - Overview lesson (15 min)
  - Getting Started (20 min)
  
- **Module 2: Core Concepts** (3 lessons)
  - Key Principles (30 min)
  - Practical Applications (25 min)
  - Module 2 Quiz (15 min)
  
- **Module 3: Advanced Topics** (2 lessons)
  - Deep Dive (40 min)
  - Final Assessment (45 min)

## Forum Settings

All classes have forum enabled with:
- ✅ Class Forum enabled
- ✅ Course Forum enabled
- ✅ All Courses enabled for forum
- ✅ Messaging enabled
- ✅ All Teachers enabled for messaging

## Testing Scenarios

### 1. Student Login & Forum Testing
- Login as any student (e.g., emma.wilson@test.com)
- View enrolled class and its courses
- Test forum functionality
- View class community discussions

### 2. Teacher Login & Multi-Class Testing
- Login as any teacher (e.g., robert.williams@test.com)
- Teachers are assigned to 1-2 classes
- Switch between assigned classes
- View different communities per class

### 3. Class Distribution
- Students are evenly distributed across classes (3-4 per class)
- Teachers assigned 1-2 per class
- Courses distributed across all classes

## How to Use

### Login Credentials
**Note:** Since this is test data without passwords, you may need to:
1. Use the OTP login feature
2. Or manually set passwords in the database

### Verify Data
```bash
# Connect to MongoDB
mongo ryland_lms

# Check users
db.users.find({ schoolId: ObjectId("691469d095e2f04c3e08cfe6") }).count()

# Check classes
db.classes.find({ schoolId: ObjectId("691469d095e2f04c3e08cfe6") })

# Check courses
db.courses.find({ classId: { $exists: true } }).count()

# Check enrollments
db.classEnrollments.count()

# Check teacher assignments
db.classTeachers.count()
```

### Clear Test Data (if needed)
```javascript
// Run in MongoDB shell
use ryland_lms

// Delete all test users
db.users.deleteMany({ 
  email: { $regex: /@test\.com$/ },
  schoolId: ObjectId("691469d095e2f04c3e08cfe6")
})

// You can also run: node scripts/clear-test-data.js
```

## Re-run Seeding

To add more data or re-run the script:

```bash
cd /Users/manthan/Desktop/Files/Projects/Ryland-LMS/ryland-lms-api
node scripts/seed-test-data.js
```

## Database Schema

### Users Collection
```javascript
{
  firstName: String,
  lastName: String,
  email: String,
  role: "Student" | "Teacher" | "Admin",
  status: "Active" | "Inactive" | "Pending",
  schoolId: ObjectId
}
```

### Classes Collection
```javascript
{
  name: String,
  status: "Active" | "Inactive",
  schoolId: ObjectId,
  totalStudents: Number,
  totalCourses: Number,
  forumSettings: {
    enableClassForum: Boolean,
    enableCourseForum: Boolean,
    enableAllCourses: Boolean
  }
}
```

### Courses Collection
```javascript
{
  title: String,
  courseDescription: String,
  difficultyLevel: "Beginner" | "Intermediate" | "Advanced",
  learnings: [String],
  status: "draft" | "review" | "approved",
  classId: ObjectId,
  outline: [Module]
}
```

### ClassEnrollments Collection
```javascript
{
  classId: ObjectId,
  studentId: ObjectId,
  enrollmentDate: Date,
  status: "Active" | "Inactive"
}
```

### ClassTeachers Collection
```javascript
{
  classId: ObjectId,
  teacherId: ObjectId,
  assignedDate: Date,
  isActive: Boolean
}
```

## Next Steps

1. ✅ Data has been seeded
2. 🌐 Start your API server: `npm run dev`
3. 🌐 Start your frontend: `npm run dev` (in ryland-lms directory)
4. 🧪 Test the forum feature with different user roles
5. 📊 Verify class statistics and enrollments
6. 💬 Test messaging features

## Support

If you encounter any issues:
1. Check MongoDB is running: `brew services list`
2. Check API logs
3. Verify school ID matches: `691469d095e2f04c3e08cfe6`
4. Re-run the seeding script if needed

---

**Last Updated:** $(date)
**Script Location:** `scripts/seed-test-data.js`

