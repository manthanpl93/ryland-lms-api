import weeklyReport from "./weeklyReport";
import { onAppStartScheduler } from "../utils/notification-manager/schedule-notifications";

const scheduler = () => {
  weeklyReport();
  onAppStartScheduler();
};

export default scheduler;
