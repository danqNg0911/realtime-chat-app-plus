import "./config/loadEnv.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { buildCorsOptions } from "../shared/cors.js";

import photoRoutes from "./routes/PhotoRoutes.js";
import aiRoutes from "./routes/AiRoutes.js";
import { startPhotoCleanupJob } from "./helpers/photoCleanup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ensureDir = (dirPath) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
};

ensureDir(resolve(__dirname, "uploads/photos/temp"));
ensureDir(resolve(__dirname, "uploads/photos"));

const app = express();
const PORT = process.env.MEDIA_SERVICE_PORT || 4003;

app.use(cors(buildCorsOptions()));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(resolve(__dirname, "uploads")));

app.use("/api/photos", photoRoutes);
app.use("/api/ai", aiRoutes);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "media-ai-service",
    timestamp: new Date().toISOString(),
  });
});

const start = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ Media & AI service connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`🖼️ Media & AI Service listening on http://localhost:${PORT}`);
    });

    startPhotoCleanupJob();
  } catch (error) {
    console.error("❌ Failed to start Media & AI Service", error);
    process.exit(1);
  }
};

start();
