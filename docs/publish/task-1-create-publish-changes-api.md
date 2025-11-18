# Task 1: Create API Endpoint for Retrieving Course Publishing Changes

## 📝 Summary
Create a new API endpoint that compares the current course draft with the last published version and returns categorized changes. This endpoint will serve the frontend publish page by providing detailed information about what content has been modified, enabling course authors to review changes before publishing.

## 🎯 Detailed Requirements

### API Endpoint Specification
- **Endpoint**: `PATCH /api/courses/:courseId` with `controller: "get-publish-changes"`
- **Authentication**: Required (course authors/owners only)
- **Response Format**: JSON with categorized changes
- **Integration**: Extend existing `checkCourseChanges` method in `courses.class.ts`
- **Method Enhancement**: Add detailed change analysis to current hash comparison logic

### TypeScript Interface Definitions
<publish_changes_types>
```typescript
// Media Upload interface (should already exist in courses.types.ts)
interface MediaUpload {
  status: "pending" | "started" | "uploading" | "finished" | "error";
  objectUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

// Change Types
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

// Request Parameters
export interface IPublishChangesParams {
  courseId: string; // From URL parameter
}

// Response Types
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
```
</publish_changes_types>

### Expected Response Structure

**Case 1: Course is Published and Has Changes**
<publish_changes_response_example>
```json
{
  "coursePublished": true,
  "hasChanges": true,
  "changesByCategory": {
    "details": [
      {
        "type": "text",
        "change": "Updated course title from 'React Basics' to 'React Fundamentals'",
        "field": "Course Title",
        "oldValue": "React Basics",
        "newValue": "React Fundamentals"
      },
      {
        "type": "media",
        "change": "Updated course thumbnail image",
        "field": "Course Image",
        "oldValue": "https://example.com/old-image.jpg",
        "newValue": "https://example.com/new-image.jpg"
      }
    ],
    "lessons": [
      {
        "type": "media",
        "change": "Module 1 - Lesson 3: Advanced Hooks - Added new video content",
        "field": "Lesson Video",
        "oldValue": null,
        "newValue": "https://example.com/video-url.mp4",
        "moduleName": "Module 1: React Fundamentals",
        "lessonName": "Lesson 3: Advanced Hooks"
      },
      {
        "type": "text",
        "change": "Module 2 - Lesson 1: State Management - Updated lesson description",
        "field": "Lesson Description",
        "oldValue": "Basic state concepts",
        "newValue": "Comprehensive state management including hooks and context",
        "moduleName": "Module 2: Advanced Topics",
        "lessonName": "Lesson 1: State Management"
      }
    ],
    "certificate": [
      {
        "type": "text",
        "change": "Updated certificate title text",
        "field": "Certificate Title",
        "oldValue": "Certificate of Completion",
        "newValue": "Certificate of Achievement in React Fundamentals"
      },
      {
        "type": "media",
        "change": "Updated certificate logo",
        "field": "Certificate Logo",
        "oldValue": "https://example.com/old-logo.png",
        "newValue": "https://example.com/new-logo.png"
      }
    ]
  }
}
```
</publish_changes_response_example>

**Case 2: Course is Not Yet Published**
```json
{
  "coursePublished": false,
  "hasChanges": false
}
```

**Case 3: Course is Published but No Changes**
```json
{
  "coursePublished": true,
  "hasChanges": false
}
```

### Core Logic Requirements
1. **Publication Status Check**: First determine if course has been published before
   - Check if approved course exists in `approved-courses` collection
   - Set `coursePublished: true/false` accordingly

2. **Course Comparison**: Compare current course document with approved course version
   - **If not published**: Return `coursePublished: false, hasChanges: false` (no `changesByCategory`)
   - **If published**: Compare draft vs approved versions

3. **Change Detection**: Identify differences in:
   - Course details (title, description, category, learnings, images)
   - Lesson content (outline structure, videos, assessments, descriptions)
   - Certificate configuration (title, logo, settings)

4. **Change Categorization**: Group changes into logical categories:
   - `details`: Course metadata changes
   - `lessons`: Content and structure changes (always include module and lesson names)
   - `certificate`: Certificate configuration changes

5. **Change Type Classification**: Each change must include a type:
   - `text`: For textual content changes (titles, descriptions, text fields)
   - `media`: For media URL changes (images, videos, audio files)

6. **Lesson Change Format**: All lesson changes must include:
   - `moduleName`: The name of the module containing the lesson
   - `lessonName`: The specific lesson name
   - Change description format: "Module X - Lesson Y: [Lesson Name] - [Description of change]"

### Technical Implementation

#### Method Enhancement Strategy
The existing `checkCourseChanges` method currently returns:
```typescript
{
  hasChanges: boolean;
  canPublish: boolean;
  message: string;
}
```

