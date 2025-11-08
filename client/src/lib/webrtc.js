export function getIceServers() {
  try {
    const v = import.meta.env.VITE_ICE_SERVERS;
    if (v) return JSON.parse(v);
  } catch (_) {
    // fallthrough
  }
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

export function createCallId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

