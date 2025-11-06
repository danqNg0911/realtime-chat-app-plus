import dotenv from "dotenv";
import { Router } from "express";
import {
  getUserInfo,
  login,
  signup,
  updateProfile,
  // addProfileImage,
  // removeProfileImage,
  logout,
  resetApp,
  changePassword,
  deleteAccount,
} from "../controllers/AuthController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the server directory
dotenv.config({ path: join(__dirname, "..", ".env") });
// import multer from "multer";

// const upload = multer({ dest: "uploads/profiles/" });

const authRoutes = Router();
const maxAge = 3 * 24 * 60 * 60 * 1000;
const adminEmail = process.env.ADMIN_EMAIL;

const createToken = (email, userId) => {
  return jwt.sign({ email, userId }, process.env.JWT_KEY, {
    expiresIn: maxAge,
  });
};

authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.get("/user-info", verifyToken, getUserInfo);
authRoutes.post("/update-profile", verifyToken, updateProfile);
// authRoutes.post(
//   "/add-profile-image",
//   verifyToken,
//   upload.single("profile-image"),
//   addProfileImage
// );
// authRoutes.delete("/remove-profile-image", verifyToken, removeProfileImage);
authRoutes.post("/logout", logout);
authRoutes.put("/reset-app", resetApp);
authRoutes.put("/change-password", verifyToken, changePassword);
authRoutes.delete("/delete-account", verifyToken, deleteAccount);

// Get available OAuth providers
authRoutes.get("/oauth-providers", (req, res) => {
  const providers = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  };
  res.json(providers);
});

// Google OAuth routes (only if credentials are configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  authRoutes.get(
    "/google",
    (req, res, next) => {
      console.log("🚀 Starting Google OAuth flow...");
      console.log("📍 Callback URL will be:", `${process.env.SERVER_URL}/api/auth/google/callback`);
      next();
    },
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  authRoutes.get(
    "/google/callback",
    (req, res, next) => {
      console.log("📥 Google OAuth callback hit!");
      console.log("📋 Query params:", req.query);
      next();
    },
    (req, res, next) => {
      passport.authenticate("google", { session: false }, (err, user, info) => {
        console.log("🔍 Passport authenticate callback:");
        console.log("  - Error:", err);
        console.log("  - User:", user ? { id: user.id, email: user.email } : null);
        console.log("  - Info:", info);

        if (err) {
          console.error("❌ Passport authentication error:", err);
          return res.redirect(`${process.env.ORIGIN}/auth?error=server_error`);
        }

        if (!user) {
          console.error("❌ Google OAuth: No user found after authentication");
          console.error("  - Info message:", info?.message);
          const errorMessage = info?.message || "Google authentication failed";
          return res.redirect(`${process.env.ORIGIN}/auth?error=${encodeURIComponent(errorMessage)}`);
        }

        // Manually set req.user
        req.user = user;
        next();
      })(req, res, next);
    },
    (req, res) => {
      try {
        if (!req.user) {
          console.error("❌ Google OAuth: No user found after authentication");
          return res.redirect(`${process.env.ORIGIN}/auth?error=authentication_failed`);
        }

        console.log("✅ Google OAuth successful:", req.user.email);
        const token = createToken(req.user.email, req.user.id);
        res.cookie("jwt", token, {
          maxAge,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          httpOnly: true,
        });

        // Redirect to frontend with success
        if (req.user.profileSetup) {
          res.redirect(`${process.env.ORIGIN}/chat`);
        } else {
          res.redirect(`${process.env.ORIGIN}/profile`);
        }
      } catch (error) {
        console.error("❌ Google OAuth callback error:", error);
        res.redirect(`${process.env.ORIGIN}/auth?error=server_error`);
      }
    }
  );
}

// GitHub OAuth routes (only if credentials are configured)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  authRoutes.get(
    "/github",
    (req, res, next) => {
      console.log("🚀 Starting GitHub OAuth flow...");
      console.log("📍 Callback URL will be:", `${process.env.SERVER_URL}/api/auth/github/callback`);
      next();
    },
    passport.authenticate("github", { scope: ["user:email"] })
  );

  authRoutes.get(
    "/github/callback",
    (req, res, next) => {
      console.log("📥 GitHub OAuth callback hit!");
      console.log("📋 Query params:", req.query);
      next();
    },
    (req, res, next) => {
      passport.authenticate("github", { session: false }, (err, user, info) => {
        console.log("🔍 Passport authenticate callback:");
        console.log("  - Error:", err);
        console.log("  - User:", user ? { id: user.id, email: user.email } : null);
        console.log("  - Info:", info);

        if (err) {
          console.error("❌ Passport authentication error:", err);
          return res.redirect(`${process.env.ORIGIN}/auth?error=server_error`);
        }

        if (!user) {
          console.error("❌ GitHub OAuth: No user found after authentication");
          console.error("  - Info message:", info?.message);
          const errorMessage = info?.message || "GitHub authentication failed";
          return res.redirect(`${process.env.ORIGIN}/auth?error=${encodeURIComponent(errorMessage)}`);
        }

        // Manually set req.user
        req.user = user;
        next();
      })(req, res, next);
    },
    (req, res) => {
      try {
        if (!req.user) {
          console.error("❌ GitHub OAuth: No user found after authentication");
          return res.redirect(`${process.env.ORIGIN}/auth?error=authentication_failed`);
        }

        console.log("✅ GitHub OAuth successful:", req.user.email);
        const token = createToken(req.user.email, req.user.id);
        res.cookie("jwt", token, {
          maxAge,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
          httpOnly: true,
        });

        // Redirect to frontend with success
        if (req.user.profileSetup) {
          res.redirect(`${process.env.ORIGIN}/chat`);
        } else {
          res.redirect(`${process.env.ORIGIN}/profile`);
        }
      } catch (error) {
        console.error("❌ GitHub OAuth callback error:", error);
        res.redirect(`${process.env.ORIGIN}/auth?error=server_error`);
      }
    }
  );
}

export default authRoutes;
