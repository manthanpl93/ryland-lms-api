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