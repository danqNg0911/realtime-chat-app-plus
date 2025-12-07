import "../config/loadEnv.js";
import { Router } from "express";
import {
  getUserInfo,
  login,
  signup,
  updateProfile,
  logout,
  resetApp,
  changePassword,
  deleteAccount,
} from "../controllers/AuthController.js";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import { getPrimaryOrigin } from "../cors.js";
import {
  authCookieMaxAge as maxAge,
  authCookieOptions,
} from "../utils/cookies.js";

//email verification import
import { verifyEmail, resendVerification } from "../controllers/AuthController.js";
import rateLimit from "express-rate-limit";

const authRoutes = Router();
const frontendOrigin = getPrimaryOrigin();

// Rate limiter for resending verification emails
const resendEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 3, // tối đa 3 lần trong 15 phút
  message: "You have exceeded the maximum number of resend attempts. Please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

const createToken = (email, userId) =>
  jwt.sign({ email, userId }, process.env.JWT_KEY, { expiresIn: maxAge });

authRoutes.post("/signup", signup);
authRoutes.post("/login", login);
authRoutes.get("/user-info", verifyToken, getUserInfo);
authRoutes.post("/update-profile", verifyToken, updateProfile);
authRoutes.post("/logout", logout);
authRoutes.put("/reset-app", resetApp);
authRoutes.put("/change-password", verifyToken, changePassword);
authRoutes.delete("/delete-account", verifyToken, deleteAccount);

//email verification routes
authRoutes.get("/verify-email", verifyEmail); 
authRoutes.post("/resend-verification", resendEmailLimiter, resendVerification);  
//


authRoutes.get("/oauth-providers", (req, res) => {
  const providers = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    github: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  };
  res.json(providers);
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  authRoutes.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  authRoutes.get(
    "/google/callback",
    (req, res, next) => {
      passport.authenticate("google", { session: false }, (err, user, info) => {
        if (err) {
          return res.redirect(`${frontendOrigin}/auth?error=server_error`);
        }

        if (!user) {
          const errorMessage = info?.message || "Google authentication failed";
          return res.redirect(
            `${frontendOrigin}/auth?error=${encodeURIComponent(errorMessage)}`
          );
        }

        req.user = user;
        next();
      })(req, res, next);
    },
    (req, res) => {
      if (!req.user) {
        return res.redirect(`${frontendOrigin}/auth?error=authentication_failed`);
      }

      const token = createToken(req.user.email, req.user.id);
      res.cookie("jwt", token, authCookieOptions);

      if (req.user.profileSetup) {
        res.redirect(`${frontendOrigin}/chat`);
      } else {
        res.redirect(`${frontendOrigin}/profile`);
      }
    }
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  authRoutes.get(
    "/github",
    passport.authenticate("github", { scope: ["user:email"] })
  );

  authRoutes.get(
    "/github/callback",
    (req, res, next) => {
      passport.authenticate("github", { session: false }, (err, user, info) => {
        if (err) {
          return res.redirect(`${frontendOrigin}/auth?error=server_error`);
        }

        if (!user) {
          const errorMessage = info?.message || "GitHub authentication failed";
          return res.redirect(
            `${frontendOrigin}/auth?error=${encodeURIComponent(errorMessage)}`
          );
        }

        req.user = user;
        next();
      })(req, res, next);
    },
    (req, res) => {
      if (!req.user) {
        return res.redirect(`${frontendOrigin}/auth?error=authentication_failed`);
      }

      const token = createToken(req.user.email, req.user.id);
      res.cookie("jwt", token, authCookieOptions);

      if (req.user.profileSetup) {
        res.redirect(`${frontendOrigin}/chat`);
      } else {
        res.redirect(`${frontendOrigin}/profile`);
      }
    }
  );
}

export default authRoutes;
