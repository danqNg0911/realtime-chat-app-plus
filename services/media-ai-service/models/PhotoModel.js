import mongoose from "mongoose";

const photoSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: "",
      maxlength: 300,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

photoSchema.index({ owner: 1, createdAt: -1 });
photoSchema.index({ likesCount: -1 });

photoSchema.methods.addLike = function (userId) {
  if (!this.likes.includes(userId)) {
    this.likes.push(userId);
    this.likesCount = this.likes.length;
  }
};

photoSchema.methods.removeLike = function (userId) {
  this.likes = this.likes.filter((id) => id.toString() !== userId.toString());
  this.likesCount = this.likes.length;
};

const Photo = mongoose.model("Photo", photoSchema);

export default Photo;
