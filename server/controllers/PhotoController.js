import Photo from "../models/PhotoModel.js";
import User from "../models/UserModel.js";
import { renameSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { getSocketIO } from "../socket.js";

export const uploadPhoto = async (req, res) => {
    try {
        console.log("📤 Upload request received");
        console.log("userId:", req.userId);
        console.log("file:", req.file);
        console.log("caption:", req.body.caption);

        if (!req.file) {
            console.log("❌ No file in request");
            return res.status(400).json({ message: "No photo file uploaded" });
        }

        const userId = req.userId;
        const caption = req.body.caption || "";

        // Create photos directory if it doesn't exist
        const dir = "uploads/photos";
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true });
        }

        const date = Date.now();
        const fileName = `${dir}/${date}_${req.file.originalname}`;
        renameSync(req.file.path, fileName);

        // Create photo document
        const photo = new Photo({
            owner: userId,
            imageUrl: fileName,
            caption: caption.trim().substring(0, 300), // Limit to 300 chars
        });

        await photo.save();

        // Populate owner info for response
        await photo.populate("owner", "firstName lastName email image color");

        console.log("✅ Photo uploaded:", {
            photoId: photo._id,
            owner: userId,
            imageUrl: fileName,
        });

        // Emit socket event to notify friends
        const io = getSocketIO();
        const user = await User.findById(userId).select("friends");
        const friendEmails = user?.friends || [];

        // Convert friend emails to ObjectIds for socket routing
        const friendUsers = await User.find({ email: { $in: friendEmails } }).select("_id");
        const friendIds = friendUsers.map(f => f._id.toString());

        console.log(`📡 Emitting photoUploaded to ${friendIds.length} friends`);

        // Emit to all friends (socket handler will check if they're online)
        if (io) {
            io.emit("newPhotoUploaded", {
                photo,
                friendIds,
            });
        }

        return res.status(201).json({
            message: "Photo uploaded successfully",
            photo,
        });
    } catch (error) {
        console.error("❌ Error uploading photo:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message // Thêm error detail để debug
        });
    }
};

