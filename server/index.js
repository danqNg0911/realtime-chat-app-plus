import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import session from "express-session";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the server directory
dotenv.config({ path: join(__dirname, ".env") });

import passport from "./config/passport.js";
import authRoutes from "./routes/AuthRoutes.js";
import contactsRoutes from "./routes/ContactRoutes.js";
import messagesRoutes from "./routes/MessagesRoutes.js";
import groupRoutes from "./routes/GroupRoutes.js";
import setupSocket from "./socket.js";
import friendRequestsRoutes from "./routes/FriendRequestsRoute.js";
import aiRoutes from "./routes/AiRoutes.js";
import blockRoutes from "./routes/BlockRoutes.js";
import photoRoutes from "./routes/PhotoRoutes.js";
import { startPhotoCleanupJob } from "./services/photoCleanup.js";

const app = express();
const port = process.env.PORT || 3001;
const databaseURL = process.env.DATABASE_URL;

app.use(
  cors({
    origin: [process.env.ORIGIN],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

// Session middleware (required for passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/friend-requests", friendRequestsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/block", blockRoutes);
app.use("/api/photos", photoRoutes);

// Serve uploaded files (photos, avatars, etc.)
app.use("/uploads", express.static(join(__dirname, "uploads")));

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port} at http://localhost:${port}`);
});

setupSocket(server);

mongoose
  .connect(databaseURL)
  .then(() => {
    console.log("Connected to MongoDB successfully.");

    // Start photo cleanup job after DB connection
    startPhotoCleanupJob();
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
  });
