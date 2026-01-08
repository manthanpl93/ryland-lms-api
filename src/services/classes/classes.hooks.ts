import * as authentication from "@feathersjs/authentication";
import { Forbidden } from "@feathersjs/errors";
import { checkClassAccess, checkClassModifyPermission } from "./classAuthGuard";
import { syncCommunities } from "../../utils/community-sync";

const { authenticate } = authentication.hooks;

const restrictRoles =
(allowedRoles: string[]) =>
  async (context: any) => {
    const role = context.params?.user?.role;

    if (!role || !allowedRoles.includes(role)) {
      throw new Forbidden("You are not allowed to perform this action.");
    }

    return context;
  };

// Hook to sync communities after class create
const syncCommunitiesAfterCreate = async (context: any) => {
  const { result, app } = context;
  
  if (result && result._id && result.forumSettings) {
    try {
      const updatedForumSettings = await syncCommunities(
        result._id.toString(),
        result.forumSettings,
        app
      );
      
      // Update the class directly in database
      const classesModel = app.get("mongooseClient").models.classes;
      await classesModel.findByIdAndUpdate(result._id, {
        forumSettings: updatedForumSettings
      });
      
      // Update the result to reflect the changes
      if (result.forumSettings) {
        result.forumSettings.classCommunityId = updatedForumSettings.classCommunityId;
        result.forumSettings.selectedCourses = updatedForumSettings.selectedCourses;
      } else {
        result.forumSettings = updatedForumSettings;
      }
    } catch (error: any) {
      console.error("Error syncing communities after create:", error);
      // Don't fail the request, just log the error
    }
  }
  
  return context;
};

// Hook to sync communities before patch
const syncCommunitiesBeforePatch = async (context: any) => {
  const { data, id, app } = context;
  
  if (data && data.forumSettings && id) {
    try {
      // Get the existing class to merge with patch data
      const classesModel = app.get("mongooseClient").models.classes;
      const existingClass = await classesModel.findById(id).lean();
      
      // Merge existing forumSettings with patch data
      const mergedForumSettings = {
        ...existingClass.forumSettings,
        ...data.forumSettings
      };
      
      const updatedForumSettings = await syncCommunities(
        id.toString(),
        mergedForumSettings,
        app
      );
      
      // Update the data with synced forum settings
      data.forumSettings = updatedForumSettings;
    } catch (error: any) {
      console.error("Error syncing communities before patch:", error);
      // Don't fail the request, just log the error
    }
  }
  
  return context;
};

export default {
  before: {
    all: [authenticate("jwt")],
    find: [restrictRoles(["Admin", "Teacher"])],
    get: [
      restrictRoles(["Admin", "Teacher", "Student"]),
      checkClassAccess
    ],
    create: [restrictRoles(["Admin"])],
    update: [
      restrictRoles(["Admin"]),
      checkClassModifyPermission
    ],
    patch: [
      restrictRoles(["Admin"]),
      checkClassModifyPermission,
      syncCommunitiesBeforePatch
    ],
    remove: [
      restrictRoles(["Admin"]),
      checkClassModifyPermission
    ],
  },

  after: {
    all: [],
    find: [],
    get: [],
    create: [syncCommunitiesAfterCreate],
    update: [],
    patch: [],
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

