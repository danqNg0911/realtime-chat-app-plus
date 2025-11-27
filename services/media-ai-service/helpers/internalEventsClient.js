const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || "dev-internal-token";
const INTERNAL_EVENTS_URL =
  process.env.CHAT_INTERNAL_EVENTS_URL ||
  `${process.env.CHAT_SERVICE_URL || "http://chat-service:4002"}/internal/events`;

const tryJsonFetch = async (path, payload) => {
  if (!globalThis.fetch) {
    throw new Error(
      "fetch API is not available in this runtime. Please use Node 18+ or polyfill fetch."
    );
  }

  const url = `${INTERNAL_EVENTS_URL}${path}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": INTERNAL_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(
        `Failed to deliver internal event ${path}: ${response.status} ${text}`
      );
    }
  } catch (error) {
    console.error(`Failed to call internal event ${path}`, error);
  }
};

export const notifyPhotoUploaded = (payload) =>
  tryJsonFetch("/photo-uploaded", payload);

export const notifyPhotoLiked = (payload) =>
  tryJsonFetch("/photo-liked", payload);

export const notifyPhotoUnliked = (payload) =>
  tryJsonFetch("/photo-unliked", payload);

export const notifyPhotoDeleted = (payload) =>
  tryJsonFetch("/photo-deleted", payload);
