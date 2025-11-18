# Task 5: Update Notification Setup Component

**File:** `xtcare-lms-new/components/course-creation/notification-setup.tsx`

## Task Details
Transform the notification setup component to use the comprehensive types from Task 3 and API functions from Task 4, eliminating all generic types, mock data, and duplicate functionality while maintaining the existing user experience.

## 🎯 **Objectives**
- **Replace generic types** with `NotificationScheduler` discriminated union types
- **Integrate real API calls** using React Query hooks from Task 4
- **Eliminate all `any` types** and implement proper type safety
- **Remove duplicate functionality** completely
- **Maintain existing UI/UX** while improving type safety and data management

## 📁 **File Location**
```
xtcare-lms-new/
├── components/
│   └── course-creation/
│       └── notification-setup.tsx         ← Update this file
├── types/
│   └── notification-scheduler.types.ts    ← Types from Task 3
└── api/
    └── notification-scheduler.ts          ← API from Task 4
```

## 🔧 **Implementation Steps**

### Step 1: Import Types and API Hooks
```typescript
// Replace generic imports with proper types
import { 
  NotificationScheduler, 
  NotificationConstants,
  NotificationType,
  UserType 
} from '@/types/notification-scheduler.types'

// Import API hooks
import { 
  useFetchNotificationSchedulers,
  useCreateNotificationScheduler,
  useUpdateNotificationScheduler,
  useDeleteNotificationScheduler
} from '@/api'
```

### Step 2: Replace Generic Interface
```typescript
// ❌ Remove this generic interface:
interface Notification {
  id: string
  name: string
  description: string
  type: "student" | "author" | null
  category: string
  status: "active" | "draft"
  locations: string[]
  channels: string[]
  createdAt: string
  config?: any
}

// ✅ Use proper types from Task 3:
const [notifications, setNotifications] = useState<NotificationScheduler[]>([])
```

### Step 3: Update State Management
```typescript
// Replace generic state types
const [editingNotification, setEditingNotification] = useState<NotificationScheduler | null>(null)

// Remove duplicate-related state
// ❌ Remove: const [duplicateNotification, setDuplicateNotification] = useState<...>()
```

### Step 4: Integrate React Query Hooks
```typescript
// Replace mock data with real API calls
const { data: notifications, isLoading, error } = useFetchNotificationSchedulers(
  courseId, 
  pagination, 
  filters
)

// Add mutation hooks
const createMutation = useCreateNotificationScheduler()
const updateMutation = useUpdateNotificationScheduler()
const deleteMutation = useDeleteNotificationScheduler()
```

### Step 5: Remove Duplicate Functionality
```typescript
// ❌ Remove these functions completely:
const handleDuplicateNotification = (notification: Notification) => { ... }
const duplicateNotification = async (id: string) => { ... }

// ❌ Remove duplicate button from UI:
<Button onClick={() => handleDuplicateNotification(notification)}>
  <Copy className="w-4 h-4" />
</Button>
```

### Step 6: Update Function Signatures
```typescript
// Replace generic parameters with proper types
const handleEditNotification = (notification: NotificationScheduler) => {
  // TypeScript now knows the exact notification type
  if (notification.userType === 'student' && 
      notification.notificationType === NotificationConstants.STUDENT_NOTIFICATION_TYPES.WELCOME) {
    setEditingNotification(notification)
    setShowConfig(true)
  }
}
```

## 🔄 **Specific Component Changes**

### 1. **Type System Overhaul**
```typescript
// Before:
type NotificationType = "student" | "author" | null
type NotificationOption = string | null

// After:
import { NotificationType, UserType } from '@/types/notification-scheduler.types'

// Use constants instead of string literals:
if (notification.notificationType === NotificationConstants.STUDENT_NOTIFICATION_TYPES.WELCOME)
```

### 2. **API Integration**
```typescript
// Before: Mock data with local state
const [notifications, setNotifications] = useState<Notification[]>([...])

// After: Real API with React Query
const { data: notifications, isLoading, error } = useFetchNotificationSchedulers(
  courseId, 
  { page: 0, limit: 10 }, 
  undefined
)

// Replace local state updates with API mutations:
const handleDeleteNotification = async (id: string) => {
  try {
    await deleteMutation.mutateAsync(id)
    // Success handling - no need to manually update state
  } catch (error) {
    // Error handling
  }
}
```

