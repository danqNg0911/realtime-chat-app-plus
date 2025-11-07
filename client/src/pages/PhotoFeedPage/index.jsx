import { useEffect, useState, useRef, useCallback } from "react";
import { usePhotoStore } from "@/store/slices/photo-slice";
import PhotoCard from "@/components/ChatPageComponents/PhotoCard";
import { FaCamera, FaSpinner } from "react-icons/fa";
import { useAppStore } from "@/store";
import "./PhotoFeedPage.css";

const PhotoFeedPage = () => {
    const {
        photos,
        loading,
        hasMore,
        loadPhotoFeed,
        loadMorePhotos,
        uploadPhoto,
        shouldRefetch,
        isInitialized,
        clearFeedDirty,
    } = usePhotoStore();

    const { activeIcon } = useAppStore();

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [caption, setCaption] = useState("");
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState(false);

    const observerRef = useRef();
    const lastPhotoRef = useRef();
    const refetchInProgress = useRef(false);

    const MAX_CAPTION_LENGTH = 300;

    // Sync feed when returning to Photo Feed tab
    useEffect(() => {
        if (activeIcon !== "photos") return;

        if (shouldRefetch && !refetchInProgress.current) {
            console.log("🔄 Photo feed marked dirty - refetching");
            refetchInProgress.current = true;
            loadPhotoFeed(1).finally(() => {
                clearFeedDirty();
                refetchInProgress.current = false;
            });
        }
    }, [activeIcon, shouldRefetch, loadPhotoFeed, clearFeedDirty]);

    // Kick off initial load when the page mounts
    useEffect(() => {
        if (isInitialized || refetchInProgress.current) return;

        refetchInProgress.current = true;
        loadPhotoFeed(1).finally(() => {
            refetchInProgress.current = false;
        });
    }, [isInitialized, loadPhotoFeed]);

    // Deduplicate and sort photos by createdAt (newest first)
    const uniquePhotos = photos
        .reduce((acc, photo) => {
            if (photo && photo._id && !acc.find(p => p._id === photo._id)) {
                acc.push(photo);
            }
            return acc;
        }, [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Debug: Log photos count
    useEffect(() => {
        console.log("📊 Photos in store:", photos.length);
        console.log("📊 Unique photos:", uniquePhotos.length);
        if (uniquePhotos.length > 0) {
            console.log("📊 First photo:", uniquePhotos[0]._id);
            console.log("📊 Last photo:", uniquePhotos[uniquePhotos.length - 1]._id);
        }
    }, [photos, uniquePhotos.length]);

    // Infinite scroll observer
    const handleObserver = useCallback(
        (entries) => {
            const [target] = entries;
            if (target.isIntersecting && hasMore && !loading) {
                console.log("📜 Loading more photos...");
                loadMorePhotos();
            }
        },
        [hasMore, loading, loadMorePhotos]
    );

    useEffect(() => {
        const option = {
            root: null,
            rootMargin: "200px",
            threshold: 0,
        };

        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(handleObserver, option);

        if (lastPhotoRef.current) {
            observerRef.current.observe(lastPhotoRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [handleObserver, uniquePhotos.length]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setSelectedFiles(files);
            setShowUploadModal(true);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) return;

        setIsUploading(true);

        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];

            await uploadPhoto(file, caption, (progress) => {
                setUploadProgress((prev) => ({
                    ...prev,
                    [i]: progress,
                }));
            });
        }

        setIsUploading(false);
        setShowUploadModal(false);
        setSelectedFiles([]);
        setCaption("");
        setUploadProgress({});
    };

    const handleCancelUpload = () => {
        setShowUploadModal(false);
        setSelectedFiles([]);
        setCaption("");
        setUploadProgress({});
    };

    const handleCaptionChange = (e) => {
        const value = e.target.value;
        if (value.length <= MAX_CAPTION_LENGTH) {
            setCaption(value);
        }
    };

    return (
        <div className="photo-feed-page">
            {/* Header */}
            <div className="photo-feed-header">
                <div className="photo-feed-title">
                    <FaCamera className="photo-feed-icon" />
                    <h1>Photo Feed</h1>
                </div>
            </div>

            {/* Floating Action Button */}
            <button
                className="photo-feed-fab"
                onClick={() => document.getElementById("photo-upload-input").click()}
                title="Upload Photo"
            >
                <FaCamera />
            </button>

            {/* Hidden File Input */}
            <input
                id="photo-upload-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: "none" }}
            />

            {/* Feed Container */}
            <div className="photo-feed-container">
                {uniquePhotos.length === 0 && !loading ? (
                    <div className="photo-feed-empty">
                        <FaCamera className="empty-icon" />
                        <h2>No photos yet</h2>
                        <p>Upload your first photo to share with friends!</p>
                    </div>
                ) : (
                    <div className="photo-feed-grid">
                        {uniquePhotos.map((photo, index) => {
                            if (index === uniquePhotos.length - 1) {
                                return (
                                    <div key={`photo-wrapper-${photo._id}`} ref={lastPhotoRef}>
                                        <PhotoCard photo={photo} />
                                    </div>
                                );
                            }
                            return <PhotoCard key={photo._id} photo={photo} />;
                        })}
                    </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                    <div className="photo-feed-loading">
                        <FaSpinner className="spinner" />
                        <span>Loading photos...</span>
                    </div>
                )}

            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="photo-upload-modal-overlay" onClick={handleCancelUpload}>
                    <div
                        className="photo-upload-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h2>Upload Photos</h2>
                            <button className="modal-close-btn" onClick={handleCancelUpload}>
                                ×
                            </button>
                        </div>

                        <div className="modal-content">
                            {/* Caption Input */}
                            <div className="caption-input-container">
                                <label className="caption-input-label">
                                    What's on your mind?
                                </label>
                                <textarea
                                    className="caption-input"
                                    placeholder="Write a caption for your photos..."
                                    value={caption}
                                    onChange={handleCaptionChange}
                                    maxLength={MAX_CAPTION_LENGTH}
                                />
                                <div
                                    className={`caption-char-count ${caption.length > MAX_CAPTION_LENGTH * 0.9
                                        ? caption.length >= MAX_CAPTION_LENGTH
                                            ? "error"
                                            : "warning"
                                        : ""
                                        }`}
                                >
                                    {caption.length}/{MAX_CAPTION_LENGTH}
                                </div>
                            </div>

                            {/* Photo Previews */}
                            <div className="photo-previews">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="photo-preview-item">
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={`Preview ${index + 1}`}
                                        />
                                        {uploadProgress[index] !== undefined && (
                                            <div className="upload-progress-bar">
                                                <div
                                                    className="upload-progress-fill"
                                                    style={{ width: `${uploadProgress[index]}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="modal-cancel-btn"
                                onClick={handleCancelUpload}
                                disabled={isUploading}
                            >
                                Cancel
                            </button>
                            <button
                                className="modal-upload-btn"
                                onClick={handleUpload}
                                disabled={isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <FaSpinner className="spinner" />
                                        Uploading...
                                    </>
                                ) : (
                                    `Upload ${selectedFiles.length} photo${selectedFiles.length > 1 ? "s" : ""
                                    }`
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PhotoFeedPage;
