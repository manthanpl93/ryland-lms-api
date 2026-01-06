/**
 * Socket event constants organized by feature
 * Format: feature:action
 */
const EVENT_GROUPS = {
  // User presence events
  USER: {
    ONLINE: "user:online", // User came online
    OFFLINE: "user:offline", // User went offline
  },

  // Message events
  MESSAGE: {
    SEND: "message:send", // Client sends message
    RECEIVE: "message:receive", // Client receives message
    DELIVERED: "message:delivered", // Message delivered confirmation
    READ: "message:read", // Message read confirmation
    UPDATE: "message:update", // Update existing message
    DELETE: "message:delete", // Delete message
    ERROR: "message:error", // Message operation error
  },

  // Typing indicator events
  TYPING: {
    START: "typing:start", // User started typing
    STOP: "typing:stop", // User stopped typing
  },
};

/**
 * Client-to-Server events
 * Events that clients emit to the server
 */
const CLIENT_TO_SERVER = [
  EVENT_GROUPS.MESSAGE.SEND,
  EVENT_GROUPS.MESSAGE.READ,
  EVENT_GROUPS.MESSAGE.UPDATE,
  EVENT_GROUPS.MESSAGE.DELETE,
  EVENT_GROUPS.TYPING.START,
  EVENT_GROUPS.TYPING.STOP,
];

/**
 * Server-to-Client events
 * Events that server emits to clients
 */
const SERVER_TO_CLIENT = [
  EVENT_GROUPS.USER.ONLINE,
  EVENT_GROUPS.USER.OFFLINE,
  EVENT_GROUPS.MESSAGE.RECEIVE,
  EVENT_GROUPS.MESSAGE.DELIVERED,
  EVENT_GROUPS.MESSAGE.READ,
  EVENT_GROUPS.MESSAGE.UPDATE,
  EVENT_GROUPS.MESSAGE.DELETE,
  EVENT_GROUPS.MESSAGE.ERROR,
  EVENT_GROUPS.TYPING.START,
  EVENT_GROUPS.TYPING.STOP,
];

module.exports = {
  EVENT_GROUPS,
  CLIENT_TO_SERVER,
  SERVER_TO_CLIENT,
};
