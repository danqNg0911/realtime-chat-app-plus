import "./config/loadEnv.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import mongoose from "mongoose";
import passport from "./config/passport.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { buildCorsOptions } from "../shared/cors.js";

import authRoutes from "./routes/AuthRoutes.js";
import contactRoutes from "./routes/ContactRoutes.js";
import friendRequestsRoutes from "./routes/FriendRequestsRoute.js";
import blockRoutes from "./routes/BlockRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.AUTH_SERVICE_PORT || 4001;

app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/friend-requests", friendRequestsRoutes);
app.use("/api/block", blockRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "auth-user-service",
    timestamp: new Date().toISOString(),
  });
});

const start = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`🔐 Auth & User Service running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start Auth & User Service", error);
    process.exit(1);
  }
};

start();
