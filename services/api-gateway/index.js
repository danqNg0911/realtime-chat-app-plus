import express from "express";
import http from "http";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
import { createProxyMiddleware } from "http-proxy-middleware";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { buildCorsOptions } from "./cors.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "..", ".env") });

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection in gateway:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception in gateway:", error);
});

const PORT = process.env.GATEWAY_PORT || 3001;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://auth-user-service:4001";
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL || "http://chat-service:4002";
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || "http://media-ai-service:4003";

console.log("Gateway targets", {
  auth: AUTH_SERVICE_URL,
  chat: CHAT_SERVICE_URL,
  media: MEDIA_SERVICE_URL,
});

const app = express();
const server = http.createServer(app);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors(buildCorsOptions()));
app.use("/api", morgan("dev"));

const proxyTo = (target, options = {}) => {
  const baseOptions = {
    target,
    changeOrigin: true,
    proxyTimeout: 60_000,
  };

  if (!options.pathRewrite) {
    baseOptions.pathRewrite = (path, req) => req.originalUrl;
  }

  return createProxyMiddleware({
    ...baseOptions,
    ...options,
  });
};

// Auth & User related routes
app.use("/api/auth", proxyTo(AUTH_SERVICE_URL));
app.use("/api/contacts", proxyTo(AUTH_SERVICE_URL));
app.use("/api/friend-requests", proxyTo(AUTH_SERVICE_URL));
app.use("/api/block", proxyTo(AUTH_SERVICE_URL));

// Chat related routes (messages, groups, livekit)
app.use("/api/messages", proxyTo(CHAT_SERVICE_URL));
app.use("/api/groups", proxyTo(CHAT_SERVICE_URL));
app.use("/api/livekit", proxyTo(CHAT_SERVICE_URL));

// Media & AI routes
app.use("/api/photos", proxyTo(MEDIA_SERVICE_URL));
app.use("/api/ai", proxyTo(MEDIA_SERVICE_URL));
app.use("/uploads", proxyTo(MEDIA_SERVICE_URL));

// Socket.io proxy to chat service
const socketProxy = createProxyMiddleware({
  target: CHAT_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60_000,
});
app.use("/socket.io", socketProxy);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
    targets: {
      auth: AUTH_SERVICE_URL,
      chat: CHAT_SERVICE_URL,
      media: MEDIA_SERVICE_URL,
    },
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌀 API Gateway running on 0.0.0.0:${PORT}`);
});

server.on("upgrade", socketProxy.upgrade);
