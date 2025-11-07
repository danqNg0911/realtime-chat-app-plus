import { useState } from "react";
import { usePhotoStore } from "@/store/slices/photo-slice";
import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { getColor } from "@/lib/group-member-color";
import { FaHeart, FaRegHeart, FaTrash } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import "./PhotoCard.css";

const PhotoCard = ({ photo }) => {
    const [showHeartAnimation, setShowHeartAnimation] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const { likePhoto, unlikePhoto, deletePhoto } = usePhotoStore();
    const { userInfo } = useAppStore();

    // Guard: Return null if photo is invalid
    if (!photo || !photo._id || !photo.owner) {
        return null;
    }

    const isOwner = photo.owner._id === userInfo.id;
    const isLiked = photo.isLiked;

    const handleLikeClick = async () => {
        if (isLiking) return;

        setIsLiking(true);

        if (isLiked) {
            await unlikePhoto(photo._id);
        } else {
            await likePhoto(photo._id);
            // Trigger heart animation
            setShowHeartAnimation(true);
            setTimeout(() => setShowHeartAnimation(false), 1000);
        }

        setIsLiking(false);
    };

    const handleDeleteClick = async () => {
        if (window.confirm("Are you sure you want to delete this photo?")) {
            await deletePhoto(photo._id);
        }
    };

    const getImageUrl = (url) => {
        if (!url) return "";

        const normalizedUrl = url.trim();
        if (
            /^https?:\/\//i.test(normalizedUrl) ||
            normalizedUrl.startsWith("data:") ||
            normalizedUrl.startsWith("blob:")
        ) {
            return normalizedUrl;
        }

        if (normalizedUrl.startsWith("/")) {
            return `${HOST}${normalizedUrl}`;
        }

        return `${HOST}/${normalizedUrl}`;
    };

    const getOwnerName = () => {
        if (photo.owner.firstName && photo.owner.lastName) {
            return `${photo.owner.firstName} ${photo.owner.lastName}`;
        }
        return photo.owner.email;
    };

    const getOwnerAvatar = () => {
        if (photo.owner.image) {
            return getImageUrl(photo.owner.image);
        }
        return null;
    };

    const timeAgo = formatDistanceToNow(new Date(photo.createdAt), {
        addSuffix: true,
    });

    return (
        <div className="photo-card">
            {/* Header: Avatar + Name + Time */}
            <div className="photo-card-header">
                <div className="photo-card-user">
                    {getOwnerAvatar() ? (
                        <img
                            src={getOwnerAvatar()}
                            alt={getOwnerName()}
                            className="photo-card-avatar"
                        />
                    ) : (
                        <div
                            className="photo-card-avatar-placeholder"
                            style={{ backgroundColor: getColor(photo.owner.color) }}
                        >
                            {getOwnerName().charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="photo-card-info">
                        <div className="photo-card-name">{getOwnerName()}</div>
                        <div className="photo-card-time">{timeAgo}</div>
                    </div>
                </div>
                {isOwner && (
                    <button
                        className="photo-card-delete-btn"
                        onClick={handleDeleteClick}
                        title="Delete photo"
                    >
                        <FaTrash />
                    </button>
                )}
            </div>

            {/* Caption (if exists) */}
            {photo.caption && (
                <div className="photo-card-caption">{photo.caption}</div>
            )}

            {/* Photo Image */}
            <div className="photo-card-image-container">
                <img
                    src={getImageUrl(photo.imageUrl)}
                    alt="Photo"
                    className="photo-card-image"
                />

                {/* Flying heart animation */}
                {showHeartAnimation && (
                    <div className="heart-animation">
                        <FaHeart />
                    </div>
                )}
            </div>

            {/* Footer: Like button + Count */}
            <div className="photo-card-footer">
                <button
                    className={`photo-card-like-btn ${isLiked ? "liked" : ""}`}
                    onClick={handleLikeClick}
                    disabled={isLiking}
                >
                    {isLiked ? <FaHeart /> : <FaRegHeart />}
                </button>
                <span className="photo-card-likes-count">
                    {photo.likesCount} {photo.likesCount === 1 ? "like" : "likes"}
                </span>
            </div>
        </div>
    );
};

export default PhotoCard;