**Changes to implement:**
1. **Add Controller Case**: Add `"get-publish-changes"` case to the existing controller switch in `patch` method
2. **Enhance Return Type**: Extend method to optionally return detailed change analysis
3. **Backward Compatibility**: Keep existing simple response for current callers
4. **New Response Mode**: When `controller: "get-publish-changes"`, return detailed categorized changes

#### Implementation Steps
- **Extend Existing Method**: Modify `checkCourseChanges` to accept optional parameter for detailed analysis
- **Hash Comparison First**: Use existing `courseHash` comparison logic for initial change detection
- **Deep Comparison**: When changes detected and detailed analysis requested, perform field-by-field comparison
- **Change Categorization**: Group detected changes into `details`, `lessons`, and `certificate` categories
- **Human-Readable Descriptions**: Generate meaningful change descriptions with old/new values
- **Type Integration**: Add all TypeScript interfaces to `ryland-lms-api/src/types/courses.types.ts`
- **Response Type**: Use `IPublishChangesResponse` union type for strict type safety

#### File Organization
All helper functions should be organized in a separate library file:
- **Library File**: `ryland-lms-api/src/services/courses/publish-lib.ts`
- **Main Service**: `ryland-lms-api/src/services/courses/courses.class.ts`

#### Enhanced Method Code Snippet

**In courses.class.ts:**
```typescript
import { 
  analyzeDetailedChanges,
  compareCourseDetails,
  compareLessons,
  compareCertificateDetails 
} from './publish-lib';

// Add to courses.class.ts patch method controller switch
case "get-publish-changes":
  return await this.getPublishChanges(id, params);

// Enhanced checkCourseChanges method
async getPublishChanges(courseId: string, params?: any): Promise<IPublishChangesResponse> {
  try {
    // Fetch the main course
    const course: any = await createCoursesModel(this.app)
      .findById(courseId)
      .lean();

    if (!course) {
      throw new BadRequest("Course not found");
    }

    // Check if course has been published before
    const approvedCourse: any = await this.approvedCoursesModel
      .findOne({ mainCourse: courseId })
      .lean();

    // Case 1: Course not yet published
    if (!approvedCourse) {
      return {
        coursePublished: false,
        hasChanges: false
      };
    }

    // Case 2: Course published - compare hashes
    const hasChanges = course.courseHash !== approvedCourse.courseHash;
    
    if (!hasChanges) {
      // Case 3: No changes detected
      return {
        coursePublished: true,
        hasChanges: false
      };
    }

    // Case 4: Changes detected - perform detailed analysis
    const changesByCategory = await analyzeDetailedChanges(course, approvedCourse);
    
    return {
      coursePublished: true,
      hasChanges: true,
      changesByCategory
    };
  } catch (error) {
    throw error;
  }
}

```

