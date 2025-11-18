# Task 2: Integrate Publish Changes API in Frontend

## 📝 Summary
Integrate the new publish changes API endpoint into the frontend publish page (`page.tsx`) with proper TypeScript types, organized component structure, and enhanced UX for different change types. This task includes adding request/response types, implementing API integration, handling different course states, and creating reusable components for rendering text and media changes.

## 🎯 Detailed Requirements

### Step 1: Add TypeScript Types to Frontend

#### Add to `ryland-lms/lib/types/courses.ts`
<frontend_publish_types>
```typescript
// Publish Changes API Types
export type CoursePublishChange = 
  | {
      type: "text";
      change: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }
  | {
      type: "media";
      change: string;
      field: string;
      oldValue: MediaUpload | null;
      newValue: MediaUpload | null;
    };

export type LessonPublishChange = 
  | {
      type: "text";
      change: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
      moduleName: string;
      lessonName: string;
    }
  | {
      type: "media";
      change: string;
      field: string;
      oldValue: MediaUpload | null;
      newValue: MediaUpload | null;
      moduleName: string;
      lessonName: string;
    };

// Request Parameters for Publish Changes API
export interface IPublishChangesParams {
  courseId: string; // From URL parameter
}

// Response Types for Publish Changes API
export type IPublishChangesResponse = 
  | {
      coursePublished: true;
      hasChanges: true;
      changesByCategory: {
        details: CoursePublishChange[];
        lessons: LessonPublishChange[];
        certificate: CoursePublishChange[];
      };
    }
  | {
      coursePublished: true;
      hasChanges: false;
    }
  | {
      coursePublished: false;
      hasChanges: false;
    };

// API Request Function Type
export interface IPublishChangesRequest {
  courseId: string;
}

// Enhanced Change Item for UI Display
export type UIChangeItem = 
  | {
      id: string;
      change: string;
      type: "text";
      field: string;
      oldValue: string | null;
      newValue: string | null;
      moduleName?: string; // For lesson changes
      lessonName?: string; // For lesson changes
    }
  | {
      id: string;
      change: string;
      type: "media";
      field: string;
      oldValue: MediaUpload | null;
      newValue: MediaUpload | null;
      moduleName?: string; // For lesson changes
      lessonName?: string; // For lesson changes
    };

// Category Configuration for UI
export interface ChangeCategoryConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
}
```
</frontend_publish_types>

### Step 2: API Integration Architecture

#### API Service Structure
- **Location**: `ryland-lms/lib/api/courses.ts`
- **Function**: `getPublishChanges(courseId: string): Promise<IPublishChangesResponse>`
- **Method**: PATCH request to `/api/courses/:courseId` with `controller: "get-publish-changes"`
- **Error Handling**: Proper error boundaries and user feedback
- **Loading States**: Show loading spinners during API calls

#### API Integration Implementation Plan
```typescript
// In ryland-lms/lib/api/courses.ts
export async function getPublishChanges(courseId: string): Promise<IPublishChangesResponse> {
  // Implementation details:
  // - PATCH request with controller parameter
  // - Proper error handling
  // - TypeScript response validation
  // - Loading state management
}
```

### Step 3: Enhanced Page Component Structure

#### Main Page Component (`page.tsx`) Enhancements
- **State Management**: 
  - `publishChangesData: IPublishChangesResponse | null`
  - `isLoading: boolean`
  - `error: string | null`
  - `expandedCategories: Record<string, boolean>`
  - `expandedChanges: Record<string, boolean>`

- **Effects**: 
  - `useEffect` to fetch publish changes on component mount
  - Error boundary for API failures
  - Loading state management

- **Component Organization**:
  - Main container component
  - Separate sub-components for different change categories
  - Reusable change item components

### Step 4: Course State Handling

#### Case 1: Course Not Published
```typescript
// When coursePublished: false, hasChanges: false
interface UnpublishedCourseState {
  message: "Your course is not published yet";
  actionButton: "Publish Course";
  description: "This is your first publication. All course content will be made available to students.";
  icon: AlertCircle;
  buttonAction: () => void; // Navigate to actual publish endpoint
}
```

#### Case 2: Course Published, No Changes
```typescript
// When coursePublished: true, hasChanges: false
interface NoChangesState {
  message: "No changes to publish";
  description: "Your course is up to date with the published version.";
  icon: CheckCircle;
  lastPublished: Date; // Show when last published
}
```

#### Case 3: Course Published, Has Changes
```typescript
// When coursePublished: true, hasChanges: true
interface HasChangesState {
  changesByCategory: {
    details: CoursePublishChange[];
    lessons: LessonPublishChange[];
    certificate: CoursePublishChange[];
  };
  actionButton: "Publish Changes";
  buttonAction: () => void; // Actual publish action
}
```

### Step 5: Component Organization for Better Code Management

#### Change Category Components
Create separate components for each category to improve maintainability:

##### 1. `DetailsChanges.tsx`
```typescript
interface DetailsChangesProps {
  changes: CoursePublishChange[];
  isExpanded: boolean;
  onToggle: () => void;
  onChangeToggle: (changeId: string) => void;
  expandedChanges: Record<string, boolean>;
}
```

##### 2. `LessonsChanges.tsx`
```typescript
interface LessonsChangesProps {
  changes: LessonPublishChange[];
  isExpanded: boolean;
  onToggle: () => void;
  onChangeToggle: (changeId: string) => void;
  expandedChanges: Record<string, boolean>;
}
```

##### 3. `CertificateChanges.tsx`
```typescript
interface CertificateChangesProps {
  changes: CoursePublishChange[];
  isExpanded: boolean;
  onToggle: () => void;
  onChangeToggle: (changeId: string) => void;
  expandedChanges: Record<string, boolean>;
}
```

