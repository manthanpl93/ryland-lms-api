import path from "path";
import favicon from "serve-favicon";
import compress from "compression";
import helmet from "helmet";
import cors from "cors";

console.log("🚀 App.ts is being loaded...");

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
  }),
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

console.log("🔧 About to configure socket.io...");
app.configure(
  socketio({ maxHttpBufferSize: 5 * 1e9 }, function (io) {
    console.log("🚀 Socket.io server configured and listening for connections...");
    io.use(async function (socket: CustomSocket, next) {
      try {
        console.log("🔐 Socket authentication attempt...");
        console.log("   📍 Socket ID:", socket.id);
        console.log("   🌐 Handshake query:", JSON.stringify(socket?.handshake?.query, null, 2));
        console.log("   🎫 Token received:", socket?.handshake?.query?.token ? "Yes" : "No");
        console.log("   🔍 Raw token value:", socket?.handshake?.query?.token);
        
        if (!socket?.handshake?.query?.token) {
          console.log("❌ No token provided - rejecting connection");
          return next(new Error("Authentication token required"));
        }

        console.log("🔍 Verifying access token...");
        console.log("   🎯 Calling authentication service...");
        
        let result;
        try {
          result = await app
            .service("authentication")
            .verifyAccessToken(socket?.handshake?.query?.token);
          
          console.log("   📋 Token verification result:", {
            success: !!result,
            hasSub: !!result?.sub,
            sub: result?.sub || "None",
            resultType: typeof result,
            resultKeys: result ? Object.keys(result) : "No result"
          });
        } catch (authError: any) {
          console.error("   ❌ Authentication service error:", authError);
          console.error("   🔍 Auth error details:", {
            message: authError?.message,
            name: authError?.name,
            stack: authError?.stack
          });
          throw authError;
        }
        
        if (!result || !result.sub) {
          console.log("❌ Invalid token - rejecting connection");
          return next(new Error("Invalid authentication token"));
        }
        
        console.log("👤 Retrieving user from database...");
        const user = await app.service("users").get(result.sub);
        if (!user) {
          console.log("❌ User not found - rejecting connection");
          return next(new Error("User not found"));
        }
        
        console.log("   ✅ User retrieved successfully");
        
        console.log("✅ Socket authenticated successfully for user:", user.email);
        console.log("   👤 User ID:", user._id);
        console.log("   📧 Email:", user.email);
        
        socket.handshake.query.user = user;
        next();
      } catch (e: any) {
        console.error("❌ Socket authentication failed:", e);
        console.error("   🔍 Error details:", {
          message: e?.message || "Unknown error",
          name: e?.name || "Unknown",
          stack: e?.stack || "No stack trace"
        });
        return next(new Error("Authentication failed: " + (e?.message || "Unknown error")));
      }
    });

    io.on("connection", function (socket: CustomSocket) {
      console.log("🔌 New socket connection established");
      console.log("   📍 Socket ID:", socket.id);
      console.log("   🌐 Handshake query:", JSON.stringify(socket?.handshake?.query, null, 2));
      console.log("   👤 User:", socket?.handshake?.query?.user ? "Authenticated" : "Unauthenticated");
      
      if (socket?.handshake?.query?.user) {
        const user = socket.handshake.query.user;
        console.log("   ✅ Authenticated user details:");
        console.log("      🆔 User ID:", user._id);
        console.log("      📧 Email:", user.email);
        
        const socketId = socket.id;
        const userId = user._id as string;
        
        setSocketById(socketId, socket);
        addSocketToUser(userId, socket);
        initializeEvents(socket, io, app);
        
        console.log("   🎯 Socket registered and events initialized");
      } else {
        console.log("   ⚠️ Unauthenticated socket - checking for worker connection...");
        socket.on("workerConnectionRequest", (data: any) => {
          const workerToken = app.get("workerSocketToken");
          const { token } = data;
          if (workerToken === token) {
            console.log("   🔧 Worker socket connected successfully");
            setWorkerSocket(socket);
            initializeWorkerSocketEvents(socket);
          } else {
            console.log("   ❌ Invalid worker token - disconnecting");
            socket.disconnect();
          }
        });
      }
    });
  }),
);

// Set up our services (see `services/index.ts`)
app.configure(services);
// Set up event channels (see channels.ts)
app.configure(channels);

// The error handler must be registered before any other error middleware and after all controllers
// app.use(Sentry.Handlers.errorHandler());

// Configure a middleware for 404s and the error handler
app.use(express.notFound());
app.use(express.errorHandler({ logger } as any));

app.hooks(appHooks);
dotenv.config({ path: `.env.${process.env.NODE_ENV ?? "development"}` });

// After all app configuration and before export
initializeAIQuizProcessor(app);

console.log("✅ App.ts loaded completely");
export default app;
