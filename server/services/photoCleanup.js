import cron from "node-cron";
import Photo from "../models/PhotoModel.js";
import { unlinkSync } from "fs";

/**
 * Auto-delete photos older than 24 hours
 * Runs every hour to clean up old photos
 */
export const startPhotoCleanupJob = () => {
    // Run every hour (at minute 0)
    cron.schedule("0 * * * *", async () => {
        try {
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            console.log("🧹 Running photo cleanup job...");
            console.log(`Looking for photos older than: ${twentyFourHoursAgo.toISOString()}`);

            // Find photos older than 24 hours
            const oldPhotos = await Photo.find({
                createdAt: { $lt: twentyFourHoursAgo },
            });

            if (oldPhotos.length === 0) {
                console.log("✅ No old photos to delete");
                return;
            }

            console.log(`📸 Found ${oldPhotos.length} photos to delete`);

            let deletedCount = 0;
            let fileDeleteErrors = 0;

            for (const photo of oldPhotos) {
                try {
                    // Delete physical file
                    try {
                        unlinkSync(photo.imageUrl);
                    } catch (fileErr) {
                        console.warn(`⚠️ Could not delete file: ${photo.imageUrl}`);
                        fileDeleteErrors++;
                    }

                    // Delete from database
                    await Photo.findByIdAndDelete(photo._id);
                    deletedCount++;
                } catch (error) {
                    console.error(`❌ Error deleting photo ${photo._id}:`, error.message);
                }
            }

            console.log(`✅ Cleanup complete: ${deletedCount} photos deleted`);
            if (fileDeleteErrors > 0) {
                console.warn(`⚠️ ${fileDeleteErrors} file deletion errors`);
            }
        } catch (error) {
            console.error("❌ Error in photo cleanup job:", error);
        }
    });

    console.log("⏰ Photo cleanup job scheduled (runs every hour)");
};

/**
 * Manual cleanup function (can be called anytime)
 */
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
