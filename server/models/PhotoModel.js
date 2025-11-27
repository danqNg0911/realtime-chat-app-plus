import mongoose from "mongoose";

const photoSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
            index: true, // Index for faster queries
        },
        imageUrl: {
            type: String,
            required: true,
        },
        caption: {
            type: String,
            default: "",
            maxlength: 300, // Max 300 characters
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
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Compound index for efficient feed queries (get photos from friends, sorted by newest)
photoSchema.index({ owner: 1, createdAt: -1 });

// Index for like count (for potential sorting by popularity)
photoSchema.index({ likesCount: -1 });

// Virtual to check if photo is liked by specific user (not stored in DB, computed on-the-fly)
photoSchema.virtual("isLiked").get(function () {
    return this.likes.includes(this._currentUserId);
});

// Method to add like
photoSchema.methods.addLike = function (userId) {
    if (!this.likes.includes(userId)) {
        this.likes.push(userId);
        this.likesCount = this.likes.length;
    }
};

// Method to remove like
photoSchema.methods.removeLike = function (userId) {
    this.likes = this.likes.filter((id) => id.toString() !== userId.toString());
    this.likesCount = this.likes.length;
};

const Photo = mongoose.model("Photo", photoSchema);

export default Photo;
