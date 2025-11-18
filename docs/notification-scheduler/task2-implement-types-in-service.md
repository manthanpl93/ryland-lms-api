# Task 2: Implement Types in Notification Scheduler Service

**File:** `src/services/notification-scheduler/notification-scheduler.class.ts`

## Task Details
Update the notification scheduler service class to use the comprehensive TypeScript types created in Task 1, replacing all `any` types with proper type definitions.

## Required Changes

### 1. **Import the New Types**

```typescript:xtcare-lms-api/src/services/notification-scheduler/notification-scheduler.class.ts
import { Service, MongooseServiceOptions } from "feathers-mongoose";
import { Application } from "../../declarations";
import createApplication from "@feathersjs/feathers";
import createScheduledNotificationLogsModel from "../../models/scheduled-notification-logs.model";
import createApprovedCoursesModel from "../../models/approved-courses.model";
import {
  addNewNotificationSchedule,
  removeScheduleOfNotification,
  updateNotificationSchedule,
} from "../../utils/notification-manager";
import moment from "moment-timezone";
import configuration from "@feathersjs/configuration";
import app from "../../app";
import { NotFound } from "@feathersjs/errors";
import {
  NOTIFICATION_CONSTANT_TEXT,
  NotificationConstants,
} from "../../utils/constants";
// Add these new type imports
import {
  NotificationScheduler as NotificationSchedulerType,
  NotificationSchedulerResponse,
  NotificationSchedulerWithPopulatedFields,
  CourseNotificationsResponse,
  CourseNotificationsQuery
} from "../../types/notification-scheduler.types";

const { userTimeZone: USER_TZ = "America/New_York" } = configuration()();
```

### 2. **Add Query Interface**

```typescript:xtcare-lms-api/src/services/notification-scheduler/notification-scheduler.class.ts
export class NotificationScheduler extends Service {
  //eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(options: Partial<MongooseServiceOptions>, app: Application) {
    super(options);
  }

  // Add this interface after the constructor
  interface CourseNotificationsQuery {
    courseId: string;
    limit?: number;
    skip?: number;
    searchText?: string | null;
  }
```

### 3. **Update CRUD Method Return Types**

```typescript:xtcare-lms-api/src/services/notification-scheduler/notification-scheduler.class.ts
  async create(
    data: Partial<NotificationSchedulerType> | Partial<NotificationSchedulerType>[],
    params?: createApplication.Params | undefined,
  ): Promise<NotificationSchedulerResponse | NotificationSchedulerResponse[]> {
    try {
      const result = await super.create(data, params);
      
      // Handle both single and array cases
      if (Array.isArray(result)) {
        result.forEach(item => addNewNotificationSchedule(item));
      } else {
        addNewNotificationSchedule(result);
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async get(
    id: createApplication.Id,
    params?: createApplication.Params | undefined,
  ): Promise<NotificationSchedulerResponse> {
    try {
      return super.get(id, params);
    } catch (error) {
      throw error;
    }
  }

  async patch(
    id: createApplication.NullableId,
    data: Partial<NotificationSchedulerType>,
    params?: createApplication.Params | undefined,
  ): Promise<NotificationSchedulerResponse> {
    try {
      const result = await super.patch(id, data, params);
      updateNotificationSchedule(result);
      return result;
    } catch (error) {
      throw error;
    }
  }
```

### 4. **Update Find Method Return Type**

```typescript:xtcare-lms-api/src/services/notification-scheduler/notification-scheduler.class.ts
  async find(
    params?: createApplication.Params | undefined,
  ): Promise<NotificationSchedulerResponse[] | CourseNotificationsResponse | any> {
    const { controller }: any = params?.query;

    if (controller) {
      switch (controller) {
      case "course-notifications":
        return await this.fetchCourseNotifications(params?.query as CourseNotificationsQuery);
      default:
        return await super.find(params);
      }
    }
  }
```

### 5. **Update Helper Method Return Types**

```typescript:xtcare-lms-api/src/services/notification-scheduler/notification-scheduler.class.ts
  async fetchCourseNotifications(data: CourseNotificationsQuery): Promise<CourseNotificationsResponse> {
    const { courseId, limit = 10, skip = 1, searchText = null } = data;

    let searchQuery: any = {};

    if (searchText) {
      const rgx = (pattern: string) => new RegExp(`.*${pattern}.*`);
      const searchRgx = rgx(searchText);

      searchQuery = { name: { $regex: searchRgx, $options: "i" } };
    }

    const notifications: NotificationSchedulerWithPopulatedFields[] = await this.Model.find({
      courseId,
      ...searchQuery,
    })
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "_id name lastName email")
      .sort({ createdAt: -1 })
      .lean();

    return {
      data: notifications,
      total: await this.Model.countDocuments({ courseId }),
    };
  }

  async fetchSchedulerNotifications(): Promise<NotificationSchedulerResponse[]> {
    const scheduledNotifications: NotificationSchedulerResponse[] = await this.Model.find({
      active: true,
      schedule: {
        $exists: true,
      },
    }).lean();

    const activeNotifications: NotificationSchedulerResponse[] = [];
    
    for (const notification of scheduledNotifications) {
      let scheduleThisNotification = false;
      const { schedule } = notification;

      if (schedule?.dates?.length) {
        // ... existing logic for dates remains the same ...
      } else if (schedule?.recurring) {
        // ... existing logic for recurring remains the same ...
      }

      if (scheduleThisNotification) {
        activeNotifications.push(notification);
      }
    }

    return activeNotifications;
  }
```

## Key Changes Summary

1. **Type Imports**: Added comprehensive type imports from the types file
2. **Query Interface**: Added `CourseNotificationsQuery` interface for type safety
3. **CRUD Methods**: Updated all CRUD methods with proper return types
4. **Find Method**: Updated to handle course notifications with proper typing
5. **Helper Methods**: Updated return types for `fetchCourseNotifications` and `fetchSchedulerNotifications`
6. **Array Handling**: Added proper handling for both single and bulk create operations

## Benefits of These Changes

1. **Type Safety**: Compile-time checking prevents runtime errors
2. **IntelliSense**: Better autocomplete and documentation in IDEs
3. **API Consistency**: Clear contracts for what data structures are expected
4. **Refactoring Safety**: TypeScript will catch breaking changes
5. **Business Logic Preservation**: All notification type constraints are maintained

## Implementation Steps

1. **Update Imports**: Add the new type imports at the top of the file
2. **Add Query Interface**: Insert the `CourseNotificationsQuery` interface
3. **Update Method Signatures**: Change return types for all CRUD and helper methods
4. **Test Type Safety**: Ensure all type errors are resolved
5. **Verify Functionality**: Test that the service still works as expected

## File Location
- **Path**: `xtcare-lms-api/src/services/notification-scheduler/notification-scheduler.class.ts`
- **Type**: Service class implementation
- **Purpose**: Replace `any` types with comprehensive type definitions for better type safety 