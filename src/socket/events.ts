import { removeSocketById, removeSocketId } from "./sockets";
import { registerAIQuizEvents } from "./ai-quiz-events";
import { CustomSocket } from "../types/socket.types";

const lockTextField = (socket: CustomSocket, app: any) => {
  socket.on("lockTextField", function (data: any) {
    socket.broadcast.emit("setLockedBoxes", {
      ...data,
      user: socket.handshake.query.user,
    });

    const query = { fieldId: data.fieldId };

    const lockService: any = app.service("lock");

    lockService
      .updateOrInsert(query, {
        ...data,
        user: socket.handshake.query.user,
      })
      .catch((e: any) => {
        console.log("Error", e);
      });
  });
};

const addValueToArray = (socket: CustomSocket, app: any) => {
  socket.on("addValueToArray", function (data: any) {
    socket.broadcast.emit("updateArrayValues", data);

    const query = { field: data.field, courseId: data.courseId };

    const lockService: any = app.service("array-state");

    lockService
      .updateOrInsert(query, {
        ...data,
      })
      .catch((e: any) => {
        console.log("Error", e);
      });
  });
};

const unlockTextField = (socket: CustomSocket) => {
  socket.on("unlockTextField", function (data: any) {
    socket.broadcast.emit("unlockBoxes", data);
  });
};
const disconnet = (socket: CustomSocket, io: any, app: any) => {
  socket.on("disconnect", () => {
    const rooms = Object.keys(io.sockets.adapter.rooms);

    rooms.map((r: any) => {
      io.in(r).clients((err: any, clients: any[]) => {
        const connectedUsers = clients
          .map((c) => io?.sockets?.connected?.[c])
          .filter((socket) => socket && socket.handshake && socket.handshake.query)
          .map((socket) => socket.handshake.query.user)
          .filter((user) => user);
        io.to(r).emit("connectedUsers", {
          courseId: r,
          connectedUsers,
        });
      });
    });

    const user = socket.handshake.query.user;
    if (user) {
      app
        .service("lock")
        .Model.deleteMany({ "user._id": user._id }, (err: any, result: any) => {
          if (err) {
            console.error(err);
          } else {
            console.log(`${result.deletedCount} documents removed`);
          }
        });
    }

    removeSocketById(socket.id);
    removeSocketId(socket.id);
  });
};

const joinRoom = (socket: CustomSocket, io: any) => {
  socket.on("joinRoom", (data: any) => {
    socket.join(data.courseId);
    io.in(data.courseId).clients((err: any, clients: any[]) => {
      const connectedUsers = clients
        .map((c) => io?.sockets?.connected?.[c])
        .filter((socket) => socket && socket.handshake && socket.handshake.query)
        .map((socket) => socket.handshake.query.user)
        .filter((user) => user);
      io.to(data.courseId).emit("connectedUsers", {
        courseId: data.courseId,
        connectedUsers,
      });
    });
  });
};

const leaveRoom = (socket: CustomSocket, io: any, app: any) => {
  socket.on("leaveRoom", (data: any) => {
    socket.leave(data.courseId);
    io.in(data.courseId).clients((err: any, clients: any[]) => {
      const connectedUsers = clients
        .map((c) => io?.sockets?.connected?.[c])
        .filter((socket) => socket && socket.handshake && socket.handshake.query)
        .map((socket) => socket.handshake.query.user)
        .filter((user) => user);
      io.to(data.courseId).emit("connectedUsers", {
        courseId: data.courseId,
        connectedUsers,
      });
    });
    const user = socket.handshake.query.user;
    if (user) {
      app
        .service("lock")
        .Model.deleteMany({ "user._id": user._id }, (err: any, result: any) => {
          if (err) {
            console.error(err);
          } else {
            console.log(`${result.deletedCount} documents removed`);
          }
        });
    }
  });
};

const initializeEvents = (socket: CustomSocket, io: any, app: any) => {
  lockTextField(socket, app);
  addValueToArray(socket, app);
  unlockTextField(socket);

  disconnet(socket, io, app);
  joinRoom(socket, io);
  leaveRoom(socket, io, app);

  // Register AI Quiz events
  registerAIQuizEvents(socket, app);
};

export default initializeEvents;