### Step 6: Reusable Change Type Components

#### Text Change Component
```typescript
interface TextChangeProps {
  change: UIChangeItem;
  isExpanded: boolean;
  onToggle: () => void;
  categoryConfig: ChangeCategoryConfig;
}

// Features:
// - Text icon (Type, Edit, FileText)
// - Old vs New value comparison
// - Expandable details view
// - Proper color coding
```

#### Media Change Component
```typescript
interface MediaChangeProps {
  change: UIChangeItem;
  isExpanded: boolean;
  onToggle: () => void;
  categoryConfig: ChangeCategoryConfig;
  onMediaPreview: (mediaUrl: string, mediaType: "video" | "pdf", title: string) => void;
}

// Features:
// - Media icons (Video, Image, FileText, Download)
// - Clickable media preview
// - File type detection
// - Media metadata display
```

### Step 7: Media Preview Integration

#### LessonMediaPreview Integration
```typescript
// Enhanced media preview state
interface MediaPreviewState {
  isOpen: boolean;
  mediaUrl: string;
  mediaType: "video" | "pdf";
  title: string;
  description?: string; // Not used as per requirements
}

// Usage in media changes:
// - Title: lesson name for lesson changes, field name for course changes
// - Description: pass empty string or undefined
// - Auto-detect media type from file extension or MIME type
```

#### Media Type Detection Logic
```typescript
function getMediaTypeFromUpload(mediaUpload: MediaUpload): "video" | "pdf" {
  // Logic to determine media type from:
  // - fileType property
  // - fileName extension
  // - objectUrl analysis
}

function getMediaTitle(change: UIChangeItem): string {
  // For lesson changes: return lessonName
  // For course/certificate changes: return field name
  // Fallback: return change description
}
```

### Step 8: Enhanced User Experience Features

#### Change Type Icons
```typescript
const ChangeTypeIcons = {
  text: {
    icon: Type,
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  media: {
    icon: Image,
    color: "text-purple-600", 
    bgColor: "bg-purple-100"
  }
};
```

#### Loading States
- **Initial Load**: Skeleton components for change categories
- **Media Preview**: Loading spinner in dialog
- **Publish Action**: Button loading state with progress

#### Error Handling
- **API Errors**: Toast notifications with retry options
- **Media Preview Errors**: Fallback error state in dialog
- **Network Issues**: Offline indicator and retry mechanisms

### Step 9: File Structure Organization

#### New Component Files to Create
```
ryland-lms/components/publish/
├── PublishChangesContainer.tsx      // Main container
├── CourseStateHandler.tsx           // Handles different course states
├── ChangesCategoryList.tsx          // Categories overview
├── changes/
│   ├── DetailsChanges.tsx          // Details category
│   ├── LessonsChanges.tsx          // Lessons category
│   ├── CertificateChanges.tsx      // Certificate category
│   ├── TextChangeItem.tsx          // Text change component
│   ├── MediaChangeItem.tsx         // Media change component
│   └── ChangeItemDetails.tsx       // Expandable details
├── states/
│   ├── UnpublishedState.tsx        // Not published state
│   ├── NoChangesState.tsx          // No changes state
│   └── PublishingState.tsx         // Publishing progress
└── hooks/
    ├── usePublishChanges.tsx       // API integration hook
    ├── useMediaPreview.tsx         // Media preview logic
    └── usePublishState.tsx         // Publishing state management
```

#### Modified Files
```
ryland-lms/
├── lib/types/courses.ts            // Add new types
├── lib/api/courses.ts              // Add API function
├── app/author/courses/[courseId]/publish/page.tsx  // Main integration
└── components/lesson/LessonMediaPreview.tsx        // Minor enhancements
```

### Step 10: Implementation Priority and Dependencies

#### Phase 1: Core Integration
1. Add TypeScript types to `courses.ts`
2. Create API service function
3. Update main page component with basic API integration
4. Implement course state handling (Cases 1, 2, 3)

#### Phase 2: Component Organization  
1. Extract change category components
2. Create reusable text/media change components
3. Implement expandable details functionality

#### Phase 3: Media Preview Enhancement
1. Integrate LessonMediaPreview component
2. Add media type detection logic
3. Implement clickable media previews
4. Add proper title handling

#### Phase 4: UX Enhancements
1. Add loading states and skeletons
2. Implement error handling and retries  
3. Add change type icons and visual indicators
4. Polish responsive design and accessibility

### Step 11: Testing Strategy

#### Unit Tests Required
- API service function testing
- Change type detection logic
- Media type determination
- Component state management

#### Integration Tests Required  
- Full publish page workflow
- Media preview functionality
- Different course state scenarios
- Error handling flows

#### Manual Testing Scenarios
- Unpublished course flow
- Published course with no changes
- Published course with mixed change types
- Media preview interactions
- Mobile responsive behavior

## 🔗 Integration Points
- Backend API endpoint from Task 1
- Existing LessonMediaPreview component
- Current publish page layout and styling
- Course management workflow

## 📝 Key Technical Considerations
1. **Type Safety**: Strict TypeScript implementation with proper type guards
2. **Performance**: Lazy loading for media previews and change details
3. **Accessibility**: Proper ARIA labels and keyboard navigation
4. **Responsive Design**: Mobile-first approach for all new components
5. **Error Boundaries**: Graceful degradation for API failures
6. **State Management**: Efficient state updates and re-renders
7. **Code Reusability**: Shared components across different change types
8. **Maintainability**: Clear separation of concerns and modular architecture 