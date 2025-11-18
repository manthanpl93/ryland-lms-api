module.exports = {
  async up(db) {
    console.log('Starting users migration...');
    
    try {
      const usersCollection = db.collection('users');
      
      // Check if users already exist
      const existingUsers = await usersCollection.countDocuments();
      if (existingUsers > 0) {
        console.log(`Users collection already contains ${existingUsers} documents. Skipping migration.`);
        return;
      }

      const sampleUsers = [
        {
          firstName: "John",
          lastName: "Smith",
          email: "john.smith@example.com",
          mobileNo: "+1-555-0101",
          gender: "Male",
          dateOfBirth: new Date("1990-03-15"),
          address: "123 Main Street, New York, NY 10001",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Sarah",
          lastName: "Johnson",
          email: "sarah.johnson@example.com",
          mobileNo: "+1-555-0102",
          gender: "Female",
          dateOfBirth: new Date("1988-07-22"),
          address: "456 Oak Avenue, Los Angeles, CA 90210",
          roles: ["Author"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Michael",
          lastName: "Brown",
          email: "michael.brown@example.com",
          mobileNo: "+1-555-0103",
          gender: "Male",
          dateOfBirth: new Date("1992-11-08"),
          address: "789 Pine Road, Chicago, IL 60601",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Emily",
          lastName: "Davis",
          email: "emily.davis@example.com",
          mobileNo: "+1-555-0104",
          gender: "Female",
          dateOfBirth: new Date("1985-04-12"),
          address: "321 Elm Street, Houston, TX 77001",
          roles: ["Admin"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "David",
          lastName: "Wilson",
          email: "david.wilson@example.com",
          mobileNo: "+1-555-0105",
          gender: "Male",
          dateOfBirth: new Date("1991-09-30"),
          address: "654 Maple Drive, Phoenix, AZ 85001",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Lisa",
          lastName: "Anderson",
          email: "lisa.anderson@example.com",
          mobileNo: "+1-555-0106",
          gender: "Female",
          dateOfBirth: new Date("1987-12-05"),
          address: "987 Cedar Lane, Philadelphia, PA 19101",
          roles: ["Author"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Robert",
          lastName: "Taylor",
          email: "robert.taylor@example.com",
          mobileNo: "+1-555-0107",
          gender: "Male",
          dateOfBirth: new Date("1989-06-18"),
          address: "147 Birch Court, San Antonio, TX 78201",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Jennifer",
          lastName: "Martinez",
          email: "jennifer.martinez@example.com",
          mobileNo: "+1-555-0108",
          gender: "Female",
          dateOfBirth: new Date("1993-01-25"),
          address: "258 Spruce Way, San Diego, CA 92101",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Christopher",
          lastName: "Garcia",
          email: "christopher.garcia@example.com",
          mobileNo: "+1-555-0109",
          gender: "Male",
          dateOfBirth: new Date("1986-08-14"),
          address: "369 Willow Path, Dallas, TX 75201",
          roles: ["Author"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Amanda",
          lastName: "Rodriguez",
          email: "amanda.rodriguez@example.com",
          mobileNo: "+1-555-0110",
          gender: "Female",
          dateOfBirth: new Date("1994-05-03"),
          address: "741 Aspen Circle, San Jose, CA 95101",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "James",
          lastName: "Lee",
          email: "james.lee@example.com",
          mobileNo: "+1-555-0111",
          gender: "Male",
          dateOfBirth: new Date("1984-10-20"),
          address: "852 Poplar Street, Austin, TX 73301",
          roles: ["Admin"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Michelle",
          lastName: "White",
          email: "michelle.white@example.com",
          mobileNo: "+1-555-0112",
          gender: "Female",
          dateOfBirth: new Date("1990-02-11"),
          address: "963 Sycamore Road, Jacksonville, FL 32201",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Daniel",
          lastName: "Harris",
          email: "daniel.harris@example.com",
          mobileNo: "+1-555-0113",
          gender: "Male",
          dateOfBirth: new Date("1988-12-07"),
          address: "159 Magnolia Avenue, Fort Worth, TX 76101",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Jessica",
          lastName: "Clark",
          email: "jessica.clark@example.com",
          mobileNo: "+1-555-0114",
          gender: "Female",
          dateOfBirth: new Date("1991-07-16"),
          address: "267 Redwood Boulevard, Columbus, OH 43201",
          roles: ["Author"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Matthew",
          lastName: "Lewis",
          email: "matthew.lewis@example.com",
          mobileNo: "+1-555-0115",
          gender: "Male",
          dateOfBirth: new Date("1987-03-29"),
          address: "375 Cypress Lane, Charlotte, NC 28201",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Nicole",
          lastName: "Robinson",
          email: "nicole.robinson@example.com",
          mobileNo: "+1-555-0116",
          gender: "Female",
          dateOfBirth: new Date("1993-11-02"),
          address: "483 Sequoia Drive, San Francisco, CA 94101",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Andrew",
          lastName: "Walker",
          email: "andrew.walker@example.com",
          mobileNo: "+1-555-0117",
          gender: "Male",
          dateOfBirth: new Date("1989-04-18"),
          address: "591 Hemlock Street, Indianapolis, IN 46201",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Stephanie",
          lastName: "Young",
          email: "stephanie.young@example.com",
          mobileNo: "+1-555-0118",
          gender: "Female",
          dateOfBirth: new Date("1986-09-13"),
          address: "627 Juniper Court, Seattle, WA 98101",
          roles: ["Author"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Kevin",
          lastName: "King",
          email: "kevin.king@example.com",
          mobileNo: "+1-555-0119",
          gender: "Male",
          dateOfBirth: new Date("1992-06-25"),
          address: "735 Fir Avenue, Denver, CO 80201",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          firstName: "Rachel",
          lastName: "Wright",
          email: "rachel.wright@example.com",
          mobileNo: "+1-555-0120",
          gender: "Female",
          dateOfBirth: new Date("1988-01-08"),
          address: "841 Spruce Lane, Washington, DC 20001",
          roles: ["Student"],
          status: "Active",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      // Insert all users
      const result = await usersCollection.insertMany(sampleUsers);
      
      console.log(`Successfully created ${result.insertedCount} users`);
      
      // Create indexes for better performance
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      await usersCollection.createIndex({ status: 1 });
      await usersCollection.createIndex({ roles: 1 });
      await usersCollection.createIndex({ createdAt: 1 });
      
      console.log('Users migration completed successfully');
      
    } catch (error) {
      console.error('Error during users migration:', error.message);
      throw error;
    }
  },

  async down(db) {
    console.log('Rolling back users migration...');
    
    try {
      const usersCollection = db.collection('users');
      
      // Remove all users created by this migration
      const result = await usersCollection.deleteMany({
        email: {
          $in: [
            "john.smith@example.com",
            "sarah.johnson@example.com",
            "michael.brown@example.com",
            "emily.davis@example.com",
            "david.wilson@example.com",
            "lisa.anderson@example.com",
            "robert.taylor@example.com",
            "jennifer.martinez@example.com",
            "christopher.garcia@example.com",
            "amanda.rodriguez@example.com",
            "james.lee@example.com",
            "michelle.white@example.com",
            "daniel.harris@example.com",
            "jessica.clark@example.com",
            "matthew.lewis@example.com",
            "nicole.robinson@example.com",
            "andrew.walker@example.com",
            "stephanie.young@example.com",
            "kevin.king@example.com",
            "rachel.wright@example.com"
          ]
        }
      });
      
      console.log(`Successfully removed ${result.deletedCount} users`);
      
      // Drop indexes
      try {
        await usersCollection.dropIndex("email_1");
        await usersCollection.dropIndex("status_1");
        await usersCollection.dropIndex("roles_1");
        await usersCollection.dropIndex("createdAt_1");
        console.log('Indexes dropped successfully');
      } catch (indexError) {
        console.log('Some indexes may not exist or could not be dropped:', indexError.message);
      }
      
      console.log('Users migration rollback completed successfully');
      
    } catch (error) {
      console.error('Error during users migration rollback:', error.message);
      throw error;
    }
  }
}; 