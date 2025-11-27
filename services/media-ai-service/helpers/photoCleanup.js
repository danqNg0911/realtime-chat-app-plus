import cron from "node-cron";
import Photo from "../models/PhotoModel.js";
import { unlinkSync } from "fs";

export const startPhotoCleanupJob = () => {
  cron.schedule("0 * * * *", async () => {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const oldPhotos = await Photo.find({
        createdAt: { $lt: twentyFourHoursAgo },
      });

      if (oldPhotos.length === 0) {
        return;
      }

      for (const photo of oldPhotos) {
        try {
          try {
            unlinkSync(photo.imageUrl);
          } catch (fileErr) {
            console.warn(`⚠️ Could not delete file: ${photo.imageUrl}`);
          }
          await Photo.findByIdAndDelete(photo._id);
        } catch (error) {
          console.error(`❌ Error deleting photo ${photo._id}:`, error.message);
        }
      }
    } catch (error) {
      console.error("❌ Error in photo cleanup job:", error);
    }
  });

  console.log("⏰ Photo cleanup job scheduled (runs every hour)");
};

export const cleanupOldPhotos = async () => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const oldPhotos = await Photo.find({
    createdAt: { $lt: twentyFourHoursAgo },
  });

  for (const photo of oldPhotos) {
    try {
      unlinkSync(photo.imageUrl);
    } catch (err) {
      // Ignore file errors
    }
    await Photo.findByIdAndDelete(photo._id);
  }

  return oldPhotos.length;
};
