import "./config/loadEnv.js";
import mongoose from "mongoose";
import User from "./models/UserModel.js";

const emails = [
    "hungvp711@gmail.com",
    "23020542@vnu.edu.vn"
];

async function deleteUsers() {
    try {
        await mongoose.connect(process.env.DATABASE_URL);
        console.log("Connected to MongoDB");

        // Find users
        const users = await User.find({ email: { $in: emails } });
        console.log("\n📋 Users found:");
        users.forEach(u => {
            console.log(`  - ${u.email} (authProvider: ${u.authProvider})`);
        });

        if (users.length > 0) {
            console.log("\n⚠️  These users will be DELETED so you can re-register with OAuth.");
            console.log("   Re-run this script with DELETE=true to confirm:");
            console.log("   DELETE=true node delete-oauth-blocked-users.js\n");

            if (process.env.DELETE === "true") {
                const result = await User.deleteMany({ email: { $in: emails } });
                console.log(`✅ Deleted ${result.deletedCount} user(s)`);
                console.log("   You can now signup with Google/GitHub!\n");
            }
        } else {
            console.log("\n✅ No blocking users found. OAuth should work!\n");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

deleteUsers();