**In publish-lib.ts:**
```typescript
import { CoursePublishChange, LessonPublishChange, MediaUpload } from '../../types/courses.types';

// Main analysis function for detailed change detection
export async function analyzeDetailedChanges(course: any, approvedCourse: any) {
  const changes = {
    details: [] as CoursePublishChange[],
    lessons: [] as LessonPublishChange[],
    certificate: [] as CoursePublishChange[]
  };

  // Compare course details
  const detailChanges = compareCourseDetails(course, approvedCourse);
  changes.details.push(...detailChanges);

  // Compare lessons/modules
  const lessonChanges = compareLessons(course.outline, approvedCourse.outline);
  changes.lessons.push(...lessonChanges);

  // Compare certificate details
  const certChanges = compareCertificateDetails(
    course.certificateDetails, 
    approvedCourse.certificateDetails
  );
  changes.certificate.push(...certChanges);

  return changes;
}

// Export function for comparing course details
export function compareCourseDetails(course: any, approvedCourse: any): CoursePublishChange[] {
  const changes: CoursePublishChange[] = [];

  // Define all fields to compare
  const fieldsToCompare = [
    'title',
    'courseDescription', 
    'category',
    'courseImage',
    'learnings',
    'difficultyLevel'
  ];

  // Iterate through each field and check for changes
  for (const fieldName of fieldsToCompare) {
    const currentValue = this.getFieldValue(course, fieldName);
    const approvedValue = this.getFieldValue(approvedCourse, fieldName);

    // Skip if values are the same
    if (this.compareFieldValues(currentValue, approvedValue, fieldName)) {
      continue;
    }

    // Generate change object based on field type
    switch (fieldName) {
      case 'title':
        changes.push({
          type: "text",
          change: `Updated course title from '${approvedValue}' to '${currentValue}'`,
          field: "Course Title",
          oldValue: approvedValue as string | null,
          newValue: currentValue as string | null
        });
        break;

      case 'courseDescription':
        changes.push({
          type: "text",
          change: "Updated course description",
          field: "Course Description",
          oldValue: approvedValue || null,
          newValue: currentValue || null
        });
        break;

      case 'category':
        changes.push({
          type: "text",
          change: `Changed course category from '${approvedValue}' to '${currentValue}'`,
          field: "Course Category",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'courseImage':
        changes.push({
          type: "media",
          change: "Updated course thumbnail image",
          field: "Course Image",
          oldValue: approvedValue as MediaUpload | null,
          newValue: currentValue as MediaUpload | null
        });
        break;

      case 'learnings':
        changes.push({
          type: "text",
          change: "Updated course learning objectives",
          field: "Learning Objectives",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'difficultyLevel':
        changes.push({
          type: "text",
          change: `Changed difficulty level from '${approvedValue}' to '${currentValue}'`,
          field: "Difficulty Level",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      default:
        // Generic handling for unknown fields
        changes.push({
          type: "text",
          change: `Updated ${fieldName}`,
          field: fieldName,
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;
    }
  }

  return changes;
}

// Helper function to get field value based on field name
function getFieldValue(object: any, fieldName: string): string | MediaUpload | null {
  switch (fieldName) {
    case 'courseImage':
      // Return the full MediaUpload object for media fields
      return object?.courseImage || null;
    case 'learnings':
      return object?.learnings?.join(', ') || null;
    default:
      return object?.[fieldName] || null;
  }
}

// Helper function to compare field values
function compareFieldValues(currentValue: any, approvedValue: any, fieldName: string): boolean {
  switch (fieldName) {
    case 'courseImage':
      // For media objects, compare objectUrl
      return currentValue?.objectUrl === approvedValue?.objectUrl;
    case 'learnings':
      // For arrays, use JSON.stringify for deep comparison
      return JSON.stringify(currentValue) === JSON.stringify(approvedValue);
    default:
      // For simple values, direct comparison
      return currentValue === approvedValue;
  }
}

// Export function for comparing lessons and modules
export function compareLessons(courseOutline: any[], approvedOutline: any[]): LessonPublishChange[] {
  const changes: LessonPublishChange[] = [];

  // Inline helper functions for ID-based comparison
  const findModuleById = (modules: any[], id: string) => modules?.find(m => m._id === id);
  const getModuleIds = (modules: any[]) => modules?.map(m => m._id) || [];

  const currentModules = courseOutline || [];
  const approvedModules = approvedOutline || [];
  const currentModuleIds = getModuleIds(currentModules);
  const approvedModuleIds = getModuleIds(approvedModules);

  // Find added modules (in current but not in approved)
  const addedModuleIds = currentModuleIds.filter(id => !approvedModuleIds.includes(id));
  for (const moduleId of addedModuleIds) {
    const module = findModuleById(currentModules, moduleId);
    if (module) {
      changes.push({
        type: "text",
        change: `${module.title} - New module added`,
        field: "Module",
        oldValue: null as string | null,
        newValue: module.title as string | null,
        moduleName: module.title,
        lessonName: "Module Structure"
      });
    }
  }

  // Find removed modules (in approved but not in current)
  const removedModuleIds = approvedModuleIds.filter(id => !currentModuleIds.includes(id));
  for (const moduleId of removedModuleIds) {
    const module = findModuleById(approvedModules, moduleId);
    if (module) {
      changes.push({
        type: "text",
        change: `${module.title} - Module removed`,
        field: "Module",
        oldValue: module.title as string | null,
        newValue: null as string | null,
        moduleName: module.title,
        lessonName: "Module Structure"
      });
    }
  }

  // Compare existing modules (present in both)
  const commonModuleIds = currentModuleIds.filter(id => approvedModuleIds.includes(id));
  for (const moduleId of commonModuleIds) {
    const currentModule = findModuleById(currentModules, moduleId);
    const approvedModule = findModuleById(approvedModules, moduleId);

    if (currentModule && approvedModule) {
      // Module title changed
      if (currentModule.title !== approvedModule.title) {
        changes.push({
          type: "text",
          change: `${approvedModule.title} - Module renamed to '${currentModule.title}'`,
          field: "Module Title",
          oldValue: approvedModule.title as string | null,
          newValue: currentModule.title as string | null,
          moduleName: currentModule.title,
          lessonName: "Module Structure"
        });
      }

      // Compare lessons within module
      const lessonChanges = compareModuleLessons(
        currentModule, 
        approvedModule, 
        currentModule.title
      );
      changes.push(...lessonChanges);
    }
  }

  return changes;
}

// Helper function for comparing lessons within a module
function compareModuleLessons(currentModule: any, approvedModule: any, moduleName: string): LessonPublishChange[] {
  const changes: LessonPublishChange[] = [];

  // Inline helper functions for lesson ID-based comparison
  const findLessonById = (lessons: any[], id: string) => lessons?.find(l => l._id === id);
  const getLessonIds = (lessons: any[]) => lessons?.map(l => l._id) || [];

  const currentLessons = currentModule.lessons || [];
  const approvedLessons = approvedModule.lessons || [];
  const currentLessonIds = getLessonIds(currentLessons);
  const approvedLessonIds = getLessonIds(approvedLessons);

  // Find added lessons (in current but not in approved)
  const addedLessonIds = currentLessonIds.filter(id => !approvedLessonIds.includes(id));
  for (const lessonId of addedLessonIds) {
    const lesson = findLessonById(currentLessons, lessonId);
    if (lesson) {
      changes.push({
        type: "text",
        change: `${moduleName} - ${lesson.title} - New lesson added`,
        field: "Lesson",
        oldValue: null as string | null,
        newValue: lesson.title as string | null,
        moduleName,
        lessonName: lesson.title
      });
    }
  }

  // Find removed lessons (in approved but not in current)
  const removedLessonIds = approvedLessonIds.filter(id => !currentLessonIds.includes(id));
  for (const lessonId of removedLessonIds) {
    const lesson = findLessonById(approvedLessons, lessonId);
    if (lesson) {
      changes.push({
        type: "text",
        change: `${moduleName} - ${lesson.title} - Lesson removed`,
        field: "Lesson",
        oldValue: lesson.title as string | null,
        newValue: null as string | null,
        moduleName,
        lessonName: lesson.title
      });
    }
  }

  // Compare existing lessons (present in both)
  const commonLessonIds = currentLessonIds.filter(id => approvedLessonIds.includes(id));
  for (const lessonId of commonLessonIds) {
    const currentLesson = findLessonById(currentLessons, lessonId);
    const approvedLesson = findLessonById(approvedLessons, lessonId);

    if (currentLesson && approvedLesson) {
      // Compare lesson fields using organized approach
      const lessonChanges = compareLessonFields(
        currentLesson, 
        approvedLesson, 
        moduleName, 
        currentLesson.title
      );
      changes.push(...lessonChanges);
    }
  }

  return changes;
}

// Helper function for comparing individual lesson fields
function compareLessonFields(currentLesson: any, approvedLesson: any, moduleName: string, lessonName: string): LessonPublishChange[] {
  const changes: LessonPublishChange[] = [];

  // Define all lesson fields to compare
  const lessonFields = [
    'title',
    'content',
    'resource',
    'quizData',
    'metadata'
  ];

      // Iterate through each lesson field and check for changes
    for (const fieldName of lessonFields) {
      const currentValue = getLessonFieldValue(currentLesson, fieldName);
      const approvedValue = getLessonFieldValue(approvedLesson, fieldName);

      // Skip if values are the same
      if (compareLessonFieldValues(currentValue, approvedValue, fieldName)) {
      continue;
    }

    // Generate change object based on field type
    switch (fieldName) {
      case 'title':
        changes.push({
          type: "text",
          change: `${moduleName} - ${approvedLesson.title} - Lesson renamed to '${currentValue}'`,
          field: "Lesson Title",
          oldValue: approvedValue,
          newValue: currentValue,
          moduleName,
          lessonName: currentValue || lessonName
        });
        break;

      case 'content':
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated lesson content`,
          field: "Lesson Content",
          oldValue: approvedValue,
          newValue: currentValue,
          moduleName,
          lessonName
        });
        break;

      case 'resource':
        const resourceType = currentLesson.type === 'video' ? 'Video' : 'Resource';
        changes.push({
          type: "media",
          change: `${moduleName} - ${lessonName} - Updated ${resourceType.toLowerCase()}`,
          field: `Lesson ${resourceType}`,
          oldValue: approvedValue as MediaUpload | null,
          newValue: currentValue as MediaUpload | null,
          moduleName,
          lessonName
        });
        break;



      case 'quizData':
        // Handle individual quiz fields
        const quizChanges = compareQuizDataFields(
          currentLesson.quizData,
          approvedLesson.quizData,
          moduleName,
          lessonName
        );
        changes.push(...quizChanges);
        break;

      case 'metadata':
        // Handle individual metadata fields
        const metadataChanges = compareMetadataFields(
          currentLesson.metadata,
          approvedLesson.metadata,
          moduleName,
          lessonName
        );
        changes.push(...metadataChanges);
        break;

      default:
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated ${fieldName}`,
          field: `Lesson ${fieldName}`,
          oldValue: approvedValue,
          newValue: currentValue,
          moduleName,
          lessonName
        });
        break;
    }
  }

  return changes;
}

// Helper function to get lesson field value
function getLessonFieldValue(lesson: any, fieldName: string): string | MediaUpload | null {
  if (!lesson) return null;

  switch (fieldName) {
    case 'resource':
      // Return the full MediaUpload object for resources
      return lesson?.resource || null;
    case 'quizData':
      return lesson?.quizData ? JSON.stringify(lesson.quizData) : null;
    case 'metadata':
      return lesson?.metadata ? JSON.stringify(lesson.metadata) : null;
    default:
      return lesson?.[fieldName] || null;
  }
}

// Helper function to compare lesson field values
function compareLessonFieldValues(currentValue: any, approvedValue: any, fieldName: string): boolean {
  switch (fieldName) {
    case 'resource':
      // For media objects, compare objectUrl
      return currentValue?.objectUrl === approvedValue?.objectUrl;
    case 'quizData':
      // Skip quizData here as it's handled separately
      return true;
    case 'metadata':
      // Skip metadata here as it's handled separately
      return true;
    default:
      // For simple values, direct comparison
      return currentValue === approvedValue;
  }
}

// Helper function to compare individual metadata fields
function compareMetadataFields(
  currentMetadata: any, 
  approvedMetadata: any, 
  moduleName: string, 
  lessonName: string
): LessonPublishChange[] {
  const changes: LessonPublishChange[] = [];

  // Return empty if both are null/undefined
  if (!currentMetadata && !approvedMetadata) return changes;

  // Define metadata fields to compare
  const metadataFields = [
    'description',
    'duration',
    'isPreviewable',
    'requiredLesson'
  ];

  // Iterate through each metadata field
  for (const fieldName of metadataFields) {
    const currentValue = getMetadataFieldValue(currentMetadata, fieldName);
    const approvedValue = getMetadataFieldValue(approvedMetadata, fieldName);

    // Skip if values are the same
    if (currentValue === approvedValue) {
      continue;
    }

    // Generate change object based on field type
    switch (fieldName) {
      case 'description':
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated lesson description`,
          field: "Lesson Description",
          oldValue: approvedValue as string | null,
          newValue: currentValue as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'duration':
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Changed duration from ${approvedValue || 0} to ${currentValue || 0} minutes`,
          field: "Lesson Duration",
          oldValue: approvedValue?.toString() as string | null,
          newValue: currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'isPreviewable':
        const previewStatus = currentValue ? 'Enabled' : 'Disabled';
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - ${previewStatus} lesson preview`,
          field: "Lesson Preview",
          oldValue: approvedValue?.toString() as string | null,
          newValue: currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'requiredLesson':
        const requiredStatus = currentValue ? 'Marked as required' : 'Marked as optional';
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - ${requiredStatus}`,
          field: "Lesson Required Status",
          oldValue: approvedValue?.toString() as string | null,
          newValue: currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;

      default:
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated ${fieldName}`,
          field: `Lesson ${fieldName}`,
          oldValue: approvedValue?.toString() as string | null,
          newValue: currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;
    }
  }

  return changes;
}

