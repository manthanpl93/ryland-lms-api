import { Params, Id } from "@feathersjs/feathers";
import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { BadRequest, NotFound, Conflict } from "@feathersjs/errors";
import { Application } from "../../declarations";
import { IClassEnrollment, IBulkEnrollResponse } from "./class-enrollments.types";
import mongoose from "mongoose";

export class ClassEnrollments extends Service {
  app: Application;

  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
    this.app = app;
  }

  async find(params?: Params): Promise<any> {
    const { query } = params || {};
    const { controller } = query || {};

    // Handle different controllers
    if (controller === "class-students") {
      return this.getStudentsByClass(query);
    }

    if (controller === "student-classes") {
      return this.getClassesByStudent(query);
    }

    // Default find behavior
    return super.find(params);
  }

  async create(data: any, params?: Params): Promise<any> {
    // Validate required fields
    if (!data.classId) {
      throw new BadRequest("Class ID is required");
    }

    if (!data.studentId) {
      throw new BadRequest("Student ID is required");
    }

    // Check if enrollment already exists
    const existingEnrollment = await this.Model.findOne({
      classId: data.classId,
      studentId: data.studentId,
    });

    if (existingEnrollment) {
      throw new Conflict("Student is already enrolled in this class");
    }

    // Verify class exists
    const classData = await (this.app.service("classes") as any).get(data.classId, params);
    if (!classData) {
      throw new NotFound("Class not found");
    }

    // Verify student exists and has correct role
    const student = await (this.app.service("users") as any).get(data.studentId, params);
    if (!student) {
      throw new NotFound("Student not found");
    }

    if (student.role !== "Student") {
      throw new BadRequest("User must have Student role");
    }

    // Set enrolledBy from authenticated user
    if (params?.user?._id && !data.enrolledBy) {
      data.enrolledBy = params.user._id;
    }

    // Create enrollment
    const enrollment = await super.create(data, params);
    
    console.log("Enrollment created successfully:", JSON.stringify({
      _id: enrollment._id,
      classId: enrollment.classId,
      studentId: enrollment.studentId,
      status: enrollment.status
    }));

    // Update class student count
    if (enrollment.status === "Active") {
      await (this.app.service("classes") as any).updateStudentCount(
        data.classId,
        1
      );
    }

    return enrollment;
  }

  async patch(id: Id, data: any, params?: Params): Promise<any> {
    const enrollment = await this.Model.findById(id) as any as IClassEnrollment;

    if (!enrollment) {
      throw new NotFound("Enrollment not found");
    }

    const oldStatus = enrollment.status;
    const newStatus = data.status;

    // Update enrollment
    const updatedEnrollment = await super.patch(id, data, params);

    // Update class student count if status changed
    if (oldStatus !== newStatus) {
      if (oldStatus === "Active" && newStatus !== "Active") {
        // Student became inactive
        await (this.app.service("classes") as any).updateStudentCount(
          enrollment.classId,
          -1
        );
      } else if (oldStatus !== "Active" && newStatus === "Active") {
        // Student became active
        await (this.app.service("classes") as any).updateStudentCount(
          enrollment.classId,
          1
        );
      }
    }

    return updatedEnrollment;
  }

  async remove(id: Id, params?: Params): Promise<any> {
    const enrollment = await this.Model.findById(id) as any as IClassEnrollment;

    if (!enrollment) {
      throw new NotFound("Enrollment not found");
    }

    // Update class student count if enrollment was active
    if (enrollment.status === "Active") {
      await (this.app.service("classes") as any).updateStudentCount(
        enrollment.classId,
        -1
      );
    }

    return super.remove(id, params);
  }

  // Get all students for a class with user details
  async getStudentsByClass(query: any): Promise<any> {
    const { classId, status, search, $limit, $skip } = query;

    if (!classId) {
      throw new BadRequest("Class ID is required");
    }

    // Convert classId to ObjectId if it's a string
    const classObjectId = typeof classId === "string" && mongoose.Types.ObjectId.isValid(classId)
      ? new mongoose.Types.ObjectId(classId)
      : classId;

    console.log("getStudentsByClass - classId:", classId);
    console.log("getStudentsByClass - classObjectId:", classObjectId);
    console.log("getStudentsByClass - status:", status);

    const matchStage: any = { classId: classObjectId };

    if (status) {
      matchStage.status = status;
    }

    console.log("getStudentsByClass - matchStage:", JSON.stringify(matchStage));

    const pipeline: any[] = [
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
    ];

    // Add search filter if provided
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { "student.firstName": { $regex: search, $options: "i" } },
            { "student.lastName": { $regex: search, $options: "i" } },
            { "student.email": { $regex: search, $options: "i" } },
          ],
        },
      });
    }

    // Add pagination
    const skip = $skip || 0;
    const limit = $limit || 10;

    // Count total
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await this.Model.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Get data
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });
    pipeline.push({
      $project: {
        _id: 1,
        classId: 1,
        studentId: 1,
        enrollmentDate: 1,
        status: 1,
        enrolledBy: 1,
        createdAt: 1,
        updatedAt: 1,
        student: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          mobileNo: 1,
          status: 1,
        },
      },
    });

    const data = await this.Model.aggregate(pipeline);

    console.log("getStudentsByClass - total:", total);
    console.log("getStudentsByClass - data count:", data.length);
    console.log("getStudentsByClass - data:", JSON.stringify(data));

    // Also check if there are any enrollments at all for this class
    const allEnrollments = await this.Model.find({ classId: classObjectId });
    console.log("getStudentsByClass - all enrollments count:", allEnrollments.length);
    
    // Check all enrollments in the entire collection to debug
    const allEnrollmentsInDB = await this.Model.find({}).limit(5).lean();
    console.log("getStudentsByClass - sample enrollments in DB:", JSON.stringify(allEnrollmentsInDB.map((e: any) => ({ 
      classId: e.classId, 
      studentId: e.studentId,
      status: e.status 
    }))));

    return {
      total,
      limit,
      skip,
      data,
    };
  }

  // Get all classes for a student
  async getClassesByStudent(query: any): Promise<any> {
    const { studentId, status } = query;

    if (!studentId) {
      throw new BadRequest("Student ID is required");
    }

    // Convert studentId to ObjectId if it's a string
    const studentObjectId = typeof studentId === "string" && mongoose.Types.ObjectId.isValid(studentId)
      ? new mongoose.Types.ObjectId(studentId)
      : studentId;

    const matchStage: any = { studentId: studentObjectId };

    if (status) {
      matchStage.status = status;
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: "classes",
          localField: "classId",
          foreignField: "_id",
          as: "class",
        },
      },
      { $unwind: "$class" },
      {
        $project: {
          _id: 1,
          classId: 1,
          enrollmentDate: 1,
          status: 1,
          class: 1,
        },
      },
    ];

    const data = await this.Model.aggregate(pipeline);

    return {
      total: data.length,
      data,
    };
  }

  // Bulk enroll students
  async bulkEnroll(data: any, params?: Params): Promise<IBulkEnrollResponse> {
    const { classId, studentIds } = data;

    if (!classId) {
      throw new BadRequest("Class ID is required");
    }

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw new BadRequest("Student IDs array is required");
    }

    const results: IBulkEnrollResponse = {
      success: [],
      failed: [],
    };

    for (const studentId of studentIds) {
      try {
        const enrollment = await this.create(
          {
            classId,
            studentId,
            status: "Active",
          },
          params
        );
        results.success.push({ studentId, enrollment });
      } catch (error: any) {
        results.failed.push({ studentId, error: error.message });
      }
    }

    return results;
  }
}

