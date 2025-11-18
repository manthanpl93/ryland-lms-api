import * as yup from "yup";

// Question validation schema
export const questionSchema = yup.object({
  id: yup.string().required("Question ID is required"),
  type: yup
    .mixed<"multiple-choice" | "multi-select" | "true-false">()
    .oneOf(["multiple-choice", "multi-select", "true-false"], "Invalid question type")
    .required("Question type is required"),
  question: yup.string().required("Question text is required"),
  options: yup.array().of(yup.string().required()).min(2, "At least 2 options required").required(),
  correctAnswers: yup.array().of(yup.string().required()).min(1, "At least one correct answer required").required(),
  feedback: yup.string().optional(),
});

// Quiz settings validation schema
export const quizSettingsSchema = yup.object({
  randomizeQuestions: yup.boolean().default(false),
  allowRetakes: yup.boolean().default(true),
  passingPercentage: yup.number().min(0).max(100).default(70),
});

// Quiz data validation schema
export const quizDataSchema = yup.object({
  title: yup.string().required("Quiz title is required"),
  description: yup.string().required("Quiz description is required"),
  questions: yup.array().of(questionSchema).min(1, "Quiz must have at least one question").required(),
  settings: quizSettingsSchema.required(),
});

// Lesson validation schema (for quiz lessons)
export const quizLessonSchema = yup.object({
  title: yup.string().required(),
  category: yup.string().oneOf(["lesson"]).required(),
  type: yup.string().oneOf(["quiz"]).required(),
  quizData: quizDataSchema.required("Quiz lessons must have quiz data"),
});

// Custom logic for question-specific rules
export function validateQuestionLogic(question: any, index: number): string[] {
  const errors: string[] = [];
  if (question.type === "true-false") {
    if (!question.options || question.options.length !== 2) {
      errors.push(`True/false question ${index + 1} must have exactly 2 options`);
    }
    if (question.options[0] !== "True" || question.options[1] !== "False") {
      errors.push(`True/false question ${index + 1} must have options ["True", "False"]`);
    }
    if (!question.correctAnswers || question.correctAnswers.length !== 1) {
      errors.push(`True/false question ${index + 1} must have exactly one correct answer`);
    }
  } else if (question.type === "multiple-choice") {
    if (question.correctAnswers.length > 1) {
      errors.push(`Multiple-choice question ${index + 1} can only have one correct answer`);
    }
  }
  return errors;
} 