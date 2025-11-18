# Task 4: Implement API Logic for Notification Scheduler

**File:** `xtcare-lms-new/api/notification-scheduler.ts`

## Task Details
Create comprehensive API functions and React Query hooks for the notification scheduler feature, following the existing API patterns in the project. This task establishes the data layer for managing notification schedulers with proper TypeScript types, error handling, and cache management.

## 🎯 **Objectives**
- **Create API functions** for all CRUD operations on notification schedulers
- **Implement React Query hooks** for efficient data fetching and caching
- **Follow existing patterns** from other API files in the project
- **Ensure type safety** with proper TypeScript integration
- **Provide consistent error handling** and response formatting

## 📁 **File Location**
```
xtcare-lms-new/
├── api/
│   ├── index.ts                           ← Update to export new API
│   └── notification-scheduler.ts          ← Create this file here
├── types/
│   └── notification-scheduler.types.ts    ← Types from Task 3
└── components/
    └── course-creation/
        └── notification-setup.tsx         ← Use API hooks here
```

## 🔧 **Implementation Steps**

### Step 1: Create API File
```bash
cd /Users/manthan/Desktop/Files/Projects/LMS-Xtcare/xtcare-lms-new/api
touch notification-scheduler.ts
```

### Step 2: Implement Core API Functions
```typescript
// Basic CRUD operations
export const fetchNotificationSchedulers = async (courseId: string, pagination: Pagination, filters?: NotificationSchedulerFilters)
export const fetchNotificationSchedulerById = async (id: string)
export const createNotificationScheduler = async (data: CreateNotificationSchedulerDto)
export const updateNotificationScheduler = async (id: string, data: UpdateNotificationSchedulerDto)
export const deleteNotificationScheduler = async (id: string)
export const toggleNotificationSchedulerStatus = async (id: string, active: boolean)
```

### Step 3: Implement React Query Hooks
```typescript
// Data fetching hooks
export const useFetchNotificationSchedulers = (courseId: string, pagination: Pagination, filters?: NotificationSchedulerFilters)
export const useFetchNotificationScheduler = (id: string)

// Mutation hooks
export const useCreateNotificationScheduler = ()
export const useUpdateNotificationScheduler = ()
export const useDeleteNotificationScheduler = ()
export const useToggleNotificationSchedulerStatus = ()
```

### Step 4: Update API Index
```typescript
// In api/index.ts
export * from './notification-scheduler';
```

## 📋 **Required API Functions**

### 1. **Data Fetching Functions**
```typescript
// Fetch paginated list of notification schedulers for a course
export const fetchNotificationSchedulers = async (
  courseId: string,
  pagination: Pagination,
  filters?: NotificationSchedulerFilters
): Promise<NotificationSchedulerListResponse>

// Fetch single notification scheduler by ID
export const fetchNotificationSchedulerById = async (
  id: string
): Promise<NotificationSchedulerResponse>
```

### 2. **Mutation Functions**
```typescript
// Create new notification scheduler
export const createNotificationScheduler = async (
  data: CreateNotificationSchedulerDto
): Promise<NotificationSchedulerResponse>

// Update existing notification scheduler
export const updateNotificationScheduler = async (
  id: string, 
  data: UpdateNotificationSchedulerDto
): Promise<NotificationSchedulerResponse>

// Delete notification scheduler
export const deleteNotificationScheduler = async (
  id: string
): Promise<{ success: boolean; message: string }>

// Toggle active status
export const toggleNotificationSchedulerStatus = async (
  id: string, 
  active: boolean
): Promise<NotificationSchedulerResponse>
```

### 3. **React Query Hooks**
```typescript
// Query hooks for data fetching
export const useFetchNotificationSchedulers = (courseId: string, pagination: Pagination, filters?: NotificationSchedulerFilters)
export const useFetchNotificationScheduler = (id: string)

// Mutation hooks for data changes
export const useCreateNotificationScheduler = ()
export const useUpdateNotificationScheduler = ()
export const useDeleteNotificationScheduler = ()
export const useToggleNotificationSchedulerStatus = ()
```

