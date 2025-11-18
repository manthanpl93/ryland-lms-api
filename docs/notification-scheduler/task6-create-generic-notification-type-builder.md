# Task 6: Create Generic Notification Type Builder

**File:** `xtcare-lms-new/components/course-creation/notification-type-builder.tsx`

## Task Details
Create a generic, type-safe notification type builder component that dynamically renders appropriate fields for all 9 notification types while maintaining the excellent UI/UX from the completion notification config. This component will replace the current hardcoded approach with a schema-driven, maintainable solution.

## 🎨 **Design & Layout Requirements**

### **Follow Completion Notification Config Patterns**
- **Study the completion notification config file** (`xtcare-lms-new/components/course-creation/notification/completion-notification-config.tsx`) thoroughly
- **Copy the exact visual design, spacing, and layout patterns** from the completion notification config
- **Maintain identical styling, colors, and component arrangements** for consistency
- **Use the same card layouts, spacing classes, and visual hierarchy**

### **UI Component Usage Guidelines**
- **Read the UI components documentation** (`xtcare-lms-new/docs/UI-COMPONENTS-README.md`) first
- **Use ONLY these essential input components:**
- **DO NOT use layout components** like Card, Tabs, or other structural components
- **Import components from** `@/components/ui/component-name`
- **For file uploads, use the `uploadSingleFile` utility** from `@/utils/uploadToS3` for S3 integration



## 🎯 **Objectives**
- **Replace hardcoded components** with one generic, schema-driven solution
- **Handle all 9 notification types** dynamically through field definitions
- **Maintain UI/UX consistency** with completion notification config patterns
- **Provide type safety** through TypeScript and Formik integration
- **Embed template variables** within SMS/Email configuration cards
- **Enable easy maintenance** for adding new notification types

## 📁 **File Location**
```
xtcare-lms-new/
├── components/
│   └── course-creation/
│       ├── notification-setup.tsx              ← Update to use new builder
│       └── notification-type-builder.tsx       ← Create this file here
├── types/
│   └── notification-scheduler.types.ts         ← Types from Task 3
└── api/
    └── notification-scheduler.ts               ← API from Task 4
```

## 🔧 **Implementation Steps**

### Step 1: Create Component File
```bash
cd /Users/manthan/Desktop/Files/Projects/LMS-Xtcare/xtcare-lms-new
touch components/course-creation/notification-type-builder.tsx
```

### Step 2: Implement Notification Type Schemas
```typescript
const notificationTypeFields = {
  'student-welcome': {
    fields: ['name', 'via', 'smsSpec', 'emailSpec']
  },
  'student-completion': {
    fields: ['name', 'via', 'smsSpec', 'emailSpec', 'attachCertificate', 'attachment']
  },
  'student-oneTime': {
    fields: ['name', 'via', 'schedule', 'notificationForStudentWho', 'smsSpec', 'emailSpec']
  },
  'student-multipleTime': {
    fields: ['name', 'via', 'schedule', 'notificationForStudentWho', 'smsSpec', 'emailSpec']
  },
  'student-recurring': {
    fields: ['name', 'via', 'schedule', 'notificationForStudentWho', 'smsSpec', 'emailSpec']
  },
  'author-studentEnrolled': {
    fields: ['name', 'via', 'recipients', 'otherRecipients', 'smsSpec', 'emailSpec']
  },
  'author-studentCompleted': {
    fields: ['name', 'via', 'recipients', 'otherRecipients', 'smsSpec', 'emailSpec']
  },
  'author-studentsEnrolledList': {
    fields: ['name', 'via', 'recipients', 'otherRecipients', 'smsSpec', 'emailSpec']
  },
  'author-studentsCompletedList': {
    fields: ['name', 'via', 'recipients', 'otherRecipients', 'smsSpec', 'emailSpec']
  }
};
```