// Helper function to get metadata field value
function getMetadataFieldValue(metadata: any, fieldName: string): any {
  if (!metadata) return null;
  return metadata[fieldName] ?? null;
}

// Helper function to compare individual quiz data fields
function compareQuizDataFields(
  currentQuizData: any,
  approvedQuizData: any,
  moduleName: string,
  lessonName: string
): LessonPublishChange[] {
  const changes: LessonPublishChange[] = [];

  // Return empty if both are null/undefined
  if (!currentQuizData && !approvedQuizData) return changes;

  // Compare quiz fields if either exists (including null comparisons)
  const quizFieldChanges = compareIndividualQuizFields(
    currentQuizData,
    approvedQuizData,
    moduleName,
    lessonName
  );
  changes.push(...quizFieldChanges);

  return changes;
}

// Helper function to compare individual quiz fields (single quiz)
function compareIndividualQuizFields(
  currentQuiz: any,
  approvedQuiz: any,
  moduleName: string,
  lessonName: string
): LessonPublishChange[] {
  const changes: LessonPublishChange[] = [];

  // Define quiz fields to compare
  const quizFields = [
    'title',
    'description',
    'questions',
    'settings'
  ];

  // Iterate through each quiz field
  for (const fieldName of quizFields) {
    const currentValue = getQuizFieldValue(currentQuiz, fieldName);
    const approvedValue = getQuizFieldValue(approvedQuiz, fieldName);

    // Skip if values are the same
    if (compareQuizFieldValues(currentValue, approvedValue, fieldName)) {
      continue;
    }

    // Generate change object based on field type
    switch (fieldName) {
      case 'title':
        const quizIdentifier = currentValue || approvedValue || 'quiz';
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Changed quiz title from '${approvedValue}' to '${currentValue}'`,
          field: "Quiz Title",
          oldValue: approvedValue as string | null,
          newValue: currentValue as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'description':
        const quizTitle = currentQuiz?.title || approvedQuiz?.title || 'Untitled Quiz';
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated description for quiz "${quizTitle}"`,
          field: "Quiz Description",
          oldValue: approvedValue as string | null,
          newValue: currentValue as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'questions':
        // Handle individual question changes using ID-based comparison
        const quizName = currentQuiz?.title || approvedQuiz?.title || 'Untitled Quiz';
        const questionChanges = compareQuizQuestions(
          currentValue,
          approvedValue,
          moduleName,
          lessonName,
          quizName
        );
        changes.push(...questionChanges);
        break;

              case 'settings':
          // Handle individual settings changes
          const settingsQuizTitle = currentQuiz?.title || approvedQuiz?.title || 'Untitled Quiz';
          const settingsChanges = compareQuizSettings(
            currentValue,
            approvedValue,
            moduleName,
            lessonName,
            settingsQuizTitle
          );
          changes.push(...settingsChanges);
          break;

      default:
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated quiz ${fieldName}`,
          field: `Quiz ${fieldName}`,
          oldValue: approvedValue?.toString() as string | null,
          newValue: currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;
    }
  }

  return changes;
}

// Helper function to compare quiz settings
function compareQuizSettings(
  currentSettings: any,
  approvedSettings: any,
  moduleName: string,
  lessonName: string,
  quizTitle: string = 'Untitled Quiz'
): LessonPublishChange[] {
  const changes: LessonPublishChange[] = [];

  if (!currentSettings && !approvedSettings) return changes;

  // Define quiz settings fields to compare
  const settingsFields = [
    'randomizeQuestions',
    'allowRetakes',
    'passingPercentage'
  ];

  // Iterate through each settings field
  for (const fieldName of settingsFields) {
    const currentValue = getQuizFieldValue(currentSettings, fieldName);
    const approvedValue = getQuizFieldValue(approvedSettings, fieldName);

    // Skip if values are the same
    if (currentValue === approvedValue) {
      continue;
    }

    // Generate change object based on field type
    switch (fieldName) {
      case 'randomizeQuestions':
        const randomizeStatus = currentValue ? 'Enabled' : 'Disabled';
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - ${randomizeStatus} question randomization for quiz "${quizTitle}"`,
          field: "Quiz Question Randomization",
          oldValue: approvedValue?.toString() as string | null,
          newValue: currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'allowRetakes':
        const retakeStatus = currentValue ? 'Enabled' : 'Disabled';
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - ${retakeStatus} quiz retakes`,
          field: "Quiz Retakes",
          oldValue: approvedValue?.toString() as string | null,
          newValue: currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'passingPercentage':
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Changed passing percentage from ${approvedValue || 0}% to ${currentValue || 0}%`,
          field: "Quiz Passing Percentage",
          oldValue: `${approvedValue || 0}%` as string | null,
          newValue: `${currentValue || 0}%` as string | null,
          moduleName,
          lessonName
        });
        break;

      default:
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated quiz setting: ${fieldName}`,
          field: `Quiz ${fieldName}`,
          oldValue: approvedValue?.toString() as string | null,
          newValue: currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;
    }
  }

  return changes;
}

// Helper function to get quiz field value
function getQuizFieldValue(quizData: any, fieldName: string): any {
  if (!quizData) return null;
  return quizData[fieldName] ?? null;
}

// Helper function to compare quiz field values
function compareQuizFieldValues(currentValue: any, approvedValue: any, fieldName: string): boolean {
  switch (fieldName) {
    case 'questions':
      // Skip questions here as they're handled separately with ID-based comparison
      return true;
    case 'settings':
      // Settings handled separately
      return JSON.stringify(currentValue) === JSON.stringify(approvedValue);
    default:
      // For simple values, direct comparison
      return currentValue === approvedValue;
  }
}

// Helper function to compare individual quiz questions using ID-based approach
function compareQuizQuestions(
  currentQuestions: any[],
  approvedQuestions: any[],
  moduleName: string,
  lessonName: string,
  quizTitle: string = 'Untitled Quiz'
): LessonPublishChange[] {
  const changes: LessonPublishChange[] = [];

  // Inline helper functions for question ID-based comparison
  const findQuestionById = (questions: any[], id: string) => questions?.find(q => q.id === id);
  const getQuestionIds = (questions: any[]) => questions?.map(q => q.id) || [];

  const current = currentQuestions || [];
  const approved = approvedQuestions || [];
  const currentQuestionIds = getQuestionIds(current);
  const approvedQuestionIds = getQuestionIds(approved);

  // Find added questions (in current but not in approved)
  const addedQuestionIds = currentQuestionIds.filter(id => !approvedQuestionIds.includes(id));
  for (const questionId of addedQuestionIds) {
    const question = findQuestionById(current, questionId);
    if (question) {
      changes.push({
        type: "text",
        change: `${moduleName} - ${lessonName} - Added new question to quiz "${quizTitle}": "${question.question?.substring(0, 50)}${question.question?.length > 50 ? '...' : ''}"`,
        field: "Quiz Question Addition",
        oldValue: null as string | null,
        newValue: question.question as string | null,
        moduleName,
        lessonName
      });
    }
  }

  // Find removed questions (in approved but not in current)
  const removedQuestionIds = approvedQuestionIds.filter(id => !currentQuestionIds.includes(id));
  for (const questionId of removedQuestionIds) {
    const question = findQuestionById(approved, questionId);
    if (question) {
      changes.push({
        type: "text",
        change: `${moduleName} - ${lessonName} - Removed quiz question: "${question.question?.substring(0, 50)}${question.question?.length > 50 ? '...' : ''}"`,
        field: "Quiz Question Removal",
        oldValue: question.question as string | null,
        newValue: null as string | null,
        moduleName,
        lessonName
      });
    }
  }

  // Compare existing questions (present in both)
  const commonQuestionIds = currentQuestionIds.filter(id => approvedQuestionIds.includes(id));
  for (const questionId of commonQuestionIds) {
    const currentQuestion = findQuestionById(current, questionId);
    const approvedQuestion = findQuestionById(approved, questionId);

    if (currentQuestion && approvedQuestion) {
      // Compare individual question fields
      const questionFieldChanges = compareQuestionFields(
        currentQuestion,
        approvedQuestion,
        moduleName,
        lessonName
      );
      changes.push(...questionFieldChanges);
    }
  }

  return changes;
}

// Helper function to compare individual question fields
function compareQuestionFields(
  currentQuestion: any,
  approvedQuestion: any,
  moduleName: string,
  lessonName: string
): LessonPublishChange[] {
  const changes: LessonPublishChange[] = [];

  // Define question fields to compare
  const questionFields = [
    'question',
    'type',
    'options',
    'correctAnswers',
    'correctAnswer',
    'feedback'
  ];

  // Iterate through each question field
  for (const fieldName of questionFields) {
    const currentValue = getQuestionFieldValue(currentQuestion, fieldName);
    const approvedValue = getQuestionFieldValue(approvedQuestion, fieldName);

    // Skip if values are the same
    if (compareQuestionFieldValues(currentValue, approvedValue, fieldName)) {
      continue;
    }

    // Generate change object based on field type
    switch (fieldName) {
      case 'question':
        const questionPreview = currentValue?.substring(0, 50) + (currentValue?.length > 50 ? '...' : '');
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated question text: "${questionPreview}"`,
          field: "Question Text",
          oldValue: approvedValue as string | null,
          newValue: currentValue as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'type':
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Changed question type from '${approvedValue}' to '${currentValue}'`,
          field: "Question Type",
          oldValue: approvedValue as string | null,
          newValue: currentValue as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'options':
        const currentCount = currentValue?.length || 0;
        const approvedCount = approvedValue?.length || 0;
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated question options (${approvedCount} → ${currentCount} options)`,
          field: "Question Options",
          oldValue: `${approvedCount} options` as string | null,
          newValue: `${currentCount} options` as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'correctAnswers':
      case 'correctAnswer':
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated correct answer(s) for question`,
          field: "Correct Answer",
          oldValue: Array.isArray(approvedValue) ? approvedValue.join(', ') : approvedValue?.toString() as string | null,
          newValue: Array.isArray(currentValue) ? currentValue.join(', ') : currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;

      case 'feedback':
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated question feedback`,
          field: "Question Feedback",
          oldValue: approvedValue as string | null,
          newValue: currentValue as string | null,
          moduleName,
          lessonName
        });
        break;

      default:
        changes.push({
          type: "text",
          change: `${moduleName} - ${lessonName} - Updated question ${fieldName}`,
          field: `Question ${fieldName}`,
          oldValue: approvedValue?.toString() as string | null,
          newValue: currentValue?.toString() as string | null,
          moduleName,
          lessonName
        });
        break;
    }
  }

  return changes;
}

