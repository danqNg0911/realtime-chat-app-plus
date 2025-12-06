import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  salt: {
    type: String,
    required: true,
  },
  verificationToken: {
    type: String,
    required: true,
  },
  verificationTokenExpires: {
    type: Date,
    required: true,
  },
  resendAttempts: {
    type: Number,
    default: 0,
  },
  firstSignupAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  lastResendAt: {
    type: Date,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400, // Tự động xóa sau 24 giờ (TTL index)
  },
  expireAt: {
    type: Date,
  },
});

pendingUserSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
const PendingUser = mongoose.model("PendingUsers", pendingUserSchema);

export default PendingUser;
export { PendingUser };