export const getPhotoFeed = async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        console.log(`\n📸 GET /api/photos/feed - Page ${page}`);
        console.log(`User ID: ${userId}`);

        // Get user's friends (stored as emails)
        const user = await User.findById(userId).select("friends");
        const friendEmails = user?.friends || [];

        console.log(`👥 User has ${friendEmails.length} friends`);

        // Convert friend emails to ObjectIds
        const friendUsers = await User.find({ email: { $in: friendEmails } }).select("_id");
        const friendIds = friendUsers.map(f => f._id);

        // Add user's own ID to see their photos too
        const userIds = [...friendIds, userId];

        console.log(`📊 Found ${friendIds.length} friend ObjectIds`);

        // Get photos from user + friends, sorted by newest first
        const photos = await Photo.find({ owner: { $in: userIds } })
            .sort({ createdAt: -1 }) // Newest first (Facebook style)
            .skip(skip)
            .limit(limit)
            .populate("owner", "firstName lastName email image color")
            .lean(); // Convert to plain JS objects for better performance

        // Get total count for pagination
        const totalPhotos = await Photo.countDocuments({
            owner: { $in: userIds },
        });

        console.log(`📊 Query results:`);
        console.log(`  - Total photos in DB: ${totalPhotos}`);
        console.log(`  - Photos returned this page: ${photos.length}`);
        console.log(`  - Skip: ${skip}, Limit: ${limit}`);

        // Add isLiked field for each photo
        const photosWithLikeStatus = photos.map((photo) => ({
            ...photo,
            isLiked: photo.likes.some((likeId) => likeId.toString() === userId),
        }));

        console.log(`✅ Sending ${photosWithLikeStatus.length} photos to client\n`);

        return res.status(200).json({
            photos: photosWithLikeStatus,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalPhotos / limit),
                totalPhotos,
                hasMore: skip + photos.length < totalPhotos,
            },
        });
    } catch (error) {
        console.error("❌ Error getting photo feed:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const likePhoto = async (req, res) => {
    try {
        const userId = req.userId;
        const photoId = req.params.id;

        const photo = await Photo.findById(photoId);

        if (!photo) {
            return res.status(404).json({ message: "Photo not found" });
        }

        // Add like using model method
        photo.addLike(userId);
        await photo.save();

        // Populate owner for socket event
        await photo.populate("owner", "firstName lastName email image color");

        console.log(`❤️ Photo liked: ${photoId} by user ${userId}`);

        // Emit socket event to photo owner
        const io = getSocketIO();
        if (io) {
            io.emit("photoLiked", {
                photoId: photo._id,
                likesCount: photo.likesCount,
                ownerId: photo.owner._id.toString(),
                likerId: userId,
            });
        }

        return res.status(200).json({
            message: "Photo liked",
            likesCount: photo.likesCount,
            isLiked: true,
            photo,
        });
    } catch (error) {
        console.error("❌ Error liking photo:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const unlikePhoto = async (req, res) => {
    try {
        const userId = req.userId;
        const photoId = req.params.id;

        const photo = await Photo.findById(photoId);

        if (!photo) {
            return res.status(404).json({ message: "Photo not found" });
        }

        // Remove like using model method
        photo.removeLike(userId);
        await photo.save();

        // Populate owner for socket event
        await photo.populate("owner", "firstName lastName email image color");

        console.log(`💔 Photo unliked: ${photoId} by user ${userId}`);

        // Emit socket event to photo owner
        const io = getSocketIO();
        if (io) {
            io.emit("photoUnliked", {
                photoId: photo._id,
                likesCount: photo.likesCount,
                ownerId: photo.owner._id.toString(),
                unlikerId: userId,
            });
        }

        return res.status(200).json({
            message: "Photo unliked",
            likesCount: photo.likesCount,
            isLiked: false,
            photo,
        });
    } catch (error) {
        console.error("❌ Error unliking photo:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deletePhoto = async (req, res) => {
    try {
        const userId = req.userId;
        const photoId = req.params.id;

        const photo = await Photo.findById(photoId);

        if (!photo) {
            return res.status(404).json({ message: "Photo not found" });
        }

        // Only owner can delete their photo
        if (photo.owner.toString() !== userId) {
            return res.status(403).json({ message: "Not authorized to delete this photo" });
        }

        // Delete physical file
        try {
            unlinkSync(photo.imageUrl);
        } catch (err) {
            console.warn("⚠️ Could not delete file:", photo.imageUrl);
        }

        // Delete from database
        await Photo.findByIdAndDelete(photoId);

        console.log(`🗑️ Photo deleted: ${photoId} by owner ${userId}`);

        // Emit socket event to notify friends
        const io = getSocketIO();
        const user = await User.findById(userId).select("friends");
        const friendEmails = user?.friends || [];

        // Convert friend emails to ObjectIds for socket routing
        const friendUsers = await User.find({ email: { $in: friendEmails } }).select("_id");
        const friendIds = friendUsers.map(f => f._id.toString());

        if (io) {
            io.emit("photoDeleted", {
                photoId,
                friendIds,
            });
        }

        return res.status(200).json({
            message: "Photo deleted successfully",
            photoId,
        });
    } catch (error) {
        console.error("❌ Error deleting photo:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getPhotoById = async (req, res) => {
    try {
        const photoId = req.params.id;
        const userId = req.userId;

        const photo = await Photo.findById(photoId)
            .populate("owner", "firstName lastName email image color")
            .lean();

        if (!photo) {
            return res.status(404).json({ message: "Photo not found" });
        }

        // Add isLiked field
        const photoWithLikeStatus = {
            ...photo,
            isLiked: photo.likes.some((likeId) => likeId.toString() === userId),
        };

        return res.status(200).json({ photo: photoWithLikeStatus });
    } catch (error) {
        console.error("❌ Error getting photo:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
