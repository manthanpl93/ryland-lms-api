import * as feathersAuthentication from "@feathersjs/authentication";
import * as local from "@feathersjs/authentication-local";
// Don't remove this comment. It's needed to format import lines nicely.

const { authenticate } = feathersAuthentication.hooks;
const { hashPassword, protect } = local.hooks;

const syncClassAssignments = async (context: any) => {
  const { data, result, app } = context;
  const userId = result._id;
  const role = result.role;

  // Only process if classId or classIds were provided in the input data
  if (!data || (data.classId === undefined && data.classIds === undefined)) {
    return context;
  }

  if (role === "Student" && data.classId !== undefined) {
    const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;
    
    // Fetch existing enrollment directly from DB
    const existing = await classEnrollmentsModel.findOne({ studentId: userId });
    const oldClassId = existing?.classId?.toString();
    const newClassId = data.classId;

    // If changed, remove old and add new
    if (oldClassId !== newClassId) {
      // Remove old enrollment
      if (oldClassId && existing) {
        await classEnrollmentsModel.deleteOne({ _id: existing._id });
      }

      // Create new enrollment
      if (newClassId) {
        await classEnrollmentsModel.create({
          studentId: userId,
          classId: newClassId,
          status: "Active",
        });
      }
    }
  } else if (role === "Teacher" && data.classIds !== undefined) {
    const classTeachersModel = app.get("mongooseClient").models.classTeachers;
    
    // Fetch existing assignments directly from DB
    const existing = await classTeachersModel.find({ teacherId: userId, isActive: true });
    const oldClassIds = existing.map((a: any) => a.classId.toString());
    const newClassIds = Array.isArray(data.classIds) ? data.classIds : [];

    // Identify changes
    const added = newClassIds.filter((id: string) => !oldClassIds.includes(id));
    const removed = oldClassIds.filter((id: string) => !newClassIds.includes(id));

    // Add new assignments
    await Promise.all(
      added.map((classId: string) =>
        classTeachersModel.create({
          teacherId: userId,
          classId,
          isActive: true,
        }),
      ),
    );

    // Remove old assignments
    const toDelete = existing.filter((a: any) => removed.includes(a.classId.toString()));
    await Promise.all(toDelete.map((a: any) => classTeachersModel.deleteOne({ _id: a._id })));
  }

  return context;
};

const populateClassData = async (context: any) => {
  const { result, app } = context;

  if (!result) return context;

  const users = result.data ? result.data : Array.isArray(result) ? result : [result];

  await Promise.all(
    users.map(async (user: any) => {
      if (!user || !user._id) return;

      if (user.role === "Student") {
        const classEnrollmentsModel = app.get("mongooseClient").models.classEnrollments;
        const classesModel = app.get("mongooseClient").models.classes;
        
        const enrollment = await classEnrollmentsModel.findOne({ studentId: user._id, status: "Active" });
        if (enrollment) {
          try {
            user.assignedClass = await classesModel.findById(enrollment.classId).lean();
          } catch (error) {
            console.error(`Error populating class for student ${user._id}:`, error);
          }
        }
      } else if (user.role === "Teacher") {
        const classTeachersModel = app.get("mongooseClient").models.classTeachers;
        const classesModel = app.get("mongooseClient").models.classes;
        
        const assignments = await classTeachersModel.find({ teacherId: user._id, isActive: true }).limit(100);
        if (assignments && assignments.length > 0) {
          const classesModel = app.get("mongooseClient").models.classes;
          user.assignedClasses = await Promise.all(
            assignments.map(async (a: any) => {
              try {
                return await classesModel.findById(a.classId).lean();
              } catch (error) {
                console.error(`Error populating class ${a.classId} for teacher ${user._id}:`, error);
                return null;
              }
            }),
          );
          // Filter out nulls in case some classes were not found
          user.assignedClasses = user.assignedClasses.filter((c: any) => c !== null);
        } else {
          user.assignedClasses = [];
        }
      }
    }),
  );

  return context;
};

export default {
  before: {
    all: [authenticate("jwt")],
    find: [],
    get: [],
    create: [hashPassword("password")],
    update: [hashPassword("password")],
    patch: [hashPassword("password")],
    remove: [],
  },

  after: {
    all: [
      // Make sure the password field is never sent to the client
      // Always must be the last hook
      protect("password"),
    ],
    find: [populateClassData],
    get: [populateClassData],
    create: [syncClassAssignments, populateClassData],
    update: [syncClassAssignments, populateClassData],
    patch: [syncClassAssignments, populateClassData],
    remove: [],
  },

  error: {
    all: [],
    find: [],
    get: [],
    create: [],
    update: [],
    patch: [],
    remove: [],
  },
};
