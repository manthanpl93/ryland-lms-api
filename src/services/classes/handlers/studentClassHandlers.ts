import { BadRequest, Forbidden, NotFound } from "@feathersjs/errors";
import { Params } from "@feathersjs/feathers";
import { Application } from "../../../declarations";
import createClassEnrollmentsModel from "../../../models/class-enrollments.model";

const ensureStudentContext = (params?: Params): { studentId: string; schoolId: string } => {
  const studentId = params?.user?._id?.toString();
  const schoolId = params?.user?.schoolId;

  if (!studentId) {
    throw new BadRequest("Student context is required");
  }

  if (!schoolId) {
    throw new BadRequest("User must belong to a school");
  }

  return { studentId, schoolId };
};

export const studentGet = async (
  id: string,
  _data: null,
  params: Params,
  app: Application,
  classesModel: any
): Promise<any> => {
  if (!id) {
    throw new BadRequest("Class ID is required");
  }

  const { studentId, schoolId } = ensureStudentContext(params);

  const classEnrollmentsModel = createClassEnrollmentsModel(app);
  const enrollment = await classEnrollmentsModel
    .findOne({
      classId: id,
      studentId,
      status: "Active",
    })
    .lean();

  if (!enrollment) {
    throw new Forbidden("You are not enrolled in this class");
  }

  const classDoc = await classesModel
    .findOne({
      _id: id,
      isDeleted: false,
      schoolId,
    })
    .lean();

  if (!classDoc) {
    throw new NotFound("Class not found");
  }

  return classDoc;
};