### Step 3: Create Validation Schema Generator
```typescript
const generateNotificationValidationSchema = (notificationType) => {
  const typeFields = notificationTypeFields[notificationType];
  const validationSchema = {};
  
  typeFields.fields.forEach(fieldName => {
    switch (fieldName) {
      case 'name':
        validationSchema[fieldName] = Yup.string().trim().required('Notification name is required');
        break;
        
      case 'via':
        validationSchema[fieldName] = Yup.array()
          .min(1, 'Select at least one notification method')
          .of(Yup.string().oneOf(['sms', 'email']))
          .required('Notification method is required');
        break;
        
      case 'smsSpec':
        validationSchema[fieldName] = Yup.object({
          body: Yup.string().trim().required('SMS body is required')
        }).required('SMS configuration is required');
        break;
        
      case 'emailSpec':
        validationSchema[fieldName] = Yup.object({
          subject: Yup.string().trim().required('Email subject is required'),
          body: Yup.string().trim().required('Email body is required')
        }).required('Email configuration is required');
        break;
        
      case 'attachCertificate':
        validationSchema[fieldName] = Yup.boolean();
        break;
        
      case 'attachment':
        validationSchema[fieldName] = Yup.mixed().required('Attachment is required');
        break;
        
      case 'schedule':
        validationSchema[fieldName] = Yup.object({
          dates: Yup.array().of(Yup.string()).min(1, 'Select at least one date').required('Dates are required'),
          time: Yup.string().required('Time is required')
        }).required('Schedule is required');
        break;
        
      case 'notificationForStudentWho':
        validationSchema[fieldName] = Yup.array().of(Yup.string());
        break;
        
      case 'recipients':
        validationSchema[fieldName] = Yup.array()
          .of(Yup.string())
          .min(1, 'Select at least one recipient')
          .required('Recipients are required');
        break;
        
      case 'otherRecipients':
        validationSchema[fieldName] = Yup.string().trim().required('Other recipients are required');
        break;
        
      default:
        validationSchema[fieldName] = Yup.string().required(`${fieldName} is required`);
        console.warn(`No validation rule defined for field: ${fieldName}`);
    }
  });
  
  return Yup.object(validationSchema);
};
```

### Step 4: Create Dynamic Field Renderer
**IMPORTANT**: Study the completion notification config file first to understand the exact field rendering patterns.

```typescript
const renderNotificationField = ({ fieldName, formik }) => {
  const { values, setFieldValue, errors, touched } = formik;
  
  // Handle field dependencies within the renderer
  const shouldShowField = (fieldName) => {
    switch (fieldName) {
      case 'smsSpec':
        return values.via && values.via.includes('sms');
      case 'emailSpec':
        return values.via && values.via.includes('email');
      case 'attachment':
        return values.attachCertificate === true;
      default:
        return true;
    }
  };
  
  // Don't render if field should be hidden
  if (!shouldShowField(fieldName)) return null;
  
  // Render the field
  switch (fieldName) {
    case 'name':
      return <NameField formik={formik} />;
      
    case 'via':
      return <ViaSelector formik={formik} />;
      
    case 'smsSpec':
      return <SmsConfigurationCard formik={formik} />;
      
    case 'emailSpec':
      return <EmailConfigurationCard formik={formik} />;
      
    case 'attachCertificate':
      return <AttachCertificateField formik={formik} />;
      
    case 'attachment':
      return <FileUploadField formik={formik} />;
      
    case 'schedule':
      return <SchedulePicker formik={formik} />;
      
    case 'notificationForStudentWho':
      return <StudentTargetingSelector formik={formik} />;
      
    case 'recipients':
      return <RecipientSelector formik={formik} />;
      
    case 'otherRecipients':
      return <OtherRecipientsField formik={formik} />;
      
    default:
      return <div>Unknown field: {fieldName}</div>;
  }
};
```

### Step 5: Create Main Component
```typescript
const NotificationTypeBuilder = ({ notificationType, onSave, onCancel, onBack, initialValues }) => {
  const typeFields = notificationTypeFields[notificationType];
  const validationSchema = generateNotificationValidationSchema(notificationType);
  
  const formik = useFormik({
    initialValues: initialValues || getDefaultValuesForNotificationType(typeFields.fields),
    validationSchema,
    onSubmit: (values) => onSave(values)
  });
  
  return (
    <FormikProvider value={formik}>
      <form onSubmit={formik.handleSubmit} className="space-y-6">
        {/* Single Field Rendering Block */}
        <div className="space-y-6">
          {typeFields.fields.map(fieldName => (
            <renderNotificationField key={fieldName} fieldName={fieldName} formik={formik} />
          ))}
        </div>
        
        {/* Form Actions */}
        <FormActions 
          onSave={() => formik.handleSubmit()} 
          onCancel={onCancel} 
          onBack={onBack}
          isValid={formik.isValid}
          isSubmitting={formik.isSubmitting}
        />
      </form>
    </FormikProvider>
  );
};
```

