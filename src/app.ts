import path from "path";
import favicon from "serve-favicon";
import compress from "compression";
import helmet from "helmet";
import cors from "cors";

import feathers from "@feathersjs/feathers";
import configuration from "@feathersjs/configuration";
import express from "@feathersjs/express";
import socketio from "@feathersjs/socketio";
import dotenv from "dotenv";

import { Application } from "./declarations";
import logger from "./logger";
import middleware from "./middleware";
import services from "./services";
import appHooks from "./app.hooks";
import channels from "./channels";
import { HookContext as FeathersHookContext } from "@feathersjs/feathers";
import authentication from "./authentication";
import mongoose from "./mongoose";
import initializeEvents from "./socket/events";
import {
  setSocketById,
  addSocketToUser,
  setWorkerSocket,
  initializeWorkerSocketEvents,
} from "./socket/sockets";
import { initializeAIQuizProcessor } from "./processors/ai-quiz-processor";
import { CustomSocket } from "./types/socket.types";
// @ts-expect-error - CommonJS modules for chat socket
import connectionManager from "./socket/connectionManager";
// @ts-expect-error - CommonJS modules for chat socket
import messageHandler from "./socket/handlers/messageHandler";
// @ts-expect-error - CommonJS modules for chat socket
import typingHandler from "./socket/handlers/typingHandler";
// @ts-expect-error - CommonJS modules for chat socket
import { EVENT_GROUPS } from "./socket/constants/events";

const app: Application = express(feathers());
export type HookContext<T = any> = {
  app: Application;
} & FeathersHookContext<T>;

// Load app configuration
app.configure(configuration());
// Sentry.init({
//   dsn: "",
//   integrations: [
//     // enable HTTP calls tracing
//     new Sentry.Integrations.Http({ tracing: true }),
//     // enable Express.js middleware tracing
//     new Sentry.Integrations.Express({ app }),
//     new ProfilingIntegration(),
//   ],
//   // Performance Monitoring
//   tracesSampleRate: 1.0, //  Capture 100% of the transactions
//   // Set sampling rate for profiling - this is relative to tracesSampleRate
//   profilesSampleRate: 1.0,
// });
// The request handler must be the first middleware on the app
// app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
// app.use(Sentry.Handlers.tracingHandler());
// Enable security, CORS, compression, favicon and body parsing
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(cors());
app.use(compress());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(favicon(path.join(app.get("public"), "favicon.ico")));
// Host the public folder
app.use("/", express.static(app.get("public")));

// Set up Plugins and providers
app.configure(express.rest());

app.configure(mongoose);

// Configure other middleware (see `middleware/index.ts`)
app.configure(middleware);
app.configure(authentication);

app.configure(
  socketio({ maxHttpBufferSize: 5 * 1e9 }, function (io) {
    // Store app reference for chat handlers to access services
    (io as any).app = app;
    
    io.use(async function (socket: CustomSocket, next) {
      try {
        if (!socket?.handshake?.query?.token) {
          console.log("❌ Socket authentication failed: No token provided");
          return next(new Error("Authentication token required"));
        }

        const result = await app
          .service("authentication")
          .verifyAccessToken(socket?.handshake?.query?.token);

        if (!result || !result.sub) {
          console.log("❌ Socket authentication failed: Invalid token");
          return next(new Error("Invalid authentication token"));
        }

        const user = await app.service("users").get(result.sub);
        if (!user) {
          console.log("❌ Socket authentication failed: User not found");
          return next(new Error("User not found"));
        }

        console.log(`✅ Socket authenticated: ${user.email} (${user._id})`);

        socket.handshake.query.user = user;
        next();
      } catch (e: any) {
        console.error(`❌ Socket authentication failed: ${e?.message || "Unknown error"}`);
        return next(
          new Error("Authentication failed: " + (e?.message || "Unknown error"))
        );
      }
    });

    io.on("connection", function (socket: CustomSocket) {
      if (socket?.handshake?.query?.user) {
        const user = socket.handshake.query.user;
        const socketId = socket.id;
        const userId = user._id.toString();

        setSocketById(socketId, socket);
        addSocketToUser(userId, socket);
        initializeEvents(socket, io, app);

        // Initialize chat messaging handlers
        socket.user = user; // Add user to socket for chat handlers
        
        // Query classIds based on role for chat
        (async () => {
          try {
            let classIds: string[] = [];
            
            // Normalize role to lowercase for comparison
            const userRoleLower = (user.role || "").toLowerCase();

            if (userRoleLower === "teacher") {
              const teacherClasses = await app.service("class-teachers").find({
                query: {
                  teacherId: userId,
                  isActive: true,
                  $select: ["classId"],
                },
                paginate: false,
                user: user,
              });
              classIds = teacherClasses.map((tc: any) => tc.classId.toString());
            } else if (userRoleLower === "student") {
              const enrollments = await app.service("class-enrollments").find({
                query: {
                  studentId: userId,
                  status: "Active",
                  $select: ["classId"],
                },
                paginate: false,
                user: user,
              });
              classIds = enrollments.map((e: any) => e.classId.toString());
            }

            // Add connection to chat connection manager
            connectionManager.addConnection(userId, socket, {
              userRole: user.role,
              schoolId: user.schoolId?.toString(),
              classIds: classIds,
            });
            
            console.log(`✅ Connection added: ${user.email} (${userId})`);

            // Get broadcast targets and notify
            const targets = connectionManager.getBroadcastTargetsForUser(userId);
            targets.forEach((targetUserId: string) => {
              connectionManager.emitToUser(targetUserId, EVENT_GROUPS.USER.ONLINE, {
                userId: userId,
                userRole: user.role,
                timestamp: new Date().toISOString(),
              });
            });

            // Register chat message and typing handlers
            messageHandler(io, socket, connectionManager);
            typingHandler(io, socket, connectionManager);
          } catch (error: any) {
            console.error(`❌ Error initializing chat handlers: ${error.message}`);
          }
        })();
        
        // Handle disconnect for chat
        socket.on("disconnect", () => {
          // Check if this was the last connection
          const wasLastConnection =
            connectionManager.getUserSockets(userId).length === 1;

          connectionManager.removeConnection(userId, socket.id);

          // Broadcast user offline status if no more connections
          if (wasLastConnection) {
            const targets = connectionManager.getBroadcastTargetsForUser(userId);
            targets.forEach((targetUserId: string) => {
              connectionManager.emitToUser(
                targetUserId,
                EVENT_GROUPS.USER.OFFLINE,
                {
                  userId: userId,
                  timestamp: new Date().toISOString(),
                }
              );
            });
          }
        });
      } else {
        socket.on("workerConnectionRequest", (data: any) => {
          const workerToken = app.get("workerSocketToken");
          const { token } = data;
          if (workerToken === token) {
            setWorkerSocket(socket);
            initializeWorkerSocketEvents(socket);
          } else {
            socket.disconnect();
          }
        });
      }
    });
  })
);

// Set up our services (see `services/index.ts`)
app.configure(services);
// Set up event channels (see channels.ts)
app.configure(channels);

// Chat messaging is now integrated into the main socket server above
// No need for separate chat socket initialization

// The error handler must be registered before any other error middleware and after all controllers
// app.use(Sentry.Handlers.errorHandler());

// Configure a middleware for 404s and the error handler
app.use(express.notFound());
app.use(express.errorHandler({ logger } as any));

app.hooks(appHooks);
dotenv.config({ path: `.env.${process.env.NODE_ENV ?? "development"}` });

// After all app configuration and before export
initializeAIQuizProcessor(app);

export default app;
