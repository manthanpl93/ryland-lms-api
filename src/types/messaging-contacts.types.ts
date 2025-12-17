/**
 * Base contact interface
 */
export interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "student" | "teacher" | "admin";
  avatar?: string;
  school?: string;
  conversationId?: string | null;
}

/**
 * Student contact with class context
 */
export interface StudentContact extends Contact {
  role: "student";
  classes?: string[];
}

/**
 * Teacher contact with teaching classes
 */
export interface TeacherContact extends Contact {
  role: "teacher";
  teachingClasses?: string[];
}

/**
 * Class contact for admin broadcast (future feature)
 */
export interface ClassContact {
  _id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  school?: string;
}

/**
 * Query parameters for messaging contacts
 */
export interface MessagingContactsQuery {
  role?: "student" | "teacher" | "admin";
  search?: string;
  $limit?: number;
  $skip?: number;
}

/**
 * Grouped contacts response (Phase 2)
 */
export interface GroupedContactsResponse {
  students: Contact[];
  teachers: Contact[];
  admins: Contact[];
}

/**
 * Service response type (legacy - for pagination if needed)
 */
export interface ContactsResponse {
  total: number;
  limit: number;
  skip: number;
  data: Contact[];
}