## 🔄 **API Response Handling**

### 1. **Success Responses**
```typescript
// List response
{
  success: true,
  data: NotificationScheduler[],
  total: number,
  limit: number,
  skip: number
}

// Single item response
{
  success: true,
  data: NotificationScheduler,
  message?: string
}
```

### 2. **Error Handling**
```typescript
try {
  const response = await apiClient.get(apiUrl, { params });
  return response.data;
} catch (error) {
  throw error; // Let React Query handle the error
}
```

## 🗄️ **Cache Management Strategy**

### 1. **Query Keys**
```typescript
// List queries
['notification-schedulers', courseId, pagination, filters]

// Single item queries
['notification-scheduler', id]
```

### 2. **Cache Invalidation**
```typescript
onSuccess: (data, variables) => {
  // Invalidate specific item
  queryClient.invalidateQueries({
    queryKey: ['notification-scheduler', variables.id]
  });
  
  // Invalidate list
  queryClient.invalidateQueries({
    queryKey: ['notification-schedulers']
  });
}
```

## 📝 **Usage Examples**

### 1. **Fetching Data**
```typescript
import { useFetchNotificationSchedulers } from '@/api';

const { data: notifications, isLoading, error } = useFetchNotificationSchedulers(
  courseId, 
  { page: 0, limit: 10 }, 
  { userType: 'student' }
);
```

### 2. **Creating Data**
```typescript
import { useCreateNotificationScheduler } from '@/api';

const createMutation = useCreateNotificationScheduler();

const handleCreate = async (formData: CreateNotificationSchedulerDto) => {
  try {
    await createMutation.mutateAsync(formData);
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```

### 3. **Updating Data**
```typescript
import { useUpdateNotificationScheduler } from '@/api';

const updateMutation = useUpdateNotificationScheduler();

const handleUpdate = async (id: string, data: UpdateNotificationSchedulerDto) => {
  try {
    await updateMutation.mutateAsync({ id, data });
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```

## ✅ **Success Criteria**
- [ ] API file created with all required functions
- [ ] React Query hooks implemented with proper cache management
- [ ] TypeScript types properly integrated
- [ ] Error handling consistent with existing API patterns
- [ ] API index updated to export new functions
- [ ] All functions follow existing project patterns
- [ ] Cache invalidation properly implemented
- [ ] Component can successfully use API hooks

## 🚨 **Common Issues & Solutions**

### Issue 1: Type Import Errors
**Problem**: API functions can't find notification scheduler types
**Solution**: Ensure types file is created first (Task 3) and properly imported

### Issue 2: React Query Hook Errors
**Problem**: Hooks not working or cache not updating
**Solution**: Verify query keys match between mutations and queries, check cache invalidation

### Issue 3: API Endpoint Mismatch
**Problem**: Frontend API calls don't match backend endpoints
**Solution**: Ensure API URLs match backend routes exactly

## 🔗 **Related Files**
- **Types**: `xtcare-lms-new/types/notification-scheduler.types.ts` (Task 3)
- **Component**: `xtcare-lms-new/components/course-creation/notification-setup.tsx`
- **Backend API**: `xtcare-lms-api/src/routes/notification-scheduler.routes.ts`
- **Main Doc**: `xtcare-lms-api/docs/notification-scheduler/notification-scheduler-feature.md`

