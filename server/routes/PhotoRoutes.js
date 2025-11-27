import { Router } from "express";
import multer from "multer";
import {
    uploadPhoto,
    getPhotoFeed,
    likePhoto,
    unlikePhoto,
    deletePhoto,
    getPhotoById,
} from "../controllers/PhotoController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";

const photoRoutes = Router();

// Configure multer for photo uploads
const upload = multer({
    dest: "uploads/photos/temp", // Temporary storage before renaming
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
        // Only accept image files
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"), false);
        }
    },
});

// All routes require authentication
photoRoutes.post("/upload", verifyToken, upload.single("photo"), uploadPhoto);
photoRoutes.get("/feed", verifyToken, getPhotoFeed);
photoRoutes.get("/:id", verifyToken, getPhotoById);
photoRoutes.post("/:id/like", verifyToken, likePhoto);
photoRoutes.delete("/:id/like", verifyToken, unlikePhoto);
photoRoutes.delete("/:id", verifyToken, deletePhoto);

export default photoRoutes;
