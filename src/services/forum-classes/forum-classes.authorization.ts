import { Forbidden } from "@feathersjs/errors";

/**
 * Authorization hook for forum-classes service
 * Restricts access to only Students and Teachers
 * Blocks Admin access to community forum
 */
export const authorizeForumClasses = () => {
  return async (context: any) => {
    const { params } = context;
    const userId = params?.user?._id;
    const userRole = params?.user?.role;

    if (!userId) {
      throw new Forbidden("Authentication required");
    }

    // Block Admin access to community forum
    if (userRole === "Admin") {
      throw new Forbidden(
        "Access denied. Community forum is only available for Students and Teachers."
      );
    }

    // Allow Student and Teacher access
    if (userRole === "Student" || userRole === "Teacher") {
      return context;
    }

    // Block any other role
    throw new Forbidden(
      "Access denied. Only Students and Teachers can access the community forum."
    );
  };
};

