import { createContext, useContext, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { useAppStore } from "../store";
import { dmRoomName, joinLiveKitRoom, leaveLiveKitRoom } from "../lib/livekit";
import { usePhotoStore } from "../store/slices/photo-slice";
import { HOST } from "../utils/constants";
import { toast } from "react-toastify";


const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const socket = useRef();
  const { userInfo } = useAppStore();

  // Ringtone helpers (simple Web Audio beeps)
  const ringCtxRef = useRef(null);
  const ringGainRef = useRef(null);
  const ringTimerRef = useRef(null);
  const startRinging = () => {
    try {
      if (ringCtxRef.current) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 800;
      gain.gain.value = 0;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      ringCtxRef.current = { ctx, osc };
      ringGainRef.current = gain;
      let on = false;
      ringTimerRef.current = setInterval(() => {
        on = !on;
        gain.gain.setTargetAtTime(on ? 0.07 : 0.0, ctx.currentTime, 0.01);
      }, 900);
      try { window.__ringStop = stopRinging; } catch(_) {}
    } catch (_) {}
  };
  const stopRinging = () => {
    try {
      if (ringTimerRef.current) clearInterval(ringTimerRef.current);
      ringTimerRef.current = null;
      const bundle = ringCtxRef.current;
      if (bundle) {
        try { ringGainRef.current?.gain?.setValueAtTime(0, bundle.ctx.currentTime); } catch(_) {}
        try { bundle.osc.stop(); } catch(_) {}
        try { bundle.ctx.close(); } catch(_) {}
      }
    } catch (_) {}
    ringCtxRef.current = null;
    ringGainRef.current = null;
    try { if (window.__ringStop) delete window.__ringStop; } catch(_) {}
  };

  useEffect(() => {
    if (userInfo) {
      socket.current = io(HOST, {
        withCredentials: true,
        query: { userId: userInfo.id },
      });
      socket.current.on("connect", () => {
        console.log("Connected to socket server");
      });

      const handleReceiveMessage = (message) => {
        const {
          selectedChatData,
          selectedChatType,
          addMessage,
          addContactsInDMContacts,
          markChatAsUnread,
          markChatAsRead,
          userInfo,
        } = useAppStore.getState();

        const activeChatMatches =
          selectedChatType !== undefined &&
          selectedChatData &&
          (selectedChatData._id === message.sender._id ||
            selectedChatData._id === message.recipient._id);

        if (activeChatMatches) {
          console.log("message rcvd", message);
          addMessage(message);

          const otherUserId =
            message.sender?._id === userInfo.id
              ? message.recipient?._id
              : message.sender?._id;

          markChatAsRead(otherUserId);
        } else if (message.sender && message.sender._id !== userInfo.id) {
          markChatAsUnread(message.sender._id);
        }

        addContactsInDMContacts(message);
      };

      const handleReceiveGroupMessage = (message) => {
        const {
          selectedChatData,
          selectedChatType,
          addMessage,
          sortGroupList,
          markGroupAsUnread,
          markGroupAsRead,
          userInfo,
        } = useAppStore.getState();

        if (
          selectedChatType !== undefined &&
          selectedChatData &&
          selectedChatData._id === message.groupId
        ) {
          addMessage(message);
          markGroupAsRead(message.groupId);
        } else if (message.sender && message.sender._id !== userInfo.id) {
          markGroupAsUnread(message.groupId);
        }
        sortGroupList(message.group);
      };
      const handleReceiveGroupCreation = (group) => {
        const { addGroup } = useAppStore.getState();
        addGroup(group);
      };

      const handleReceiveFriendRequest = (friendRequest) => {
        const { friendRequests, setFriendRequests, setFriendRequestsCount } =
          useAppStore.getState();

        const formattedFriendRequest = {
          email: friendRequest.email,
          firstName: friendRequest.firstName,
          lastName: friendRequest.lastName,
          image: friendRequest.image,
        };

        // Check if the friend request already exists
        const requestExists = friendRequests.some(
          (req) => req.email === formattedFriendRequest.email
        );

        // Only add the formatted friend request if it doesn't already exist
        if (!requestExists) {
          setFriendRequestsCount(friendRequests.length + 1);
          setFriendRequests([formattedFriendRequest, ...friendRequests]);
        } else {
          console.log("Friend request already exists.");
        }
      };

      const handleGroupInfoUpdated = (updateData) => {
        console.log("🔔 Socket: groupInfoUpdated received:", updateData);

        const { updateGroupData } = useAppStore.getState();

        updateGroupData(updateData.groupId, {
          name: updateData.name,
          image: updateData.image,
        });

        console.log("✅ Socket: updateGroupData called");
      };

      // Photo event handlers
      const handleNewPhotoUploaded = (data) => {
        console.log("📸 Socket: newPhotoUploaded received:", data);
        const { addPhoto, markFeedDirty } = usePhotoStore.getState();
        const { activeIcon } = useAppStore.getState();

        // Server sends { photo, friendIds } but we only need photo
        const photo = data.photo || data;

        // Validate photo has required fields
        if (photo && photo._id && photo.owner) {
          addPhoto(photo);

          // If user is not on photo feed, mark it dirty for refresh
          if (activeIcon !== "photos") {
            markFeedDirty();
          }
        } else {
          console.warn("⚠️ Invalid photo data received:", photo);
        }
      };

      const handlePhotoLiked = (data) => {
        console.log("❤️ Socket: photoLiked received:", data.photoId);
        const { updatePhoto } = usePhotoStore.getState();
        updatePhoto(data.photoId, {
          likesCount: data.likesCount,
          isLiked: data.isLiked,
        });
      };

      const handlePhotoUnliked = (data) => {
        console.log("💔 Socket: photoUnliked received:", data.photoId);
        const { updatePhoto } = usePhotoStore.getState();
        updatePhoto(data.photoId, {
          likesCount: data.likesCount,
          isLiked: data.isLiked,
        });
      };

      const handlePhotoDeleted = (data) => {
        console.log("🗑️ Socket: photoDeleted received:", data.photoId);
        const { removePhoto } = usePhotoStore.getState();
        removePhoto(data.photoId);
      };

      // ===== Direct call signaling handlers =====
      const handleIncomingCall = (data) => {
        const { setCallStatus, setCallType, setCallPeerId, setCallId } = useAppStore.getState();
        setCallType(data.callType);
        setCallPeerId(data.from);
        setCallId(data.callId);
        setCallStatus("incoming");
        try { stopRinging(); startRinging(); } catch(_) {}
        handleIncomingCall._toastId = toast.info("Incoming call", { autoClose: false, closeOnClick: false });
        try {
          if ("Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification("Incoming call", { body: "Tap to open" });
            } else if (Notification.permission === "default") {
              Notification.requestPermission();
            }
          }
        } catch(_) {}
      };
      const handleCallAccepted = (data) => {
        const { setCallStatus, callType, userInfo: me } = useAppStore.getState();
        setCallStatus("connecting");
        try { stopRinging(); if (handleIncomingCall._toastId) toast.dismiss(handleIncomingCall._toastId); } catch(_) {}
        const roomName = dmRoomName(me.id, data.from);
        joinLiveKitRoom({ roomName, callType }).catch(() => {});
      };
      const handleCallRejected = () => {
        const { resetCall } = useAppStore.getState();
        try { stopRinging(); if (handleIncomingCall._toastId) toast.dismiss(handleIncomingCall._toastId); } catch(_) {}
        resetCall();
      };
      const handleCallEnded = () => {
        const { resetCall } = useAppStore.getState();
        try { stopRinging(); if (handleIncomingCall._toastId) toast.dismiss(handleIncomingCall._toastId); } catch(_) {}
        try { leaveLiveKitRoom(); } catch (_) {}
        resetCall();
      };

      socket.current.on("receiveMessage", handleReceiveMessage);
      socket.current.on("receiveGroupCreation", handleReceiveGroupCreation);
      socket.current.on("receiveGroupMessage", handleReceiveGroupMessage);
      socket.current.on("receiveFriendRequest", handleReceiveFriendRequest);
      socket.current.on("groupInfoUpdated", handleGroupInfoUpdated);

      socket.current.on("call:incoming", handleIncomingCall);
      socket.current.on("call:accepted", handleCallAccepted);
      socket.current.on("call:rejected", handleCallRejected);
      socket.current.on("call:ended", handleCallEnded);

      // Photo socket events
      socket.current.on("newPhotoUploaded", handleNewPhotoUploaded);
      socket.current.on("photoLiked", handlePhotoLiked);
      socket.current.on("photoUnliked", handlePhotoUnliked);
      socket.current.on("photoDeleted", handlePhotoDeleted);

      // ===== Group call events =====
      const handleGroupIncoming = (data) => {
        const { setGroupCallStatus, setGroupCallId, setCallType } = useAppStore.getState();
        setCallType(data.callType);
        setGroupCallId(data.groupId);
        setGroupCallStatus("incoming");
        try { stopRinging(); startRinging(); } catch(_) {}
        handleGroupIncoming._toastId = toast.info("Incoming group call", { autoClose: false, closeOnClick: false });
      };
      const handleGroupEnded = (data) => {
        const { resetGroupCall } = useAppStore.getState();
        try { stopRinging(); if (handleGroupIncoming._toastId) toast.dismiss(handleGroupIncoming._toastId); } catch(_) {}
        try { leaveLiveKitRoom(); } catch(_) {}
        resetGroupCall();
      };
      socket.current.on("group:call:incoming", handleGroupIncoming);
      socket.current.on("group:call:ended", handleGroupEnded);

      return () => {
        try { socket.current.off("receiveMessage", handleReceiveMessage); } catch(_) {}
        try { socket.current.off("receiveGroupCreation", handleReceiveGroupCreation); } catch(_) {}
        try { socket.current.off("receiveGroupMessage", handleReceiveGroupMessage); } catch(_) {}
        try { socket.current.off("receiveFriendRequest", handleReceiveFriendRequest); } catch(_) {}
        try { socket.current.off("groupInfoUpdated", handleGroupInfoUpdated); } catch(_) {}
        try { socket.current.off("call:incoming", handleIncomingCall); } catch(_) {}
        try { socket.current.off("call:accepted", handleCallAccepted); } catch(_) {}
        try { socket.current.off("call:rejected", handleCallRejected); } catch(_) {}
        try { socket.current.off("call:ended", handleCallEnded); } catch(_) {}
        try { socket.current.off("group:call:incoming", handleGroupIncoming); } catch(_) {}
        try { socket.current.off("group:call:ended", handleGroupEnded); } catch(_) {}
        socket.current.disconnect();
      };
    }
  }, [userInfo]);

  return (
    <SocketContext.Provider value={socket.current}>
      {children}
    </SocketContext.Provider>
  );
};
