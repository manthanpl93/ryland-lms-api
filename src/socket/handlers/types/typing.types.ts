/**
 * Typing indicator handler type definitions
 */

export interface TypingStartPayload {
  recipientId: string;
  conversationId?: string;
}

export interface TypingStopPayload {
  recipientId: string;
  conversationId?: string;
}

export interface TypingIndicatorData {
  userId: string;
  conversationId?: string;
  timestamp: string;
}

