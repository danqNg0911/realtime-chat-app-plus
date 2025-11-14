export const CALL_IDLE = "idle";
export const CALL_INCOMING = "incoming";
export const CALL_RINGING = "ringing";
export const CALL_CONNECTING = "connecting";
export const CALL_ACTIVE = "in-call";

export const createCallSlice = (set, get) => ({
  callStatus: CALL_IDLE,
  callType: undefined, // 'audio' | 'video'
  callId: undefined,
  callPeerId: undefined,
  localStream: undefined,
  remoteStream: undefined,
  peerConnection: undefined,
  setCallStatus: (callStatus) => set({ callStatus }),
  setCallType: (callType) => set({ callType }),
  setCallId: (callId) => set({ callId }),
  setCallPeerId: (callPeerId) => set({ callPeerId }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  setPeerConnection: (peerConnection) => set({ peerConnection }),
  resetCall: () => {
    try {
      const { localStream, peerConnection } = get();
      peerConnection?.close?.();
      localStream?.getTracks?.().forEach((t) => t.stop());
    } catch (_) {}
    set({
      callStatus: CALL_IDLE,
      callType: undefined,
      callId: undefined,
      callPeerId: undefined,
      localStream: undefined,
      remoteStream: undefined,
      peerConnection: undefined,
    });
  },

  // Group call (mesh) state
  groupCallStatus: CALL_IDLE,
  groupCallId: undefined, // group _id
  groupPeers: {}, // { [userId]: { pc, stream } }
  setGroupCallStatus: (groupCallStatus) => set({ groupCallStatus }),
  setGroupCallId: (groupCallId) => set({ groupCallId }),
  setGroupPeer: (userId, data) => {
    const peers = { ...(get().groupPeers || {}) };
    peers[userId] = { ...(peers[userId] || {}), ...data };
    set({ groupPeers: peers });
  },
  removeGroupPeer: (userId) => {
    const peers = { ...(get().groupPeers || {}) };
    try { peers[userId]?.pc?.close?.(); } catch (_) {}
    delete peers[userId];
    set({ groupPeers: peers });
  },
  resetGroupCall: () => {
    const peers = { ...(get().groupPeers || {}) };
    Object.values(peers).forEach((p) => {
      try { p.pc?.close?.(); } catch (_) {}
    });
    try { get().localStream?.getTracks?.().forEach((t) => t.stop()); } catch (_) {}
    set({
      groupCallStatus: CALL_IDLE,
      groupCallId: undefined,
      groupPeers: {},
      localStream: undefined,
    });
  },
});
