import { Params } from "@feathersjs/feathers";
import { Application } from "../../declarations";
import { BadRequest } from "@feathersjs/errors";
import {
  getStudentContactsAggregation,
  getTeacherContactsAggregation,
  getAdminContactsAggregation,
} from "../../utils/contact-aggregations";
import { Contact, GroupedContactsResponse } from "../../types/messaging-contacts.types";

export class MessagingContactsService {
  app: Application;
  classEnrollmentsModel: any;
  classTeachersModel: any;
  usersModel: any;

  constructor(options: any, app: Application) {
    this.app = app;
    const mongooseClient = app.get("mongooseClient");
    this.classEnrollmentsModel = mongooseClient.models.classEnrollments;
    this.classTeachersModel = mongooseClient.models.classTeachers;
    this.usersModel = mongooseClient.models.users;
  }

  async find(params: Params): Promise<GroupedContactsResponse> {
    const user = params.user;
    if (!user) {
      throw new BadRequest("User not found in params");
    }

    const role = user.role;
    let contacts: Contact[] = [];

    switch (role) {
    case "Student":
      contacts = await this.getStudentContacts(user);
      break;
    case "Teacher":
      contacts = await this.getTeacherContacts(user);
      break;
    case "Admin":
      contacts = await this.getAdminContacts(user);
      break;
    default:
      throw new BadRequest("Invalid user role");
    }

    // Group contacts by role
    return this.groupContactsByRole(contacts);
  }

  /**
   * Groups contacts by their role
   */
  private groupContactsByRole(contacts: Contact[]): GroupedContactsResponse {
    const grouped: GroupedContactsResponse = {
      students: [],
      teachers: [],
      admins: [],
    };

    contacts.forEach((contact) => {
      const role = contact.role.toLowerCase();
      if (role === "student") {
        grouped.students.push(contact);
      } else if (role === "teacher") {
        grouped.teachers.push(contact);
      } else if (role === "admin") {
        grouped.admins.push(contact);
      }
    });

    return grouped;
  }

  async getStudentContacts(user: any): Promise<Contact[]> {
    // Get student's enrolled classes using model directly
    const enrollments = await this.classEnrollmentsModel
      .find({
        studentId: user._id,
        status: "Active",
      })
      .select("classId")
      .lean();

    const classIds = enrollments.map((e: any) => e.classId);

    // Run aggregation
    const contacts = await this.classEnrollmentsModel.aggregate(
      getStudentContactsAggregation(user._id, classIds)
    );

    return contacts;
  }

  async getTeacherContacts(user: any): Promise<Contact[]> {
    // Get teacher's classes using model directly
    const assignments = await this.classTeachersModel
      .find({
        teacherId: user._id,
        isActive: true,
      })
      .select("classId")
      .lean();

    const classIds = assignments.map((a: any) => a.classId);

    // Run aggregation
    const contacts = await this.classEnrollmentsModel.aggregate(
      getTeacherContactsAggregation(user._id, classIds, user.schoolId)
    );

    return contacts;
  }

  async getAdminContacts(user: any): Promise<Contact[]> {
    // Get all users
    const contacts = await this.usersModel.aggregate(
      getAdminContactsAggregation(user._id)
    );

    return contacts;
  }
}
