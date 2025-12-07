import "./config/loadEnv.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import http from "http";

//import redis
import { createClient } from "redis";
import { startChatWorker } from "./chatWorker.js";
//

import corsMiddleware from "./cors.js";

import messagesRoutes from "./routes/MessagesRoutes.js";
import groupRoutes from "./routes/GroupRoutes.js";
import livekitRoutes from "./routes/LivekitRoutes.js";
import internalEventsRoutes from "./routes/InternalEventsRoutes.js";
import setupSocket from "./socket.js";

const app = express();
const server = http.createServer(app);
const PORT = process.env.CHAT_SERVICE_PORT || 4002;

// Cấu hình Redis
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

// Gắn Redis vào app để các Controller dùng được (Thay vì dùng getUserSocketMap)
app.set("redisClient", pubClient);

app.use(corsMiddleware);
app.use(express.json());
app.use(cookieParser());

app.use("/api/messages", messagesRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/livekit", livekitRoutes);
app.use("/internal/events", internalEventsRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "chat-service",
    timestamp: new Date().toISOString(),
  });
});

// setupSocket(server); 

const start = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("Chat service connected to MongoDB");

    //Kết nối Redis
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log(`Redis Adapter connected to ${REDIS_URL}`);

    //Truyền client vào socket
    setupSocket(server, pubClient, subClient);

    startChatWorker(pubClient); // Khởi động Chat Worker

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`💬 Chat Service listening on port ${PORT} (0.0.0.0)`);
    });
  } catch (error) {
    console.error("Failed to start Chat Service", error);
    process.exit(1);
  }
};

start();