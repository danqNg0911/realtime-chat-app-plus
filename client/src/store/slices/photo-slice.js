import { create } from "zustand";
import { apiClient } from "@/lib/api-client";

const toTimestamp = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const mergeAndSortPhotos = (...photoLists) => {
  const photoMap = new Map();

  photoLists.forEach((list = []) => {
    list.forEach((photo) => {
      if (photo && photo._id) {
        photoMap.set(photo._id, photo);
      }
    });
  });

  return Array.from(photoMap.values()).sort(
    (a, b) => toTimestamp(b.createdAt) - toTimestamp(a.createdAt)
  );
};

const deriveHasMore = (currentPage, pagination) => {
  if (!pagination) return false;

  if (typeof pagination.totalPages === "number") {
    return currentPage < pagination.totalPages;
  }

  if (typeof pagination.hasMore === "boolean") {
    return pagination.hasMore;
  }

  return false;
};

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
      const exists = state.photos.some((p) => p._id === photo._id);
      if (exists) {
        return state;
      }
      return {
        photos: [photo, ...state.photos],
      };
    });
  },

  updatePhoto: (photoId, updates) => {
    set((state) => ({
      photos: state.photos.map((photo) =>
        photo._id === photoId ? { ...photo, ...updates } : photo
      ),
    }));
  },

  removePhoto: (photoId) => {
    set((state) => ({
      photos: state.photos.filter((photo) => photo._id !== photoId),
    }));
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
      set({ error: error.response?.data?.message || "Failed to delete photo" });
      return false;
    }
  },

  loadPhotoFeed: async (page = 1) => {
    try {
      set({ loading: true, error: null });

      const response = await apiClient.get(`/api/photos/feed?page=${page}&limit=20`);

      if (response.status !== 200) {
        set({ loading: false });
        return [];
      }

      const { photos, pagination } = response.data;
      const nextHasMore = deriveHasMore(page, pagination);

      if (page === 1) {
        set((state) => {
          const hasExistingFeed = state.isInitialized && state.photos.length > 0;
          const nextPhotos = hasExistingFeed
            ? mergeAndSortPhotos(state.photos, photos)
            : mergeAndSortPhotos(photos);
          const nextCurrentPage = hasExistingFeed
            ? state.currentPage
            : photos.length > 0
              ? page
              : 0;

          return {
            photos: nextPhotos,
            currentPage: nextCurrentPage,
            hasMore: nextHasMore,
            loading: false,
            isInitialized: true,
            shouldRefetch: false,
          };
        });
      } else {
        set((state) => {
          const nextPhotos = mergeAndSortPhotos(state.photos, photos);

          return {
            photos: nextPhotos,
            currentPage: page,
            hasMore: nextHasMore,
            loading: false,
            isInitialized: true,
          };
        });
      }

      return photos;
    } catch (error) {
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
