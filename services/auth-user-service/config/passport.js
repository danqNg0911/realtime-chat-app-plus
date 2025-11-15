import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/UserModel.js";
import "./loadEnv.js";

console.log("🔐 Passport Configuration:");
console.log("- Google OAuth:", !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET));
console.log("- GitHub OAuth:", !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET));
console.log("- Server URL:", process.env.SERVER_URL);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

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
          let user = await User.findOne({ email: profile.emails[0].value });

          if (user) {
            if (user.authProvider !== "google") {
              return done(null, false, {
                message: "This account already exists. Please use the same login method.",
              });
            }

            user.googleId = profile.id;
            user.firstName = user.firstName || profile.name.givenName;
            user.lastName = user.lastName || profile.name.familyName;
            user.image = user.image || profile.photos[0]?.value;
            await user.save();
            return done(null, user);
          }

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

          done(null, user);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );
}

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
          const email = profile.emails?.find((e) => e.primary)?.value || profile.emails?.[0]?.value;

          if (!email) {
            return done(null, false, {
              message: "No email provided by GitHub",
            });
          }

          let user = await User.findOne({ email });

          if (user) {
            if (user.authProvider !== "github") {
              return done(null, false, {
                message: "This account already exists. Please use the same login method.",
              });
            }

            user.githubId = profile.id;
            user.firstName = user.firstName || profile.displayName?.split(" ")[0];
            user.lastName = user.lastName || profile.displayName?.split(" ").slice(1).join(" ");
            user.image = user.image || profile.photos?.[0]?.value;
            await user.save();
            return done(null, user);
          }

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
          done(error, null);
        }
      }
    )
  );
}

export default passport;
