/**
 * User presence handler type definitions
 */

export interface UserOnlinePayload {
  userId: string;
  userRole: string;
  timestamp: string;
}

export interface UserOfflinePayload {
  userId: string;
  timestamp: string;
}