// Helper function to get question field value
function getQuestionFieldValue(question: any, fieldName: string): any {
  if (!question) return null;
  return question[fieldName] ?? null;
}

// Helper function to compare question field values
function compareQuestionFieldValues(currentValue: any, approvedValue: any, fieldName: string): boolean {
  switch (fieldName) {
    case 'options':
    case 'correctAnswers':
      // For arrays, use JSON comparison
      return JSON.stringify(currentValue) === JSON.stringify(approvedValue);
    default:
      // For simple values, direct comparison
      return currentValue === approvedValue;
  }
}

// Export function for comparing certificate details
export function compareCertificateDetails(current: any, approved: any): CoursePublishChange[] {
  const changes: CoursePublishChange[] = [];

  if (!current && !approved) return changes;

  // Define all certificate fields to compare
  const certificateFields = [
    'certificateTitle',
    'certificateSubtitle',
    'courseName',
    'nameSubtitle',
    'logo',
    'showCompletionDate',
    'showCertificateNumber',
    'enableNotification',
    'emailSubject',
    'emailBody'
  ];

  // Iterate through each certificate field and check for changes
  for (const fieldName of certificateFields) {
    const currentValue = getCertificateFieldValue(current, fieldName);
    const approvedValue = getCertificateFieldValue(approved, fieldName);

    // Skip if values are the same
    if (compareCertificateFieldValues(currentValue, approvedValue, fieldName)) {
      continue;
    }

    // Generate change object based on field type
    switch (fieldName) {
      case 'certificateTitle':
        changes.push({
          type: "text",
          change: "Updated certificate title",
          field: "Certificate Title",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'certificateSubtitle':
        changes.push({
          type: "text",
          change: "Updated certificate subtitle",
          field: "Certificate Subtitle",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'courseName':
        changes.push({
          type: "text",
          change: "Updated course name on certificate",
          field: "Certificate Course Name",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'nameSubtitle':
        changes.push({
          type: "text",
          change: "Updated name subtitle on certificate",
          field: "Certificate Name Subtitle",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'logo':
        changes.push({
          type: "media",
          change: "Updated certificate logo",
          field: "Certificate Logo",
          oldValue: approvedValue as MediaUpload | null,
          newValue: currentValue as MediaUpload | null
        });
        break;

      case 'showCompletionDate':
        changes.push({
          type: "text",
          change: `${currentValue === 'true' ? 'Enabled' : 'Disabled'} completion date display on certificate`,
          field: "Certificate Completion Date Display",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'showCertificateNumber':
        changes.push({
          type: "text",
          change: `${currentValue === 'true' ? 'Enabled' : 'Disabled'} certificate number display`,
          field: "Certificate Number Display",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'enableNotification':
        changes.push({
          type: "text",
          change: `${currentValue === 'true' ? 'Enabled' : 'Disabled'} certificate email notifications`,
          field: "Certificate Email Notifications",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'emailSubject':
        changes.push({
          type: "text",
          change: "Updated certificate email subject",
          field: "Certificate Email Subject",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      case 'emailBody':
        changes.push({
          type: "text",
          change: "Updated certificate email body",
          field: "Certificate Email Body",
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;

      default:
        changes.push({
          type: "text",
          change: `Updated certificate ${fieldName}`,
          field: `Certificate ${fieldName}`,
          oldValue: approvedValue,
          newValue: currentValue
        });
        break;
    }
  }

  return changes;
}

// Helper function to get certificate field value
function getCertificateFieldValue(certificateDetails: any, fieldName: string): string | MediaUpload | null {
  if (!certificateDetails) return null;

  switch (fieldName) {
    case 'logo':
      // Return the full MediaUpload object for logo
      return certificateDetails?.logo || null;
    case 'showCompletionDate':
    case 'showCertificateNumber':
    case 'enableNotification':
      return certificateDetails?.[fieldName]?.toString() || null;
    default:
      return certificateDetails?.[fieldName] || null;
  }
}

// Helper function to compare certificate field values
function compareCertificateFieldValues(currentValue: any, approvedValue: any, fieldName: string): boolean {
  switch (fieldName) {
    case 'logo':
      // For media objects, compare objectUrl
      return currentValue?.objectUrl === approvedValue?.objectUrl;
    default:
      return currentValue === approvedValue;
  }
}
```

### Database Models Involved
- **courses**: Draft/working version
- **approved-courses**: Published/live version
- Compare `courseHash` to detect if changes exist

### Security & Validation
- Verify user has access to the course (author/owner)
- Validate course exists and is in appropriate status
- Handle cases where no published version exists

### Error Handling
- Course not found
- User unauthorized
- No published version available
- System errors during comparison

## 🔗 Integration Points
- Works with existing course publishing workflow
- Integrates with frontend publish page component
- Supports future publishing automation features

## 📝 TypeScript Integration Instructions
<publish_changes_integration>
1. **Add to Backend Types**: Copy the TypeScript interfaces from `<publish_changes_types>` to `ryland-lms-api/src/types/courses.types.ts`
2. **Create Library File**: Create `ryland-lms-api/src/services/courses/publish-lib.ts` with all helper functions
3. **Add Controller Case**: Add `"get-publish-changes"` controller case to the existing `patch` method switch statement in `courses.class.ts`
4. **Import Helper Functions**: Import required functions from `publish-lib.ts` in `courses.class.ts`
5. **Backend Usage**: Import `IPublishChangesResponse` in the courses service implementation
6. **Frontend Usage**: Import types from backend types file in the publish page (`ryland-lms/app/author/courses/[courseId]/publish/page.tsx`)
7. **Type Safety**: Ensure API response matches `IPublishChangesResponse` structure exactly
8. **Reference**: Use `<publish_changes_response_example>` for implementation testing and validation
9. **Maintain Compatibility**: Keep existing `checkCourseChanges` method working for current callers
</publish_changes_integration> 