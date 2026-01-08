import { Application } from "../../declarations";
import { Params } from "@feathersjs/feathers";
import { BadRequest } from "@feathersjs/errors";
import { IForumClassesResponse, IForumClass, ICommunity, ITeacherInfo } from "./forum-classes.types";

export class ForumClasses {
  app: Application;

  constructor(options: any, app: Application) {
    this.app = app;
  }

  async find(params?: Params): Promise<any> {
    const userId = params?.user?._id;
    const userRole = params?.user?.role;

    if (!userId || !userRole) {
      throw new BadRequest("User information is required");
    }

    // Route to appropriate handler based on role
    if (userRole === "Student") {
      return this.getStudentForumClasses(userId.toString());
    } else if (userRole === "Teacher") {
      return this.getTeacherForumClasses(userId.toString());
    }

    throw new BadRequest("Invalid user role");
  }

  /**
   * Get forum classes for a student
   * Students can only see their enrolled class
   */
  private async getStudentForumClasses(studentId: string): Promise<IForumClassesResponse> {
    const classEnrollmentsModel = this.app.get("mongooseClient").models.classEnrollments;
    const classesModel = this.app.get("mongooseClient").models.classes;

    // Find active enrollment for the student
    const enrollment = await classEnrollmentsModel
      .findOne({
        studentId: studentId,
        status: "Active"
      })
      .lean();

    // If no enrollment found, return empty array
    if (!enrollment) {
      return {
        role: "Student",
        classes: []
      };
    }

    // Get the class details
    const classData = await classesModel
      .findById(enrollment.classId)
      .lean();

    if (!classData || classData.isDeleted) {
      return {
        role: "Student",
        classes: []
      };
    }

    // Enrich class data with teachers and communities
    const enrichedClass = await this.enrichClassData(classData);

    return {
      role: "Student",
      classes: [enrichedClass]
    };
  }

  /**
   * Get forum classes for a teacher
   * Teachers can see all classes they're assigned to
   */
  private async getTeacherForumClasses(teacherId: string): Promise<IForumClassesResponse> {
    const classTeachersModel = this.app.get("mongooseClient").models.classTeachers;
    const classesModel = this.app.get("mongooseClient").models.classes;

    // Find all active class assignments for the teacher
    const assignments = await classTeachersModel
      .find({
        teacherId: teacherId,
        isActive: true
      })
      .lean();

    // If no assignments found, return empty array
    if (!assignments || assignments.length === 0) {
      return {
        role: "Teacher",
        classes: []
      };
    }

    // Get all class IDs
    const classIds = assignments.map((assignment: any) => assignment.classId);

    // Get all classes data
    const classesData = await classesModel
      .find({
        _id: { $in: classIds },
        isDeleted: false
      })
      .lean();

    // Enrich each class with teachers and communities
    const enrichedClasses = await Promise.all(
      classesData.map((classData: any) => this.enrichClassData(classData))
    );

    return {
      role: "Teacher",
      classes: enrichedClasses
    };
  }

  /**
   * Enrich class data with teachers info and communities
   */
  private async enrichClassData(classData: any): Promise<IForumClass> {
    const teachers = await this.getClassTeachers(classData._id.toString());
    const communities = await this.getClassCommunities(classData);

    return {
      _id: classData._id.toString(),
      name: classData.name,
      totalStudents: classData.totalStudents || 0,
      totalCourses: classData.totalCourses || 0,
      teachers,
      communities
    };
  }

  /**
   * Get all teachers for a class
   */
  private async getClassTeachers(classId: string): Promise<ITeacherInfo[]> {
    const classTeachersModel = this.app.get("mongooseClient").models.classTeachers;
    const usersModel = this.app.get("mongooseClient").models.users;

    // Find all active teachers for this class
    const teacherAssignments = await classTeachersModel
      .find({
        classId: classId,
        isActive: true
      })
      .lean();

    if (!teacherAssignments || teacherAssignments.length === 0) {
      return [];
    }

    // Get teacher IDs
    const teacherIds = teacherAssignments.map((assignment: any) => assignment.teacherId);

    // Get teacher details
    const teachers = await usersModel
      .find({
        _id: { $in: teacherIds }
      })
      .select("firstName lastName")
      .lean();

    return teachers.map((teacher: any) => ({
      name: `${teacher.firstName} ${teacher.lastName}`.trim()
    }));
  }

  /**
   * Get communities for a class based on forum settings
   */
  private async getClassCommunities(classData: any): Promise<ICommunity[]> {
    const communities: ICommunity[] = [];
    const forumSettings = classData.forumSettings || {};

    // Add class community if enabled
    if (forumSettings.enableClassForum === true) {
      communities.push({
        name: "Class Community",
        totalPosts: 50
      });
    }

    // Add course communities if enabled
    if (forumSettings.enableCourseForum === true) {
      const courseCommunities = await this.getCourseCommunities(
        classData._id.toString(),
        forumSettings
      );
      communities.push(...courseCommunities);
    }

    return communities;
  }

  /**
   * Get course communities based on forum settings
   */
  private async getCourseCommunities(
    classId: string,
    forumSettings: any
  ): Promise<ICommunity[]> {
    const coursesModel = this.app.get("mongooseClient").models.courses;
    let courses: any[] = [];

    if (forumSettings.enableAllCourses === true) {
      // Get all courses for this class
      courses = await coursesModel
        .find({
          classId: classId
        })
        .select("name")
        .lean();
    } else if (forumSettings.selectedCourses && forumSettings.selectedCourses.length > 0) {
      // Get only selected courses
      courses = await coursesModel
        .find({
          _id: { $in: forumSettings.selectedCourses },
          classId: classId
        })
        .select("name")
        .lean();
    }

    // Map courses to community format
    return courses.map((course: any) => ({
      name: course.name,
      totalPosts: 50
    }));
  }
}

