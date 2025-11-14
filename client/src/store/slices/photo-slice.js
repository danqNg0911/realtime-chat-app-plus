import { create } from "zustand";
import { apiClient } from "@/lib/api-client";

export const usePhotoStore = create((set, get) => ({
    photos: [],
    loading: false,
    error: null,
    hasMore: true,
    currentPage: 1,
    shouldRefetch: false,
    isInitialized: false,

    setPhotos: (photos) => set({ photos }),

    markFeedDirty: () => set({ shouldRefetch: true }),
    clearFeedDirty: () => set({ shouldRefetch: false }),

    addPhoto: (photo) => {
        set((state) => {
            // Check if photo already exists
            const exists = state.photos.some(p => p._id === photo._id);
            if (exists) {
                console.log("⚠️ Photo already exists in store:", photo._id);
                return state; // Don't add duplicate
            }
            return {
                photos: [photo, ...state.photos], // Add to top (newest first)
            };
        });
        console.log("📸 Photo added to store:", photo._id);
    },

    updatePhoto: (photoId, updates) => {
        set((state) => ({
            photos: state.photos.map((photo) =>
                photo._id === photoId ? { ...photo, ...updates } : photo
            ),
        }));
        console.log("📝 Photo updated in store:", photoId, updates);
    },

    removePhoto: (photoId) => {
        set((state) => ({
            photos: state.photos.filter((photo) => photo._id !== photoId),
        }));
        console.log("🗑️ Photo removed from store:", photoId);
    },

    likePhoto: async (photoId) => {
        try {
            const response = await apiClient.post(`/api/photos/${photoId}/like`);

            if (response.status === 200) {
                get().updatePhoto(photoId, {
                    likesCount: response.data.likesCount,
                    isLiked: true,
                });
                return true;
            }
        } catch (error) {
            console.error("❌ Error liking photo:", error);
            set({ error: error.response?.data?.message || "Failed to like photo" });
            return false;
        }
    },

    unlikePhoto: async (photoId) => {
        try {
            const response = await apiClient.delete(`/api/photos/${photoId}/like`);

            if (response.status === 200) {
                get().updatePhoto(photoId, {
                    likesCount: response.data.likesCount,
                    isLiked: false,
                });
                return true;
            }
        } catch (error) {
            console.error("❌ Error unliking photo:", error);
            set({ error: error.response?.data?.message || "Failed to unlike photo" });
            return false;
        }
    },

    uploadPhoto: async (file, caption, onProgress) => {
        try {
            set({ loading: true, error: null });

            const formData = new FormData();
            formData.append("photo", file);
            if (caption) {
                formData.append("caption", caption);
            }

            const response = await apiClient.post("/api/photos/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        );
                        onProgress(percentCompleted);
                    }
                },
            });

            if (response.status === 201) {
                const newPhoto = response.data.photo;
                get().addPhoto(newPhoto);
                set({ loading: false });
                return newPhoto;
            }
        } catch (error) {
            console.error("❌ Error uploading photo:", error);
            set({
                loading: false,
                error: error.response?.data?.message || "Failed to upload photo",
            });
            return null;
        }
    },

    deletePhoto: async (photoId) => {
        try {
            const response = await apiClient.delete(`/api/photos/${photoId}`);

            if (response.status === 200) {
                get().removePhoto(photoId);
                return true;
            }
        } catch (error) {
            console.error("❌ Error deleting photo:", error);
            set({ error: error.response?.data?.message || "Failed to delete photo" });
            return false;
        }
    },

    loadPhotoFeed: async (page = 1) => {
        try {
            set({ loading: true, error: null });

            const response = await apiClient.get(`/api/photos/feed?page=${page}&limit=20`);

            if (response.status === 200) {
                const { photos, pagination } = response.data;

                if (page === 1) {
                    // First load: replace all photos
                    set({
                        photos,
                        currentPage: page,
                        hasMore: pagination.hasMore,
                        loading: false,
                        isInitialized: true,
                        shouldRefetch: false,
                    });
                    console.log(`📸 Initial load: ${photos.length} photos`);
                    console.log(`📊 Pagination:`, pagination);
                } else {
                    // Load more: append photos
                    set((state) => ({
                        photos: [...state.photos, ...photos],
                        currentPage: page,
                        hasMore: pagination.hasMore,
                        loading: false,
                        isInitialized: true,
                    }));
                    console.log(`📸 Page ${page}: Added ${photos.length} more photos`);
                }

                console.log(`✅ Total photos in store: ${get().photos.length}`);
                return photos;
            }
        } catch (error) {
            console.error("❌ Error loading photo feed:", error);
            set({
                loading: false,
                error: error.response?.data?.message || "Failed to load photos",
            });
            return [];
        }
    },

    loadMorePhotos: async () => {
        const { currentPage, hasMore, loading } = get();
        if (!hasMore || loading) return;

        await get().loadPhotoFeed(currentPage + 1);
    },

    refreshFeed: async () => {
        await get().loadPhotoFeed(1);
    },
}));