### Step 6: Create Helper Functions
```typescript
const getDefaultValuesForNotificationType = (fieldNames) => {
  const defaultValues = {};
  
  fieldNames.forEach(fieldName => {
    switch (fieldName) {
      case 'name':
        defaultValues[fieldName] = '';
        break;
      case 'via':
        defaultValues[fieldName] = ['email'];
        break;
      case 'smsSpec':
        defaultValues[fieldName] = { body: '' };
        break;
      case 'emailSpec':
        defaultValues[fieldName] = { subject: '', body: '' };
        break;
      case 'attachCertificate':
        defaultValues[fieldName] = false;
        break;
      case 'attachment':
        defaultValues[fieldName] = null;
        break;
      case 'schedule':
        defaultValues[fieldName] = { dates: [], time: '' };
        break;
      case 'notificationForStudentWho':
        defaultValues[fieldName] = [];
        break;
      case 'recipients':
        defaultValues[fieldName] = [];
        break;
      case 'otherRecipients':
        defaultValues[fieldName] = '';
        break;
      default:
        defaultValues[fieldName] = '';
    }
  });
  
  return defaultValues;
};
```

## 📋 **Required Components**

### **Field Rendering Instructions**
**CRITICAL**: Each field component must follow the EXACT design patterns from completion notification config.

### 1. **NameField Component**
**Copy the exact pattern from completion notification config:**
- Use `className="space-y-2"` for container
- Label with `className="text-sm font-medium"` and required asterisk
- Input with placeholder and error styling
- Error message with `className="text-sm text-red-500"`
- **Study the "Notification Name" field in completion notification config for exact implementation**

```typescript
const NameField = ({ formik }) => {
  const { values, setFieldValue, errors, touched } = formik;
  
  return (
    <div className="space-y-2">
      <Label htmlFor="name" className="text-sm font-medium">
        Notification Name <span className="text-red-500">*</span>
      </Label>
      <Input
        id="name"
        placeholder="Enter notification name"
        value={values.name || ""}
        onChange={(e) => setFieldValue("name", e.target.value)}
        className={errors.name && touched.name ? "border-red-500" : ""}
      />
      {errors.name && touched.name && (
        <p className="text-sm text-red-500">{errors.name}</p>
      )}
    </div>
  );
};
```

### 2. **ViaSelector Component**
**Copy the exact pattern from completion notification config:**
- Use `className="space-y-3"` for container
- Label with `className="text-sm font-medium"` and required asterisk
- Use `className="flex gap-6"` for checkbox layout
- Each checkbox with `className="flex items-center space-x-2"`
- Icons with `className="w-4 h-4"` and proper colors
- Error message with `className="text-sm text-red-500"`
- **Study the "Notification Channel" section in completion notification config for exact implementation**

```typescript
const ViaSelector = ({ formik }) => {
  const { values, setFieldValue, errors, touched } = formik;
  
  const handleChannelToggle = (channel: 'email' | 'sms', checked: boolean) => {
    let newChannels = [...(values.via || [])];
    
    if (checked && !newChannels.includes(channel)) {
      newChannels.push(channel);
    } else if (!checked) {
      newChannels = newChannels.filter(c => c !== channel);
    }
    
    setFieldValue('via', newChannels);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Notification Channel <span className="text-red-500">*</span>
      </Label>
      <div className="flex gap-6">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enableSMS"
            checked={(values.via || []).includes('sms')}
            onCheckedChange={(checked) => handleChannelToggle('sms', checked)}
          />
          <Label htmlFor="enableSMS" className="text-sm font-medium cursor-pointer flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            SMS
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enableEmail"
            checked={(values.via || []).includes('email')}
            onCheckedChange={(checked) => handleChannelToggle('email', checked)}
          />
          <Label htmlFor="enableEmail" className="text-sm font-medium cursor-pointer flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </Label>
        </div>
      </div>
      {errors.via && touched.via && (
        <p className="text-sm text-red-500">{errors.via}</p>
      )}
    </div>
  );
};
```

