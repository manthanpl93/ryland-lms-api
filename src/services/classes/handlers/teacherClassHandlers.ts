import { BadRequest, Forbidden, NotFound } from "@feathersjs/errors";
import { Params } from "@feathersjs/feathers";
import { Application } from "../../../declarations";
import createClassTeachersModel from "../../../models/class-teachers.model";

interface PaginatedResponse<T = any> {
  total: number;
  limit: number;
  skip: number;
  data: T[];
}

const getPaginationOptions = (params?: Params) => {
  const query = params?.query || {};

  return {
    limit: Number(query.$limit ?? 10),
    skip: Number(query.$skip ?? 0),
    sort: query.$sort || { createdAt: -1 },
  };
};

const buildTeacherQuery = (
  classIds: string[],
  params?: Params
): Record<string, any> => {
  const query = params?.query || {};
  const userSchoolId = params?.user?.schoolId;

  if (!userSchoolId) {
    throw new BadRequest("User must belong to a school");
  }

  const baseQuery: Record<string, any> = {
    _id: { $in: classIds },
    isDeleted: false,
    schoolId: userSchoolId,
  };

  if (query.status) {
    baseQuery.status = query.status;
  }

  if (query.search) {
    baseQuery.name = { $regex: query.search, $options: "i" };
  }

  return baseQuery;
};

const getTeacherClassIds = async (
  teacherId: string,
  app: Application
): Promise<string[]> => {
  const classTeachersModel = createClassTeachersModel(app);

  const assignments = await classTeachersModel
    .find({ teacherId, isActive: true })
    .select("classId")
    .lean();

  return assignments.map((assignment) => assignment.classId?.toString()).filter(Boolean);
};

const isTeacherAssignedToClass = async (
  classId: string,
  teacherId: string,
  app: Application
): Promise<boolean> => {
  const classTeachersModel = createClassTeachersModel(app);

  const assignment = await classTeachersModel
    .findOne({
      classId,
      teacherId,
      isActive: true,
    })
    .lean();

  return !!assignment;
};

export const teacherGet = async (
  id: string,
  _data: null,
  params: Params,
  app: Application,
  classesModel: any
): Promise<any> => {
  if (!id) {
    throw new BadRequest("Class ID is required");
  }

  const teacherId = params?.user?._id?.toString();
  const schoolId = params?.user?.schoolId;

  if (!teacherId) {
    throw new BadRequest("Teacher ID is required");
  }

  if (!schoolId) {
    throw new BadRequest("User must belong to a school");
  }

  // Verify teacher is assigned to this class
  const isAssigned = await isTeacherAssignedToClass(id, teacherId, app);

  if (!isAssigned) {
    throw new Forbidden("You are not assigned to this class");
  }

  const classDoc = await classesModel
    .findOne({
      _id: id,
      isDeleted: false,
      schoolId,
    })
    .select("-forumSettings -messagingSettings")
    .lean();

  if (!classDoc) {
    throw new NotFound("Class not found");
  }

  // Return only basic class information (excluding management settings)
  return classDoc;
};

export const teacherFind = async (
  _id: null,
  _data: null,
  params: Params,
  app: Application,
  classesModel: any
): Promise<PaginatedResponse> => {
  const teacherId = params?.user?._id?.toString();

  if (!teacherId) {
    throw new BadRequest("Teacher ID is required");
  }

  const classIds = await getTeacherClassIds(teacherId, app);

  const { limit, skip, sort } = getPaginationOptions(params);

  if (classIds.length === 0) {
    return {
      total: 0,
      limit,
      skip,
      data: [],
    };
  }

  const query = buildTeacherQuery(classIds, params);

  const [data, total] = await Promise.all([
    classesModel
      .find(query)
      .select("-forumSettings -messagingSettings")
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean()
      .exec(),
    classesModel.countDocuments(query),
  ]);

  return {
    total,
    limit,
    skip,
    data,
  };
};

