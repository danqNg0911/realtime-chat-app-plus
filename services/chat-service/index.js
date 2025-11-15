import "./config/loadEnv.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import http from "http";
import { buildCorsOptions } from "../shared/cors.js";

import messagesRoutes from "./routes/MessagesRoutes.js";
import groupRoutes from "./routes/GroupRoutes.js";
import livekitRoutes from "./routes/LivekitRoutes.js";
import internalEventsRoutes from "./routes/InternalEventsRoutes.js";
import setupSocket from "./socket.js";

const app = express();
const server = http.createServer(app);
const PORT = process.env.CHAT_SERVICE_PORT || 4002;

app.use(cors(buildCorsOptions()));
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

setupSocket(server);

const start = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ Chat service connected to MongoDB");

    server.listen(PORT, () => {
      console.log(`💬 Chat Service listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start Chat Service", error);
    process.exit(1);
  }
};

start();
