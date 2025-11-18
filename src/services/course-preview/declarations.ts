export interface UpdateQuery {
  courseId: string;
  updateType: "module" | "lesson";
  moduleId: string;
  lessonId?: string;
}

export interface UpdateBody {
  completed?: "yes" | "no";
  startDate?: string;
  endDate?: string;
  totalLessonsFinished?: number;
}