### 3. **SmsConfigurationCard Component**
**Copy the exact pattern from completion notification config:**
- **DO NOT use Card components** - render as standalone fields
- Use `className="space-y-4"` for container
- Header with icon (`MessageSquare className="w-5 h-5 text-green-600"`) and title
- SMS Body field with `className="space-y-2"` container
- Textarea with `rows={4}` and proper error styling
- **Study the SMS configuration section in completion notification config for exact field layout**
- **Template variables notice should be embedded within the SMS field area**

```typescript
const SmsConfigurationCard = ({ formik }) => {
  const { values, setFieldValue, errors, touched } = formik;
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-5 h-5 text-green-600" />
        <h3 className="font-medium">SMS Configuration</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="smsBody" className="text-sm font-medium">
          SMS Body <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="smsBody"
          placeholder="Enter SMS message"
          value={values.smsSpec?.body || ""}
          onChange={(e) => setFieldValue("smsSpec.body", e.target.value)}
          rows={4}
          className={errors.smsSpec?.body && touched.smsSpec?.body ? "border-red-500" : ""}
        />
        {errors.smsSpec?.body && touched.smsSpec?.body && (
          <p className="text-sm text-red-500">{errors.smsSpec.body}</p>
        )}
      </div>

      {/* Template Variables Notice - Embedded in SMS Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
            <span className="text-blue-600 text-xs font-bold">i</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-blue-800 mb-1">Template Variables:</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-1">
                <User className="w-2.5 h-2.5 mr-1" />
                #StudentName
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-1">
                <BookOpen className="w-2.5 h-2.5 mr-1" />
                #CourseName
              </Badge>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Use these variables to personalize your SMS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 4. **EmailConfigurationCard Component**
**Copy the exact pattern from completion notification config:**
- **DO NOT use Card components** - render as standalone fields
- Use `className="space-y-4"` for container
- Header with icon (`Mail className="w-5 h-5 text-blue-600"`) and title
- Subject field with `className="space-y-2"` container and Input component
- Body field with `className="space-y-2"` container and Textarea with `rows={6}`
- **Study the Email configuration section in completion notification config for exact field layout**
- **Template variables notice should be embedded within the Email field area**

```typescript
const EmailConfigurationCard = ({ formik }) => {
  const { values, setFieldValue, errors, touched } = formik;
  
  return (
    <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium">Email Configuration</h3>
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailSubject" className="text-sm font-medium">
            Subject <span className="text-red-500">*</span>
          </Label>
          <Input
            id="emailSubject"
            placeholder="Enter email subject"
            value={values.emailSpec?.subject || ""}
            onChange={(e) => setFieldValue("emailSpec.subject", e.target.value)}
            className={errors.emailSpec?.subject && touched.emailSpec?.subject ? "border-red-500" : ""}
          />
          {errors.emailSpec?.subject && touched.emailSpec?.subject && (
            <p className="text-sm text-red-500">{errors.emailSpec.subject}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="emailBody" className="text-sm font-medium">
            Body <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="emailBody"
            placeholder="Enter email body"
            value={values.emailSpec?.body || ""}
            onChange={(e) => setFieldValue("emailSpec.body", e.target.value)}
            rows={6}
            className={errors.emailSpec?.body && touched.emailSpec?.body ? "border-red-500" : ""}
          />
          {errors.emailSpec?.body && touched.emailSpec?.body && (
            <p className="text-sm text-red-500">{errors.emailSpec.body}</p>
          )}
        </div>

        {/* Template Variables Notice - Embedded in Email Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
              <span className="text-blue-600 text-xs font-bold">i</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-blue-800 mb-1">Template Variables:</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-1">
                  <User className="w-2.5 h-2.5 mr-1" />
                  #StudentName
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-1">
                  <BookOpen className="w-2.5 h-2.5 mr-1" />
                  #CourseName
                </Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 text-xs px-2 py-1">
                  <Calendar className="w-2.5 h-2.5 mr-1" />
                  #EnrollmentDate
                </Badge>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Use these variables to personalize your email
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

### 5. **AttachCertificateField Component**
**Copy the exact pattern from completion notification config:**
- Use `className="flex items-center space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-lg"`
- Checkbox with proper styling
- Label with icon (`Award className="w-4 h-4 text-amber-600"`)
- **Study the "Attach Certificate" section in completion notification config for exact implementation**

### 6. **FileUploadField Component**
**Copy the exact pattern from completion notification config:**
- Use `className="space-y-2"` for container
- Label with `className="text-sm font-medium"`
- File upload area with `className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"`
- Upload icon with `className="w-8 h-8 text-gray-400 mx-auto mb-2"`
- File info display with `className="mt-3 p-2 bg-gray-50 rounded border"`
- **Study the "Upload Attachment" section in completion notification config for exact implementation**

### 7. **SchedulePicker Component**
**Create a new component following completion notification config patterns:**
- Use `className="space-y-2"` for container
- Label with `className="text-sm font-medium"` and required asterisk
- Date picker input with proper styling
- Time picker input with proper styling
- Error message display below inputs

### 8. **StudentTargetingSelector Component**
**Create a new component following completion notification config patterns:**
- Use `className="space-y-2"` for container
- Label with `className="text-sm font-medium"`
- MultiSelectDropdown component for student targeting options
- Error message display below dropdown

### 9. **RecipientSelector Component**
**Create a new component following completion notification config patterns:**
- Use `className="space-y-2"` for container
- Label with `className="text-sm font-medium"` and required asterisk
- MultiSelectDropdown component for recipient selection
- Error message display below dropdown

### 10. **OtherRecipientsField Component**
**Create a new component following completion notification config patterns:**
- Use `className="space-y-2"` for container
- Label with `className="text-sm font-medium"` and required asterisk
- Input component for additional recipients
- Error message display below input

## ✅ **Success Criteria**
- [ ] Generic notification type builder component created
- [ ] All 9 notification types supported through schemas
- [ ] Dynamic field rendering based on field names
- [ ] Formik integration with proper validation
- [ ] Template variables embedded within SMS/Email cards
- [ ] UI/UX consistency with completion notification config
- [ ] TypeScript compilation without errors
- [ ] Component can be imported and used in notification setup

## 🚨 **Common Issues & Solutions**

### Issue 1: Field Dependencies Not Working
**Problem**: Fields not showing/hiding based on dependencies
**Solution**: Ensure `shouldShowField` function properly checks field values and dependencies

### Issue 2: Validation Schema Errors
**Problem**: Formik validation not working correctly
**Solution**: Check that `generateNotificationValidationSchema` returns proper Yup schema

### Issue 3: Template Variables Not Displaying
**Problem**: Template variables notice not showing in cards
**Solution**: Ensure template variables are embedded within the SMS/Email configuration cards

### Issue 4: Type Errors
**Problem**: TypeScript compilation errors
**Solution**: Ensure all components properly type their props and use correct field names

## 🔗 **Related Files**
- **Types**: `xtcare-lms-new/types/notification-scheduler.types.ts`
- **API**: `xtcare-lms-new/api/notification-scheduler.ts`
- **Main Component**: `xtcare-lms-new/components/course-creation/notification-setup.tsx`
- **Main Doc**: `xtcare-lms-api/docs/notification-scheduler/notification-scheduler-feature.md`

## 📚 **References**
- **Task 3**: [Create Frontend Types](../task3-create-frontend-types.md)
- **Task 4**: [Implement API Logic](../task4-implement-api-logic.md)
- **Task 5**: [Update Notification Setup Component](../task5-update-notification-setup-component.md)
- **Completion Config**: `xtcare-lms-new/components/course-creation/notification/completion-notification-config.tsx`

## 💡 **Usage Examples**

### **Basic Usage**
```typescript
import { NotificationTypeBuilder } from './notification-type-builder';

const MyComponent = () => {
  return (
    <NotificationTypeBuilder
      notificationType="student-welcome"
      onSave={(values) => console.log('Saved:', values)}
      onCancel={() => console.log('Cancelled')}
      onBack={() => console.log('Back')}
    />
  );
};
```

### **With Initial Values**
```typescript
const initialValues = {
  name: "Welcome Message",
  via: ["email"],
  emailSpec: {
    subject: "Welcome to the course!",
    body: "Dear #StudentName, welcome to #CourseName!"
  }
};

<NotificationTypeBuilder
  notificationType="student-welcome"
  initialValues={initialValues}
  onSave={handleSave}
  onCancel={handleCancel}
  onBack={handleBack}
/>
```

This task creates the foundation for a maintainable, scalable notification system that can easily accommodate new notification types while maintaining excellent user experience and type safety. 