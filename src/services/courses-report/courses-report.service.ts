import { Application } from "../../declarations";
import { CoursesReport, CoursesWeeklyReport } from "./courses-report.class";
import coursesReportHooks from "./courses-report.hooks";

export default function (app: Application): void {
  app.use("/courses-report", new CoursesReport(app));
  app.use("/weekly-courses-report", new CoursesWeeklyReport(app));

  const service: any = app.service("courses-report");

  service?.hooks(coursesReportHooks);
}
