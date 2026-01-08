# Test Credentials & Data

## School ID
```
691469d095e2f04c3e08cfe6
```

## Test Students (20)

| Name | Email | Mobile | Address |
|------|-------|--------|---------|
| Emma Wilson | emma.wilson@test.com | 9876543210 | 123 Oak Street, Mumbai, Maharashtra 400001 |
| Liam Anderson | liam.anderson@test.com | 9876543211 | 456 Maple Avenue, Delhi, NCR 110001 |
| Olivia Martinez | olivia.martinez@test.com | 9876543212 | 789 Pine Road, Bangalore, Karnataka 560001 |
| Noah Garcia | noah.garcia@test.com | 9876543213 | 321 Cedar Lane, Pune, Maharashtra 411001 |
| Ava Rodriguez | ava.rodriguez@test.com | 9876543214 | 654 Birch Drive, Hyderabad, Telangana 500001 |
| Ethan Lopez | ethan.lopez@test.com | 9876543215 | 987 Elm Street, Chennai, Tamil Nadu 600001 |
| Sophia Hernandez | sophia.hernandez@test.com | 9876543216 | 147 Willow Way, Kolkata, West Bengal 700001 |
| Mason Gonzalez | mason.gonzalez@test.com | 9876543217 | 258 Spruce Court, Ahmedabad, Gujarat 380001 |
| Isabella Perez | isabella.perez@test.com | 9876543218 | 369 Ash Boulevard, Jaipur, Rajasthan 302001 |
| James Taylor | james.taylor@test.com | 9876543219 | 741 Poplar Place, Lucknow, Uttar Pradesh 226001 |
| Mia Brown | mia.brown@test.com | 9876543220 | 852 Walnut Street, Chandigarh, Punjab 160001 |
| Benjamin Davis | benjamin.davis@test.com | 9876543221 | 963 Cherry Lane, Indore, Madhya Pradesh 452001 |
| Charlotte Miller | charlotte.miller@test.com | 9876543222 | 159 Hickory Drive, Bhopal, Madhya Pradesh 462001 |
| Lucas Moore | lucas.moore@test.com | 9876543223 | 357 Magnolia Avenue, Coimbatore, Tamil Nadu 641001 |
| Amelia Jackson | amelia.jackson@test.com | 9876543224 | 753 Sycamore Road, Kochi, Kerala 682001 |
| Henry White | henry.white@test.com | 9876543225 | 951 Redwood Court, Nagpur, Maharashtra 440001 |
| Harper Harris | harper.harris@test.com | 9876543226 | 486 Dogwood Way, Visakhapatnam, Andhra Pradesh 530001 |
| Alexander Martin | alexander.martin@test.com | 9876543227 | 627 Beech Boulevard, Patna, Bihar 800001 |
| Evelyn Thompson | evelyn.thompson@test.com | 9876543228 | 814 Fir Place, Ludhiana, Punjab 141001 |
| Sebastian Garcia | sebastian.garcia@test.com | 9876543229 | 925 Palm Street, Agra, Uttar Pradesh 282001 |

## Test Teachers (10)

| Name | Email | Mobile | Address |
|------|-------|--------|---------|
| Dr. Robert Williams | robert.williams@test.com | 9123456780 | 10 University Road, Mumbai, Maharashtra 400020 |
| Prof. Jennifer Jones | jennifer.jones@test.com | 9123456781 | 22 Academic Lane, Delhi, NCR 110021 |
| Ms. Lisa Anderson | lisa.anderson@test.com | 9123456782 | 35 Faculty Street, Bangalore, Karnataka 560025 |
| Mr. David Thomas | david.thomas@test.com | 9123456783 | 48 College Avenue, Pune, Maharashtra 411016 |
| Dr. Emily Martinez | emily.martinez@test.com | 9123456784 | 61 Campus Drive, Hyderabad, Telangana 500034 |
| Prof. James Robinson | james.robinson@test.com | 9123456785 | 74 Education Boulevard, Chennai, Tamil Nadu 600028 |
| Ms. Patricia Clark | patricia.clark@test.com | 9123456786 | 87 Teaching Way, Kolkata, West Bengal 700019 |
| Mr. Michael Lewis | michael.lewis@test.com | 9123456787 | 93 Learning Court, Ahmedabad, Gujarat 380015 |
| Dr. Karen Walker | karen.walker@test.com | 9123456788 | 106 Scholar Place, Jaipur, Rajasthan 302012 |
| Prof. Steven Hall | steven.hall@test.com | 9123456789 | 119 Instructor Lane, Lucknow, Uttar Pradesh 226010 |

## Classes (6)

1. **Grade 9A** - 4 students, 3 courses
2. **Grade 9B** - 4 students, 3 courses
3. **Grade 10A** - 4 students, 3 courses
4. **Grade 10B** - 4 students, 2 courses
5. **Grade 11A** - 4 students, 2 courses
6. **Grade 12A** - 0 students, 2 courses

## Courses (15)

1. Introduction to Algebra (Beginner)
2. Geometry Fundamentals (Beginner)
3. Advanced Mathematics (Advanced)
4. Physics 101 (Beginner)
5. Chemistry Basics (Beginner)
6. Biology Essentials (Beginner)
7. World History (Intermediate)
8. English Literature (Intermediate)
9. Computer Science 101 (Beginner)
10. Spanish Language (Beginner)
11. Art and Design (Beginner)
12. Physical Education (Beginner)
13. Economics (Intermediate)
14. Environmental Science (Intermediate)
15. Psychology 101 (Intermediate)

## Data Structure

- **20 Students** enrolled across 6 classes
- **10 Teachers** assigned to classes
- **15 Courses** with complete modules and lessons
- **20 Student Enrollments**
- **10 Teacher Assignments**

## Testing Features

### Forum Testing
- ✅ Each class has forum enabled
- ✅ Class forums and course forums active
- ✅ Students see their enrolled class discussions
- ✅ Teachers see multiple class discussions

### User Profiles
- ✅ All users have complete profile data
- ✅ Mobile numbers in Indian format (+91)
- ✅ Addresses across major Indian cities
- ✅ Role-based access (Student/Teacher)

## Quick Commands

### Reseed Data
```bash
cd ryland-lms-api
node scripts/seed-test-data.js
```

### Clear Test Data
```bash
cd ryland-lms-api
node scripts/clear-test-data.js
```

### Verify Data
```bash
cd ryland-lms-api
node scripts/check-sample-user.js
```

## Notes

- All users have **Active** status
- Email format: `firstname.lastname@test.com`
- Mobile numbers: 10-digit format, sequential from 9876543210 (students) and 9123456780 (teachers)
- Each course has 3 modules with lessons and quizzes
- Forum and messaging features are enabled for all classes

---

**Created:** $(date)
**School ID:** 691469d095e2f04c3e08cfe6

