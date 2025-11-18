import { Forbidden } from "@feathersjs/errors";
import { Application } from "../../declarations";

/**
 * Authorization hook for class-enrollments service
 * Restricts access based on user roles and operation type
 */
export const authorizeClassEnrollments = (app: Application) => {
  return async (context: any) => {
    const { params, method } = context;
    const userId = params?.user?._id;
    const userRole = params?.user?.role;

    if (!userId) {
      throw new Forbidden("Authentication required");
    }

    // Check if this is a controller-based query (class-students or student-classes)
    const controller = params?.query?.controller;

    // For "class-students" controller - only Admin and Teacher can access
    if (controller === "class-students") {
      if (userRole !== "Admin" && userRole !== "Teacher") {
        throw new Forbidden(
          "Access denied. Only Admin and Teacher roles can view class students."
        );
      }
      return context;
    }

    // For "student-classes" controller - students can view their own classes
    if (controller === "student-classes") {
      const studentId = params?.query?.studentId;
      
      // Admin and Teacher can view any student's classes
      if (userRole === "Admin" || userRole === "Teacher") {
        return context;
      }
      
      // Students can only view their own classes
      if (userRole === "Student" && studentId === userId.toString()) {
        return context;
      }
      
      throw new Forbidden(
        "Access denied. You can only view your own class enrollments."
      );
    }

    // For create, update, patch, remove operations - only Admin can perform
    if (method === "create" || method === "update" || method === "patch" || method === "remove") {
      if (userRole !== "Admin") {
        throw new Forbidden(
          "Access denied. Only Admin can manage student enrollments."
        );
      }
    }

    return context;
  };
};

