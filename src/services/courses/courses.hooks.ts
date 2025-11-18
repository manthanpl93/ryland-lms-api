import * as feathersAuthentication from "@feathersjs/authentication";
import {
  quizLessonSchema,
  validateQuestionLogic,
} from "../../validations/quiz.validation";
import { checkCourseAccess, checkCourseModifyPermission } from "./courseAuthGuard";
import app from "../../app";

const { authenticate } = feathersAuthentication.hooks;

const validateQuizData = async (context: any) => {
  const { data } = context;
  if (data?.outline) {
    for (const item of data.outline) {
      if (item.category === "lesson" && item.type === "quiz") {
        await validateQuizLessonWithYup(item);
      }
      if (item.category === "module" && item.lessons) {
        for (const lesson of item.lessons) {
          if (lesson.type === "quiz") {
            await validateQuizLessonWithYup(lesson);
          }
        }
      }
    }
  }
  return context;
};

async function validateQuizLessonWithYup(lesson: any) {
  try {
    await quizLessonSchema.validate(lesson, { abortEarly: false });
  } catch (error: any) {
    throw new Error(error.errors.join("; "));
  }
  // Additional logic-based validation for questions
  lesson.quizData.questions.forEach((q: any, idx: number) => {
    const logicErrors = validateQuestionLogic(q, idx);
    if (logicErrors.length > 0) {
      throw new Error(logicErrors.join("; "));
    }
  });
}

export default {
  before: {
    all: [authenticate("jwt")],
    find: [],
    get: [checkCourseAccess(app)],
    create: [validateQuizData],
    update: [validateQuizData, checkCourseModifyPermission(app)],
    patch: [validateQuizData, checkCourseModifyPermission(app)],
    remove: [checkCourseModifyPermission(app)],
  },
  after: {
    all: [],
    find: [],
    get: [],
    create: [],
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
