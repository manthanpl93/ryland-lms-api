/**
 * Typing indicator handler type definitions
 */

export interface TypingStartPayload {
  recipientId: string;
}

export interface TypingStopPayload {
  recipientId: string;
}

export interface TypingIndicatorData {
  userId: string;
  timestamp: string;
}

