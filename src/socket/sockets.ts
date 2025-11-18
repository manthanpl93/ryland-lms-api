import fs from "fs";
import path from "path";
import app from "../app";

const socketsById: any = {};
const socketIdsByUserId: any = {};
const userIdBySocketId: any = {};
const bulkUploadData: any = {};
let workerSocket: any = null;
export const setSocketById = (id: any, socket: any) => {
  socketsById[id] = socket;
};

export const getSocketById = (id: any) => {
  return socketsById[id];
};

export const getAllSocketIds = () => {
  return Object.keys(socketsById);
};

export const removeSocketById = (id: any) => {
  delete socketsById[id];
};

export const setBulkUploadDataByUserId = (userId: any, data: any) => {
  bulkUploadData[userId] = data;
};

export const getBulkUploadDataByUserId = (userId: any) => {
  return bulkUploadData[userId];
};

export const removeBulkUploadDataByUserId = (userId: any) => {
  delete bulkUploadData[userId];
};

// remove socket
export const addSocketIdToUserId = (userId: any, socketId: any) => {
  let socketIds = socketIdsByUserId[userId];
  if (!socketIds) {
    socketIds = [];
    socketIdsByUserId[userId] = socketIds;
  }
  socketIds.push(socketId);
  addSocketIdToUserMapping(userId, socketId);
};

export const getSocketIdsByUserId = (userId: any) => {
  return socketIdsByUserId[userId];
};

export const removeSocketId = (socketId: any) => {
  const userId = getUserIdFromSocketId(socketId);
  if (!userId) return;
  const socketIds = getSocketIdsByUserId(userId);
  if (!socketIds) return;
  const idx = socketIds.indexOf(socketId);
  if (idx !== -1) socketIds.splice(idx, 1);
  removeSocketIdToUserIdMapping(socketId);
  if (!socketIds.length) delete socketIdsByUserId[userId];
};

export const addSocketIdToUserMapping = (userId: any, socketId: any) => {
  userIdBySocketId[socketId] = userId;
};

export const removeSocketIdToUserIdMapping = (socketId: any) => {
  delete userIdBySocketId[socketId];
};

export const getUserIdFromSocketId = (socketId: any) => {
  return userIdBySocketId[socketId];
};

export const addSocketToUser = (userId: any, socket: any) => {
  const socketId = socket.id;
  socketsById[socketId] = socket;
  addSocketIdToUserId(userId, socketId);
};

export const removeSocket = (socket: any) => {
  removeSocketId(socket.id);
  delete socketsById[socket.id];
};

export const setWorkerSocket = (socket: any) => {
  workerSocket = socket;
};
export const getWorkerSocket = () => workerSocket;
export const initializeWorkerSocketEvents = (socket: any) => {
  socket.on("disconnect", () => {
    console.log("worker socket disconnected");
    setWorkerSocket(null);
  });

  socket.on("reportGenerationProgress", (data: any) => {
    try {
      const { socketId, status, total, completed } = data;

      let progress = "";
      if (status === "downloading") {
        const percentage = (completed / (total * 2)) * 100;
        progress = `Downloading certificates - ${percentage.toFixed(2)}%`;
      } else if (status === "merging") {
        const percentage = ((total + completed) / (total * 2)) * 100;
        progress = `Merging - ${percentage.toFixed(2)}%`;
      } else {
        progress = "Starting download";
      }

      const socket = app.io.sockets.sockets[socketId];
      socket.emit("reportProgress", { progress });
    } catch (err) {
      console.log("error while updating report progress", err);
    }
  });
};