## 📚 **References**
- **Types Task**: [Task 3: Create Frontend Types](../task3-create-frontend-types.md)
- **Backend API**: [Task 2: Implement Types in Service](../task2-implement-types-in-service.md)
- **React Query**: [Official Documentation](https://tanstack.com/query/latest)
- **Existing API Pattern**: `xtcare-lms-new/api/courses.ts`

## 🔄 **Complete Implementation Code**

```typescript:xtcare-lms-new/api/notification-scheduler.ts
import { AxiosResponse } from 'axios';
import { apiClient } from '@/api/axiosInstances/authAxiosInstance';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  NotificationScheduler, 
  NotificationSchedulerResponse, 
  NotificationSchedulerListResponse,
  CreateNotificationSchedulerDto,
  UpdateNotificationSchedulerDto,
  NotificationSchedulerFilters,
  Pagination
} from '@/types/notification-scheduler.types';

// ===== API Functions =====

// Fetch notification schedulers for a course
export const fetchNotificationSchedulers = async (
  courseId: string,
  pagination: Pagination,
  filters?: NotificationSchedulerFilters
): Promise<NotificationSchedulerListResponse> => {
  try {
    const apiUrl = `notification-schedulers`;
    const response = await apiClient.get(apiUrl, {
      params: {
        courseId,
        limit: pagination.limit,
        skip: pagination.page * pagination.limit,
        ...filters
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Fetch single notification scheduler by ID
export const fetchNotificationSchedulerById = async (id: string): Promise<NotificationSchedulerResponse> => {
  try {
    const apiUrl = `notification-schedulers/${id}`;
    const response = await apiClient.get(apiUrl);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Create new notification scheduler
export const createNotificationScheduler = async (
  data: CreateNotificationSchedulerDto
): Promise<NotificationSchedulerResponse> => {
  try {
    const apiUrl = `notification-schedulers`;
    const response = await apiClient.post(apiUrl, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Update notification scheduler
export const updateNotificationScheduler = async (
  id: string, 
  data: UpdateNotificationSchedulerDto
): Promise<NotificationSchedulerResponse> => {
  try {
    const apiUrl = `notification-schedulers/${id}`;
    const response = await apiClient.patch(apiUrl, data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Delete notification scheduler
export const deleteNotificationScheduler = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const apiUrl = `notification-schedulers/${id}`;
    const response = await apiClient.delete(apiUrl);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Toggle notification scheduler active status
export const toggleNotificationSchedulerStatus = async (
  id: string, 
  active: boolean
): Promise<NotificationSchedulerResponse> => {
  try {
    const apiUrl = `notification-schedulers/${id}/toggle-status`;
    const response = await apiClient.patch(apiUrl, { active });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// ===== React Query Hooks =====

// Hook to fetch notification schedulers
export const useFetchNotificationSchedulers = (
  courseId: string,
  pagination: Pagination,
  filters?: NotificationSchedulerFilters
) => {
  return useQuery({
    queryKey: ['notification-schedulers', courseId, pagination, filters],
    queryFn: () => fetchNotificationSchedulers(courseId, pagination, filters),
    enabled: !!courseId,
  });
};

// Hook to fetch single notification scheduler
export const useFetchNotificationScheduler = (id: string) => {
  return useQuery({
    queryKey: ['notification-scheduler', id],
    queryFn: () => fetchNotificationSchedulerById(id),
    enabled: !!id,
  });
};

// Hook to create notification scheduler
export const useCreateNotificationScheduler = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createNotificationScheduler,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['notification-schedulers', variables.courseId]
      });
    },
  });
};

// Hook to update notification scheduler
export const useUpdateNotificationScheduler = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNotificationSchedulerDto }) =>
      updateNotificationScheduler(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['notification-scheduler', variables.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['notification-schedulers']
      });
    },
  });
};

// Hook to delete notification scheduler
export const useDeleteNotificationScheduler = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteNotificationScheduler,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['notification-schedulers']
      });
    },
  });
};

// Hook to toggle notification scheduler status
export const useToggleNotificationSchedulerStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      toggleNotificationSchedulerStatus(id, active),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['notification-scheduler', variables.id]
      });
      queryClient.invalidateQueries({
        queryKey: ['notification-schedulers']
      });
    },
  });
};
```

This task completes the data layer implementation, providing a robust API interface for the notification scheduler feature that integrates seamlessly with the existing project architecture. 