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

const PORT = process.env.GATEWAY_PORT || 3001;
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const CHAT_SERVICE_URL = process.env.CHAT_SERVICE_URL;
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL;

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

const createFullPathProxy = (target, label) => {
  const proxy = createProxyMiddleware({
    target,
    changeOrigin: true,
    proxyTimeout: 60000,
    logLevel: "warn",
    onError(err, req) {
      console.error(
        `[proxy:${label}] ${req.method} ${req.originalUrl || req.url} -> ${target} failed:`,
        err.message
      );
    },
    onProxyReq(proxyReq, req) {
      if (process.env.DEBUG_PROXY === "true") {
        console.log(
          `[proxy:${label}] ${req.method} ${req.originalUrl || req.url} -> ${
            proxyReq.getHeader("host") || target
          }${proxyReq.path}`
        );
      }
    },
  });

  return (req, res, next) => {
    req.url = req.originalUrl || req.url;
    return proxy(req, res, next);
  };
};

/* ---------------------- AUTH SERVICE ---------------------- */
const authProxy = createFullPathProxy(AUTH_SERVICE_URL, "auth");

app.use("/api/auth", authProxy);
app.use("/api/contacts", authProxy);
app.use("/api/friend-requests", authProxy);
app.use("/api/block", authProxy);

/* ---------------------- CHAT SERVICE ---------------------- */
const chatProxy = createFullPathProxy(CHAT_SERVICE_URL, "chat");
app.use("/api/messages", chatProxy);
app.use("/api/groups", chatProxy);
app.use("/api/livekit", chatProxy);

/* ---------------------- MEDIA SERVICE ---------------------- */
const mediaProxy = createFullPathProxy(MEDIA_SERVICE_URL, "media");
app.use("/api/photos", mediaProxy);
app.use("/api/ai", mediaProxy);
app.use("/uploads", mediaProxy);

/* ---------------------- SOCKET PROXY ---------------------- */
const socketProxy = createProxyMiddleware({
  target: CHAT_SERVICE_URL,
  changeOrigin: true,
  ws: true,
  proxyTimeout: 60000,
  logLevel: "warn",
});
app.use("/socket.io", (req, res, next) => {
  req.url = req.originalUrl || req.url;
  socketProxy(req, res, next);
});

/* ---------------------- HEALTH ---------------------- */
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

/* ---------------------- START ---------------------- */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🌀 API Gateway running on 0.0.0.0:${PORT}`);
});
server.on("upgrade", socketProxy.upgrade);
