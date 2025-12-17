// socket.types.ts - TypeScript types for Socket.IO with custom handshake query

import { Socket } from "socket.io";
import { IUserResponse } from "./users.types";

// Extend the Socket interface to include our custom handshake query
export interface CustomSocket extends Socket {
  handshake: Socket["handshake"] & {
    query: Socket["handshake"]["query"] & {
      token?: string;
      user?: IUserResponse;
    };
  };
}

// Type for the socket parameter in event handlers
export type SocketHandler = CustomSocket;

/**
 * Chat Socket Types
 */

/**
 * Authenticated socket with user data
 */
export interface AuthenticatedSocket extends Socket {
  user: {
    _id: string;
    email: string;
    role: string;
    schoolId?: string;
  };
}

/**
 * User metadata stored with connections
 */
export interface UserMetadata {
  userRole: string;
  schoolId: string;
  classIds: string[];
}

/**
 * Filter criteria for querying users
 */
export interface UserFilters {
  schoolId?: string;
  role?: string;
  classId?: string;
}

/**
 * Connection manager interface
 */
export interface IConnectionManager {
  // Primary storage
  userSocketMap: Map<string, Socket[]>;
  userMetadataMap: Map<string, UserMetadata>;
  
  // Secondary indexes
  schoolIndex: Map<string, Set<string>>;                    // schoolId -> userIds
  schoolRoleIndex: Map<string, Map<string, Set<string>>>;   // schoolId -> role -> userIds
  classIndex: Map<string, Set<string>>;                     // classId -> userIds
  
  // Connection management
  addConnection(userId: string, socket: Socket, metadata?: UserMetadata): void;
  removeConnection(userId: string, socketId: string): void;
  
  // Getters
  getUserSockets(userId: string): Socket[];
  getUserMetadata(userId: string): UserMetadata | null;
  isUserOnline(userId: string): boolean;
  getOnlineUserCount(): number;
  getOnlineUserIds(): string[];
  
  // Query by criteria
  getUsersBySchool(schoolId: string): string[];
  getUsersBySchoolAndRole(schoolId: string, role: string): string[];
  getUsersByClass(classId: string): string[];
  getUsersByFilters(filters: UserFilters): string[];
  
  // Emit methods
  emitToUser(userId: string, event: string, data: any): void;
  emitToSchool(schoolId: string, event: string, data: any): void;
  emitToSchoolRole(schoolId: string, role: string, event: string, data: any): void;
  emitToClass(classId: string, event: string, data: any): void;
  emitToFiltered(filters: UserFilters, event: string, data: any): void;
} 