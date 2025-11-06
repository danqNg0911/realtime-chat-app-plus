import { useAppStore } from "../store/index.js";

// Upload file to Cloudinary with progress reporting (unsigned preset)
// Requires env vars:
// - VITE_CLOUDINARY_CLOUD_NAME (client)
// - VITE_CLOUDINARY_UPLOAD_PRESET (client)
const upload = async (file, uploadTargetId) => {
  const { setUploadProgress, setUploadFileName, setUploadTargetId } =
    useAppStore.getState();

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      "Missing Cloudinary config: set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET"
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  setUploadTargetId(uploadTargetId);
  setUploadFileName(file.name);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const folder = import.meta.env.VITE_CLOUDINARY_FOLDER || "uploads";
  if (folder) formData.append("folder", folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setUploadProgress(progress);
      }
    };

    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          const url = res.secure_url || res.url;
          setUploadProgress(0);
          setUploadTargetId(undefined);
          setUploadFileName(undefined);
          resolve(url);
        } else {
          reject(res?.error?.message || "Cloudinary upload failed");
        }
      } catch (e) {
        reject("Invalid response from Cloudinary");
      }
    };

    xhr.onerror = () => {
      reject("Network error while uploading to Cloudinary");
    };

    xhr.send(formData);
  });
};

export default upload;
