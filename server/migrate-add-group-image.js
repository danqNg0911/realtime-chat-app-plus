import "./config/loadEnv.js";
import mongoose from "mongoose";

const databaseURL = process.env.DATABASE_URL;

async function migrateGroupImages() {
    try {
        console.log("🔄 Connecting to database...");
        await mongoose.connect(databaseURL);
        console.log("✅ Connected to database");

        const db = mongoose.connection.db;
        const groupsCollection = db.collection("groups");

        console.log("🔄 Checking existing groups...");
        const totalGroups = await groupsCollection.countDocuments();
        console.log(`📊 Total groups: ${totalGroups}`);

        // Check if any groups already have image field
        const groupsWithImage = await groupsCollection.countDocuments({ image: { $exists: true } });
        console.log(`📊 Groups with image field: ${groupsWithImage}`);

        if (groupsWithImage === totalGroups) {
            console.log("✅ All groups already have image field. No migration needed.");
            process.exit(0);
        }

        // Add image field (default null) to groups that don't have it
        console.log("🔄 Adding image field to groups...");
        const result = await groupsCollection.updateMany(
            { image: { $exists: false } },
            { $set: { image: null } }
        );

        console.log(`✅ Migration complete!`);
        console.log(`   - Modified: ${result.modifiedCount} groups`);
        console.log(`   - Matched: ${result.matchedCount} groups`);

        // Verify
        const groupsWithImageAfter = await groupsCollection.countDocuments({ image: { $exists: true } });
        console.log(`✅ Groups with image field after migration: ${groupsWithImageAfter}`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrateGroupImages();
