import Photo from "../models/PhotoModel.js";
import User from "../models/UserModel.js";
import { renameSync, unlinkSync, existsSync, mkdirSync } from "fs";
import {
  notifyPhotoDeleted,
  notifyPhotoLiked,
  notifyPhotoUnliked,
  notifyPhotoUploaded,
} from "../helpers/internalEventsClient.js";

const ensureUploadDir = (dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

export const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No photo file uploaded" });
    }

    const userId = req.userId;
    const caption = req.body.caption || "";

    const tempDir = "uploads/photos/temp";
    const finalDir = "uploads/photos";
    ensureUploadDir(tempDir);
    ensureUploadDir(finalDir);

    const date = Date.now();
    const fileName = `${finalDir}/${date}_${req.file.originalname}`;
    renameSync(req.file.path, fileName);

    const photo = new Photo({
      owner: userId,
      imageUrl: fileName,
      caption: caption.trim().substring(0, 300),
    });

    await photo.save();
    await photo.populate("owner", "firstName lastName email image color");

    const user = await User.findById(userId).select("friends");
    const friendEmails = user?.friends || [];
    const friendUsers = await User.find({ email: { $in: friendEmails } }).select(
      "_id"
    );
    const friendIds = friendUsers.map((f) => f._id.toString());

    notifyPhotoUploaded({ photo, friendIds });

    return res.status(201).json({
      message: "Photo uploaded successfully",
      photo,
    });
  } catch (error) {
    console.error("❌ Error uploading photo:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getPhotoFeed = async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const user = await User.findById(userId).select("friends");
    const friendEmails = user?.friends || [];

    const friendUsers = await User.find({ email: { $in: friendEmails } }).select(
      "_id"
    );
    const friendIds = friendUsers.map((f) => f._id);
    const userIds = [...friendIds, userId];

    const photos = await Photo.find({ owner: { $in: userIds } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("owner", "firstName lastName email image color")
      .lean();

    const totalPhotos = await Photo.countDocuments({ owner: { $in: userIds } });

    const photosWithLikeStatus = photos.map((photo) => ({
      ...photo,
      isLiked: photo.likes.some((likeId) => likeId.toString() === userId),
    }));

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

    photo.addLike(userId);
    await photo.save();
    await photo.populate("owner", "firstName lastName email image color");

    notifyPhotoLiked({
      photoId: photo._id,
      likesCount: photo.likesCount,
      ownerId: photo.owner._id.toString(),
      likerId: userId,
      isLiked: true,
    });

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

    photo.removeLike(userId);
    await photo.save();
    await photo.populate("owner", "firstName lastName email image color");

    notifyPhotoUnliked({
      photoId: photo._id,
      likesCount: photo.likesCount,
      ownerId: photo.owner._id.toString(),
      unlikerId: userId,
      isLiked: false,
    });

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

    if (photo.owner.toString() !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this photo" });
    }

    try {
      unlinkSync(photo.imageUrl);
    } catch (err) {
      console.warn("⚠️ Could not delete file:", photo.imageUrl);
    }

    await Photo.findByIdAndDelete(photoId);

    const user = await User.findById(userId).select("friends");
    const friendEmails = user?.friends || [];
    const friendUsers = await User.find({ email: { $in: friendEmails } }).select(
      "_id"
    );
    const friendIds = friendUsers.map((f) => f._id.toString());

    notifyPhotoDeleted({ photoId, friendIds });

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
