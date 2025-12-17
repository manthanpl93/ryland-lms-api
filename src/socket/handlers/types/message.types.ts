/**
 * Message handler type definitions
 */

export interface MessageSendPayload {
  conversationId: string;
  recipientId: string;
  content: string;
  tempId?: string;
}

export interface Message {
  id: string;
  tempId?: string;
  from: string;
  to: string;
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  conversationId: string;
}

export interface MessageDeliveredPayload {
  messageId: string;
  tempId?: string;
  timestamp: string;
  recipientOnline: boolean;
}

export interface MessageReadPayload {
  messageId: string;
  senderId: string;
}

export interface MessageReadConfirmation {
  messageId: string;
  readBy: string;
  readAt: string;
}

export interface MessageUpdatePayload {
  messageId: string;
  content: string;
  recipientId: string;
}

export interface MessageDeletePayload {
  messageId: string;
  recipientId: string;
}

export interface MessageErrorPayload {
  error: string;
  messageId?: string;
  tempId?: string;
}
