import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store";
import { useSocket } from "../../context/SocketContext";
import "./CallOverlay.css";
import { dmRoomName, joinLiveKitRoom, leaveLiveKitRoom } from "../../lib/livekit";
import { MdCallEnd, MdScreenShare, MdCall } from "react-icons/md";
import { IoPersonAdd } from "react-icons/io5";
import { IoMic, IoMicOff, IoVideocam, IoVideocamOff } from "react-icons/io5";
import { startScreenShare, stopScreenShare } from "../../lib/livekit";

const CallOverlay = () => {
  const socket = useSocket();
  const {
    callStatus,
    callType,
    callId,
    callPeerId,
    localStream,
    remoteStream,
    setCallStatus,
    setLocalStream,
    resetCall,
    userInfo,
  } = useAppStore();

  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (localAudioRef.current && localStream) {
      localAudioRef.current.srcObject = localStream;
    }
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callStatus === "idle") return null;

  const endCall = () => {
    if (socket && callPeerId && callId) {
      socket.emit("call:end", { callId, to: callPeerId });
    }
    try { window.__ringStop?.(); } catch(_) {}
    try { leaveLiveKitRoom(); } catch (_) {}
    resetCall();
  };

  const acceptCall = () => {
    if (socket && callPeerId && callId) {
      setCallStatus("connecting");
      socket.emit("call:accept", { callId, to: callPeerId });
    }
    try { window.__ringStop?.(); } catch(_) {}
    // Callee joins LiveKit room immediately after accepting
    if (userInfo?.id && callPeerId) {
      const roomName = dmRoomName(userInfo.id, callPeerId);
      joinLiveKitRoom({ roomName, callType }).catch(() => {});
    }
  };

  const rejectCall = () => {
    if (socket && callPeerId && callId) {
      socket.emit("call:reject", { callId, to: callPeerId });
    }
    try { window.__ringStop?.(); } catch(_) {}
    resetCall();
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
    <div className="call-overlay">
      <div className="call-card">
        <div className="call-title">
          {callStatus === "incoming" && "Incoming call"}
          {callStatus === "ringing" && "Calling..."}
          {callStatus === "connecting" && "Connecting..."}
          {callStatus === "in-call" && "In call"}
        </div>

        {callType === "video" && (
          <div className="video-stage">
            <video ref={remoteVideoRef} autoPlay playsInline className="remote" />
            <video ref={localVideoRef} autoPlay playsInline muted className="local" />
          </div>
        )}

        {callStatus === "incoming" ? (
          <div className="control-bar">
            <button className="control-btn success" onClick={acceptCall} title="Accept">
              <MdCall className="icon" />
            </button>
            <button className="control-btn danger" onClick={rejectCall} title="Reject">
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
            <button className="control-btn disabled" title="Add participant (coming soon)" disabled>
              <IoPersonAdd className="icon" />
            </button>
            {callType === "video" && (
              <button className="control-btn" onClick={toggleCam} title={camOn ? "Turn camera off" : "Turn camera on"}>
                {camOn ? <IoVideocam className="icon" /> : <IoVideocamOff className="icon" />}
              </button>
            )}
            <button className="control-btn" onClick={toggleMic} title={micOn ? "Mute" : "Unmute"}>
              {micOn ? <IoMic className="icon" /> : <IoMicOff className="icon" />}
            </button>
            <button className="control-btn danger" onClick={endCall} title="End call">
              <MdCallEnd className="icon" />
            </button>
          </div>
        )}

        {callType !== "video" && (
          <>
            <audio ref={localAudioRef} autoPlay muted />
            <audio ref={remoteAudioRef} autoPlay />
          </>
        )}
      </div>
    </div>
  );
};

export default CallOverlay;
