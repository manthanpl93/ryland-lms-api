import { BadRequest, NotFound } from "@feathersjs/errors";
import { Params } from "@feathersjs/feathers";
import { Application } from "../../../declarations";

interface PaginatedResponse<T = any> {
  total: number;
  limit: number;
  skip: number;
  data: T[];
}

const ensureSchoolContext = (params?: Params): string => {
  const schoolId = params?.user?.schoolId;

  if (!schoolId) {
    throw new BadRequest("User must be associated with a school");
  }

  return schoolId;
};

const buildBaseQuery = (params?: Params): Record<string, any> => {
  const query = params?.query || {};

  const baseQuery: Record<string, any> = {
    isDeleted: false,
    schoolId: ensureSchoolContext(params),
  };

  if (query.status) {
    baseQuery.status = query.status;
  }

  if (query.search) {
    baseQuery.name = { $regex: query.search, $options: "i" };
  }

  return baseQuery;
};

const getPaginationOptions = (params?: Params) => {
  const query = params?.query || {};

  return {
    limit: Number(query.$limit ?? 10),
    skip: Number(query.$skip ?? 0),
    sort: query.$sort || { createdAt: -1 },
  };
};

export const adminGet = async (
  id: string,
  _data: null,
  params: Params,
  app: Application,
  classesModel: any
): Promise<any> => {
  if (!id) {
    throw new BadRequest("Class ID is required");
  }

  const classDoc = await classesModel
    .findOne({
      _id: id,
      isDeleted: false,
      schoolId: ensureSchoolContext(params),
    })
    .lean();

  if (!classDoc) {
    throw new NotFound("Class not found");
  }

  return classDoc;
};

export const adminFind = async (
  _id: null,
  _data: null,
  params: Params,
  app: Application,
  classesModel: any
): Promise<PaginatedResponse> => {
  const baseQuery = buildBaseQuery(params);
  const { limit, skip, sort } = getPaginationOptions(params);

  const [data, total] = await Promise.all([
    classesModel.find(baseQuery).sort(sort).limit(limit).skip(skip).lean().exec(),
    classesModel.countDocuments(baseQuery),
  ]);

  return {
    total,
    limit,
    skip,
    data,
  };
};

export const adminCreate = async (
  _id: null,
  data: any,
  params: Params,
  app: Application,
  classesModel: any
): Promise<any> => {
  if (!data?.name) {
    throw new BadRequest("Class name is required");
  }

  const schoolId = ensureSchoolContext(params);

  const classPayload = {
    name: data.name,
    schoolId,
    status: data.status || "Active",
    totalStudents: 0,
    totalCourses: 0,
    forumSettings: {
      enableClassForum: false,
      enableCourseForum: false,
      enableAllCourses: false,
      selectedCourses: [],
      ...(data.forumSettings || {}),
    },
    messagingSettings: {
      enableMessaging: false,
      enableAllTeachers: false,
      selectedTeachers: [],
      ...(data.messagingSettings || {}),
    },
    isDeleted: false,
  };

  return classesModel.create(classPayload);
};

export const adminPatch = async (
  id: string,
  data: any,
  params: Params,
  app: Application,
  classesModel: any
): Promise<any> => {
  if (!id) {
    throw new BadRequest("Class ID is required");
  }

  // Prevent direct modification of counters
  const { totalStudents, totalCourses, ...updatableData } = data || {};
  void totalStudents;
  void totalCourses;

  const updatedClass = await classesModel
    .findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        schoolId: ensureSchoolContext(params),
      },
      { $set: updatableData },
      { new: true }
    )
    .lean();

  if (!updatedClass) {
    throw new NotFound("Class not found");
  }

  return updatedClass;
};

export const adminDelete = async (
  id: string,
  _data: null,
  params: Params,
  app: Application,
  classesModel: any
): Promise<any> => {
  if (!id) {
    throw new BadRequest("Class ID is required");
  }

  const deletedClass = await classesModel
    .findOneAndUpdate(
      {
        _id: id,
        isDeleted: false,
        schoolId: ensureSchoolContext(params),
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          status: "Inactive",
        },
      },
      { new: true }
    )
    .lean();

  if (!deletedClass) {
    throw new NotFound("Class not found");
  }

  return deletedClass;
};

