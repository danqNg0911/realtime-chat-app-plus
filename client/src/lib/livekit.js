import { Room, Track, createLocalAudioTrack, createLocalVideoTrack } from "livekit-client";
import { apiClient } from "./api-client";
import { useAppStore } from "../store";

let room; // singleton per active call

export const dmRoomName = (a, b) => {
  const [x, y] = [String(a), String(b)].sort();
  return `dm-${x}-${y}`;
};

export const groupRoomName = (groupId) => `group-${groupId}`;

async function fetchToken(roomName) {
  try {
    const res = await apiClient.get(`/api/livekit/token`, {
      params: { room: roomName },
      withCredentials: true,
    });
    return res.data; // { token, url }
  } catch (error) {
    if (error.response?.status === 500 && error.response?.data?.error?.includes("LiveKit credentials")) {
      throw new Error("Video/audio calling is not configured. Please contact the administrator.");
    }
    throw error;
  }
}

function ensureRoom() {
  if (!room) room = new Room();
  return room;
}

export async function joinLiveKitRoom({ roomName, callType }) {
  try {
    const { token, url } = await fetchToken(roomName);
    const r = ensureRoom();

    // Wire events for remote tracks
    r.on("trackSubscribed", (track, publication, participant) => {
      const state = useAppStore.getState();
      // 1-1 remote stream: merge tracks
      const currentRemote = state.remoteStream;
      const remote = currentRemote ? new MediaStream(currentRemote.getTracks()) : new MediaStream();
      if (track.kind === Track.Kind.Audio || track.kind === Track.Kind.Video) {
        remote.addTrack(track.mediaStreamTrack);
      }
      state.setRemoteStream(remote);

      // Group: merge into per-participant stream
      const existing = state.groupPeers?.[participant.identity]?.stream;
      const merged = existing ? new MediaStream(existing.getTracks()) : new MediaStream();
      merged.addTrack(track.mediaStreamTrack);
      state.setGroupPeer?.(participant.identity, { stream: merged });
    });

    r.on("trackUnsubscribed", (track, publication, participant) => {
      const state = useAppStore.getState();
      state.removeGroupPeer?.(participant.identity);
    });

    r.on("participantDisconnected", (participant) => {
      const state = useAppStore.getState();
      state.removeGroupPeer?.(participant.identity);
    });

    await r.connect(url, token);

    // Publish local tracks based on call type
    const locals = [];
    const mic = await createLocalAudioTrack();
    await r.localParticipant.publishTrack(mic);
    locals.push(mic.mediaStreamTrack);
    if (callType === "video") {
      const cam = await createLocalVideoTrack();
      await r.localParticipant.publishTrack(cam);
      locals.push(cam.mediaStreamTrack);
    }
    // Expose a local MediaStream for existing UI controls
    useAppStore.getState().setLocalStream(new MediaStream(locals));
    useAppStore.getState().setCallStatus?.("in-call");

    return r;
  } catch (error) {
    console.error("Failed to join LiveKit room:", error);
    useAppStore.getState().setCallStatus?.("idle");
    throw error;
  }
}

export function leaveLiveKitRoom() {
  try {
    if (room) {
      room.disconnect();
    }
  } catch (_) { }
  room = undefined;
}
