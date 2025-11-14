import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/UserModel.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the server directory
dotenv.config({ path: join(__dirname, "..", ".env") });

const adminEmail = process.env.ADMIN_EMAIL;

console.log("🔐 Passport Configuration:");
console.log("- Google OAuth:", !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET));
console.log("- GitHub OAuth:", !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET));
console.log("- Server URL:", process.env.SERVER_URL);

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log("🔧 Registering Google OAuth strategy...");
  console.log("📍 Google callback URL:", `${process.env.SERVER_URL}/api/auth/google/callback`);

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("🔍 Google OAuth profile received:", {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            name: profile.displayName
          });

          // Check if user already exists with this email
          let user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            // User exists - check if they used a different auth method
            if (user.authProvider !== "google") {
              return done(null, false, {
                message: "This account already exists. Please use the same login method.",
              });
            }
            // User exists with Google - update their info
            user.googleId = profile.id;
            user.firstName = user.firstName || profile.name.givenName;
            user.lastName = user.lastName || profile.name.familyName;
            user.image = user.image || profile.photos[0]?.value;
            await user.save();

            console.log("✅ Existing user updated:", {
              id: user.id,
              email: user.email,
              authProvider: user.authProvider
            });

            return done(null, user);
          }

          // Create new user
          user = await User.create({
            email: profile.emails[0].value,
            authProvider: "google",
            googleId: profile.id,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            image: profile.photos[0]?.value,
            color: Math.floor(Math.random() * 10),
            profileSetup: true,
          });

          console.log("✅ User created successfully:", {
            id: user.id,
            email: user.email,
            authProvider: user.authProvider
          });

          done(null, user);
        } catch (error) {
          console.error("❌ Google OAuth error:", error);
          console.error("Error details:", {
            message: error.message,
            stack: error.stack
          });
          done(error, null);
        }
      }
    )
  );
}

// GitHub OAuth Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  console.log("🔧 Registering GitHub OAuth strategy...");
  console.log("📍 GitHub callback URL:", `${process.env.SERVER_URL}/api/auth/github/callback`);

  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.SERVER_URL}/api/auth/github/callback`,
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log("🔍 GitHub OAuth profile received:", {
            id: profile.id,
            username: profile.username,
            emails: profile.emails
          });

          // Get primary email from GitHub
          const email = profile.emails?.find((e) => e.primary)?.value || profile.emails?.[0]?.value;

          if (!email) {
            return done(null, false, {
              message: "No email provided by GitHub",
            });
          }

          let user = await User.findOne({ email });

          if (user) {
            // User exists - check if they used a different auth method
            if (user.authProvider !== "github") {
              return done(null, false, {
                message: "This account already exists. Please use the same login method.",
              });
            }
            // User exists with GitHub - update their info
            user.githubId = profile.id;
            user.firstName = user.firstName || profile.displayName?.split(" ")[0];
            user.lastName = user.lastName || profile.displayName?.split(" ").slice(1).join(" ");
            user.image = user.image || profile.photos?.[0]?.value;
            await user.save();
            return done(null, user);
          }

          // Create new user
          const displayName = profile.displayName || profile.username || "";
          const nameParts = displayName.split(" ");

          user = await User.create({
            email,
            authProvider: "github",
            githubId: profile.id,
            firstName: nameParts[0] || profile.username,
            lastName: nameParts.slice(1).join(" ") || "",
            image: profile.photos?.[0]?.value,
            color: Math.floor(Math.random() * 10),
            profileSetup: true,
          });

          done(null, user);
        } catch (error) {
          console.error("❌ GitHub OAuth error:", error);
          console.error("Error details:", {
            message: error.message,
            stack: error.stack
          });
          done(error, null);
        }
      }
    )
  );
}

export default passport;
