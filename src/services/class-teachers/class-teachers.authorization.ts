import { Forbidden } from "@feathersjs/errors";
import { Application } from "../../declarations";

/**
 * Authorization hook for class-teachers service
 * Restricts access based on user roles and operation type
 */
export const authorizeClassTeachers = (app: Application) => {
  return async (context: any) => {
    const { params, method } = context;
    const userId = params?.user?._id;
    const userRole = params?.user?.role;

    if (!userId) {
      throw new Forbidden("Authentication required");
    }

    // Check if this is a controller-based query (class-teachers or teacher-classes)
    const controller = params?.query?.controller;

    // For "class-teachers" controller - only Admin and Teacher can access
    if (controller === "class-teachers") {
      if (userRole !== "Admin" && userRole !== "Teacher") {
        throw new Forbidden(
          "Access denied. Only Admin and Teacher roles can view class teachers."
        );
      }
      return context;
    }

    // For "teacher-classes" controller - teachers can view their own classes
    if (controller === "teacher-classes") {
      const teacherId = params?.query?.teacherId;
      
      // Admin can view any teacher's classes
      if (userRole === "Admin") {
        return context;
      }
      
      // Teachers can only view their own assigned classes
      if (userRole === "Teacher" && teacherId === userId.toString()) {
        return context;
      }
      
      throw new Forbidden(
        "Access denied. You can only view your own class assignments."
      );
    }

    // For create, update, patch, remove operations - only Admin can perform
    if (method === "create" || method === "update" || method === "patch" || method === "remove") {
      if (userRole !== "Admin") {
        throw new Forbidden(
          "Access denied. Only Admin can manage teacher assignments."
        );
      }
    }

    return context;
  };
};

