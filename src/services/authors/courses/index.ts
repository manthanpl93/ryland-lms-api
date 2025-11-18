import { Application } from "../../../declarations";
import courses from "./courses.service";

export default function (app: Application): void {
  // Initialize all author course services
  courses(app);
} 