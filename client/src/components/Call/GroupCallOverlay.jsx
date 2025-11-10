import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../store";
import { useSocket } from "../../context/SocketContext";
import "./GroupCallOverlay.css";
import { groupRoomName, joinLiveKitRoom, leaveLiveKitRoom } from "../../lib/livekit";
import { MdCallEnd, MdScreenShare, MdCall } from "react-icons/md";
import { IoMic, IoMicOff, IoVideocam, IoVideocamOff } from "react-icons/io5";
import { startScreenShare, stopScreenShare } from "../../lib/livekit";

const GroupCallOverlay = () => {
  const socket = useSocket();
  const {
    groupCallStatus,
    groupCallId,
    groupPeers,
    setGroupCallStatus,
    resetGroupCall,
    localStream,
    selectedChatMembers,
  } = useAppStore();
  const localAudioRef = useRef();
  const localVideoRef = useRef();

  useEffect(() => {
    if (localAudioRef.current && localStream) localAudioRef.current.srcObject = localStream;
    if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  const nameOf = (uid) => {
    const m = (selectedChatMembers || []).find((x) => x.id === uid || x._id === uid);
    return m ? `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email || uid : uid;
  };
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const peers = useMemo(() => Object.entries(groupPeers || {}), [groupPeers]);

  if (groupCallStatus === "idle") return null;

  const accept = () => {
    setGroupCallStatus("connecting");
    try { window.__ringStop?.(); } catch(_) {}
    socket?.emit("group:call:join", { groupId: groupCallId });
    const roomName = groupRoomName(groupCallId);
    const { callType } = useAppStore.getState();
    joinLiveKitRoom({ roomName, callType }).catch(() => {});
  };
  const reject = () => {
    socket?.emit("group:call:leave", { groupId: groupCallId });
    try { window.__ringStop?.(); } catch(_) {}
    resetGroupCall();
  };
  const end = () => {
    socket?.emit("group:call:end", { groupId: groupCallId });
    try { window.__ringStop?.(); } catch(_) {}
    try { leaveLiveKitRoom(); } catch (_) {}
    resetGroupCall();
  };

  const toggleMic = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((v) => !v);
  };
  const toggleCam = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCamOn((v) => !v);
  };

  return (
    <div className="group-call-overlay">
      <div className="card">
        <div className="title">
          {groupCallStatus === "incoming" && "Group call incoming"}
          {groupCallStatus === "ringing" && "Calling group..."}
          {groupCallStatus === "connecting" && "Connecting..."}
          {groupCallStatus === "in-call" && "Group call"}
        </div>
        <div className="grid">
          {peers.map(([uid, p]) => (
            <div className="tile" key={uid}>
              <div className="name">{nameOf(uid)}</div>
              {p.stream && p.stream.getVideoTracks && p.stream.getVideoTracks().length > 0 ? (
                <video
                  autoPlay
                  playsInline
                  ref={(el) => {
                    if (el && p.stream) el.srcObject = p.stream;
                  }}
                />
              ) : (
                <audio autoPlay ref={(el) => { if (el && p.stream) el.srcObject = p.stream; }} />
              )}
            </div>
          ))}
          <div className="tile self">
            <div className="name">You</div>
            <video autoPlay muted playsInline ref={localVideoRef} />
          </div>
        </div>
        {groupCallStatus === "incoming" ? (
          <div className="control-bar">
            <button className="control-btn success" onClick={accept} title="Join">
              <MdCall className="icon" />
            </button>
            <button className="control-btn danger" onClick={reject} title="Decline">
              <MdCallEnd className="icon" />
            </button>
          </div>
        ) : (
          <div className="control-bar">
            <button
              className={`control-btn ${sharing ? "success" : ""}`}
              title={sharing ? "Stop sharing" : "Share screen"}
              onClick={async () => {
                try {
                  if (sharing) {
                    stopScreenShare();
                    setSharing(false);
                  } else {
                    await startScreenShare({ withAudio: false });
                    setSharing(true);
                  }
                } catch (_) {}
              }}
            >
              <MdScreenShare className="icon" />
            </button>
            <button className="control-btn" onClick={toggleCam} title={camOn ? "Turn camera off" : "Turn camera on"}>
              {camOn ? <IoVideocam className="icon" /> : <IoVideocamOff className="icon" />}
            </button>
            <button className="control-btn" onClick={toggleMic} title={micOn ? "Mute" : "Unmute"}>
              {micOn ? <IoMic className="icon" /> : <IoMicOff className="icon" />}
            </button>
            <button className="control-btn danger" onClick={end} title="End">
              <MdCallEnd className="icon" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupCallOverlay;
