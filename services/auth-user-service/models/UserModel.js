import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  password: {
    type: String,
    required: false,
  },
  salt: {
    type: String,
    required: false,
  },

  //email verification
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationToken: {
    type: String,
    required: false,
    sparse: true,
  },
  verificationTokenExpires: {
    type: Date,
    required: false,
  },
  // email verification ends
  
  authProvider: {
    type: String,
    enum: ["local", "google", "github"],
    default: "local",
  },
  googleId: {
    type: String,
    required: false,
    sparse: true,
  },
  githubId: {
    type: String,
    required: false,
    sparse: true,
  },
  firstName: {
    type: String,
    required: false,
  },
  lastName: {
    type: String,
    required: false,
  },
  image: {
    type: String,
    required: false,
  },
  color: {
    type: Number,
    required: false,
  },
  profileSetup: {
    type: Boolean,
    default: false,
  },
  friendRequests: [
    {
      type: String,
      ref: "Users",
    },
  ],
  friends: [
    {
      type: String,
      ref: "Users",
    },
  ],
  blockedUsers: [
    {
      type: String,
      ref: "Users",
    },
  ],
});

const User = mongoose.model("Users", userSchema);

export default User;
