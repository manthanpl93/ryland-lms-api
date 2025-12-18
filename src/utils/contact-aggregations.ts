import { Types } from "mongoose";

/**
 * Get contacts for a student (classmates + teachers)
 * Runs on classEnrollments collection
 */
export const getStudentContactsAggregation = (
  userId: string,
  classIds: string[]
): any[] => {
  const objectIdClassIds = classIds.map((id) => new Types.ObjectId(id));
  const objectIdUserId = new Types.ObjectId(userId);

  return [
    // Match classmates in same classes (excluding self)
    {
      $match: {
        classId: { $in: objectIdClassIds },
        studentId: { $ne: objectIdUserId },
        status: "Active",
      },
    },
    // Lookup user details for classmates
    {
      $lookup: {
        from: "users",
        localField: "studentId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    // Project user fields
    {
      $project: {
        _id: "$user._id",
        firstName: "$user.firstName",
        lastName: "$user.lastName",
        email: "$user.email",
        role: "$user.role",
        schoolId: "$user.schoolId",
      },
    },
    // Union with teachers from classTeachers
    {
      $unionWith: {
        coll: "classTeachers",
        pipeline: [
          {
            $match: {
              classId: { $in: objectIdClassIds },
              isActive: true,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "teacherId",
              foreignField: "_id",
              as: "user",
            },
          },
          { $unwind: "$user" },
          {
            $project: {
              _id: "$user._id",
              firstName: "$user.firstName",
              lastName: "$user.lastName",
              email: "$user.email",
              role: "$user.role",
              schoolId: "$user.schoolId",
            },
          },
        ],
      },
    },
    // Deduplicate
    {
      $group: {
        _id: "$_id",
        firstName: { $first: "$firstName" },
        lastName: { $first: "$lastName" },
        email: { $first: "$email" },
        role: { $first: "$role" },
        schoolId: { $first: "$schoolId" },
      },
    },
    // Lookup conversation between current user and this contact
    {
      $lookup: {
        from: "conversations",
        let: { contactId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: [objectIdUserId, "$participants"] },
                  { $in: ["$$contactId", "$participants"] },
                ],
              },
              isActive: true,
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
        as: "conversation",
      },
    },
    // Add conversationId field
    {
      $addFields: {
        conversationId: {
          $ifNull: [{ $arrayElemAt: ["$conversation._id", 0] }, null],
        },
      },
    },
    // Remove the conversation array
    {
      $project: {
        conversation: 0,
      },
    },
  ];
};

/**
 * Get contacts for a teacher (class students + fellow teachers)
 * Runs on classEnrollments collection
 */
export const getTeacherContactsAggregation = (
  userId: string,
  classIds: string[],
  schoolId: string
): any[] => {
  const objectIdClassIds = classIds.map((id) => new Types.ObjectId(id));
  const objectIdUserId = new Types.ObjectId(userId);
  const objectIdSchoolId = new Types.ObjectId(schoolId);

  return [
    // Get students enrolled in teacher's classes
    {
      $match: {
        classId: { $in: objectIdClassIds },
        status: "Active",
      },
    },
    // Lookup student user details
    {
      $lookup: {
        from: "users",
        localField: "studentId",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    // Project user fields
    {
      $project: {
        _id: "$user._id",
        firstName: "$user.firstName",
        lastName: "$user.lastName",
        email: "$user.email",
        role: "$user.role",
        schoolId: "$user.schoolId",
      },
    },
    // Union with other teachers from same school
    {
      $unionWith: {
        coll: "users",
        pipeline: [
          {
            $match: {
              role: "Teacher",
              schoolId: objectIdSchoolId,
              _id: { $ne: objectIdUserId },
            },
          },
          {
            $project: {
              _id: 1,
              firstName: 1,
              lastName: 1,
              email: 1,
              role: 1,
              schoolId: 1,
            },
          },
        ],
      },
    },
    // Deduplicate
    {
      $group: {
        _id: "$_id",
        firstName: { $first: "$firstName" },
        lastName: { $first: "$lastName" },
        email: { $first: "$email" },
        role: { $first: "$role" },
        schoolId: { $first: "$schoolId" },
      },
    },
    // Lookup conversation between current user and this contact
    {
      $lookup: {
        from: "conversations",
        let: { contactId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: [objectIdUserId, "$participants"] },
                  { $in: ["$$contactId", "$participants"] },
                ],
              },
              isActive: true,
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
        as: "conversation",
      },
    },
    // Add conversationId field
    {
      $addFields: {
        conversationId: {
          $ifNull: [{ $arrayElemAt: ["$conversation._id", 0] }, null],
        },
      },
    },
    // Remove the conversation array
    {
      $project: {
        conversation: 0,
      },
    },
  ];
};

/**
 * Get contacts for an admin (all users)
 * Runs on users collection
 */
export const getAdminContactsAggregation = (userId: string): any[] => {
  const objectIdUserId = new Types.ObjectId(userId);

  return [
    {
      $match: {
        _id: { $ne: objectIdUserId },
      },
    },
    {
      $project: {
        _id: 1,
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        schoolId: 1,
      },
    },
    // Lookup conversation between current user and this contact
    {
      $lookup: {
        from: "conversations",
        let: { contactId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: [objectIdUserId, "$participants"] },
                  { $in: ["$$contactId", "$participants"] },
                ],
              },
              isActive: true,
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
        as: "conversation",
      },
    },
    // Add conversationId field
    {
      $addFields: {
        conversationId: {
          $ifNull: [{ $arrayElemAt: ["$conversation._id", 0] }, null],
        },
      },
    },
    // Remove the conversation array
    {
      $project: {
        conversation: 0,
      },
    },
    {
      $sort: {
        role: 1,
        firstName: 1,
        lastName: 1,
      },
    },
  ];
};