### 3. **Form Handling with Type Safety**
```typescript
// Before: any types
const handleConfigSave = (formValues: any) => { ... }

// After: Proper types
const handleConfigSave = (formValues: WelcomeNotificationConfig | CompletionNotificationConfig) => {
  if (editingNotification?.notificationType === NotificationConstants.STUDENT_NOTIFICATION_TYPES.WELCOME) {
    // TypeScript knows this is a WelcomeNotification
    const updatedNotification: WelcomeNotification = {
      ...editingNotification,
      name: formValues.notificationName,
      // ... other typed fields
    }
    updateMutation.mutate({ id: editingNotification._id!, data: updatedNotification })
  }
}
```

### 4. **Type Guards Implementation**
```typescript
// Add type guards for different notification types
const isWelcomeNotification = (notification: NotificationScheduler): notification is WelcomeNotification => {
  return notification.notificationType === NotificationConstants.STUDENT_NOTIFICATION_TYPES.WELCOME
}

const isCompletionNotification = (notification: NotificationScheduler): notification is CompletionNotification => {
  return notification.notificationType === NotificationConstants.STUDENT_NOTIFICATION_TYPES.COMPLETION
}

// Use in component logic
if (isWelcomeNotification(editingNotification)) {
  // TypeScript knows this is WelcomeNotification
  console.log(editingNotification.schedule) // This will be 'never' - correct!
}
```

## 🗑️ **Remove Duplicate Functionality**

### **Functions to Remove:**
```typescript
// ❌ Remove completely:
const handleDuplicateNotification = (notification: Notification) => { ... }
const duplicateNotification = async (id: string) => { ... }
```

### **UI Elements to Remove:**
```typescript
// ❌ Remove from actions section:
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleDuplicateNotification(notification)}
  className="h-8 px-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
>
  <Copy className="w-4 h-4" />
</Button>
```

### **State Variables to Remove:**
```typescript
// ❌ Remove if they exist:
const [duplicateNotification, setDuplicateNotification] = useState<...>()
```

## ✅ **Success Criteria**

- [ ] All generic types replaced with `NotificationScheduler` types
- [ ] Mock data replaced with API calls using React Query hooks
- [ ] Duplicate functionality completely removed
- [ ] All `any` types eliminated
- [ ] Constants used instead of string literals
- [ ] Type-safe form handling implemented
- [ ] Proper error handling and loading states
- [ ] Component compiles without TypeScript errors
- [ ] All CRUD operations work with real API
- [ ] Type guards properly implemented for different notification types

## 🔄 **Component Flow After Changes**

1. **Load**: Component fetches notifications via `useFetchNotificationSchedulers`
2. **Create**: Uses `useCreateNotificationScheduler` hook
3. **Edit**: Uses `useUpdateNotificationScheduler` hook  
4. **Delete**: Uses `useDeleteNotificationScheduler` hook
5. **Configure**: Uses existing configuration components (no changes for now)
6. **Validate**: All data validated against proper TypeScript interfaces

## 📝 **Note on Configuration Components**

**Configuration Components will be updated in a separate task** - this task focuses only on:
- Type system integration
- API integration  
- State management updates
- Duplicate functionality removal

The existing configuration components will continue to work as-is until they are updated in their dedicated task.

## 🚨 **Common Issues & Solutions**

### Issue 1: Type Import Errors
**Problem**: Component can't find notification scheduler types
**Solution**: Ensure Task 3 is completed and types file exists

### Issue 2: API Hook Errors
**Problem**: React Query hooks not working
**Solution**: Ensure Task 4 is completed and API file exists

### Issue 3: Type Mismatch
**Problem**: Component types don't match API response types
**Solution**: Verify types from Task 3 match API response structure

## 🔗 **Related Files**
- **Types**: `xtcare-lms-new/types/notification-scheduler.types.ts` (Task 3)
- **API**: `xtcare-lms-new/api/notification-scheduler.ts` (Task 4)
- **Component**: `xtcare-lms-new/components/course-creation/notification-setup.tsx`
- **Main Doc**: `xtcare-lms-api/docs/notification-scheduler/notification-scheduler-feature.md`

## 📚 **References**
- **Types Task**: [Task 3: Create Frontend Types](../task3-create-frontend-types.md)
- **API Task**: [Task 4: Implement API Logic](../task4-implement-api-logic.md)
- **TypeScript Discriminated Unions**: [Official Documentation](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)

## 🎯 **Expected Outcome**

After completing this task, the `notification-setup.tsx` component will be:
- **Fully type-safe** with no `any` types
- **Connected to real APIs** instead of mock data
- **Clean and maintainable** without duplicate functionality
- **Properly integrated** with the notification scheduler type system
- **Ready for future enhancements** with proper TypeScript support

This transformation establishes the foundation for a robust, type-safe notification management system that can be easily extended and maintained. 