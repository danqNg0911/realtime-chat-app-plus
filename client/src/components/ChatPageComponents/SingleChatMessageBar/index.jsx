import { useEffect, useRef, useState } from "react";
import { RiEmojiStickerLine } from "react-icons/ri";
import { GrAttachment } from "react-icons/gr";
import { IoSend } from "react-icons/io5";
import "./SingleChatMessageBar.css";
import { useAppStore } from "../../../store";
import { useSocket } from "../../../context/SocketContext";
import upload from "../../../lib/upload";
import { apiClient } from "../../../lib/api-client";
import EmojiPicker from "emoji-picker-react";
import {
  CHECK_BLOCK_STATUS_ROUTE,
  UNBLOCK_USER_ROUTE,
} from "../../../utils/constants";
import { toast } from "react-toastify";

const SingleChatMessageBar = () => {
  const socket = useSocket();

  const {
    selectedChatType,
    selectedChatData,
    userInfo,
    setRefreshChatList,
    setActiveChatId,
    setPlaceholderMessage,
    theme,
  } = useAppStore();

  const [message, setMessage] = useState("");
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const selectedChatId = selectedChatData?._id;

  useEffect(() => {
    const checkBlockStatus = async () => {
      if (selectedChatType === "contact" && selectedChatId) {
        try {
          const response = await apiClient.get(
            `${CHECK_BLOCK_STATUS_ROUTE}/${selectedChatId}`,
            { withCredentials: true }
          );
          setIBlockedThem(response.data.iBlockedThem);
          setTheyBlockedMe(response.data.theyBlockedMe);
        } catch (error) {
          console.error("Check block status error:", error);
        }
      } else {
        setIBlockedThem(false);
        setTheyBlockedMe(false);
      }
    };

    checkBlockStatus();
  }, [selectedChatId, selectedChatType]);

  const messageInputRef = useRef();
  const emojiButtonRef = useRef();

  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [selectedChatData]);

  const handleSendMessage = async () => {
    if (!message.trim()) {
      return;
    }

    if (selectedChatType === "contact") {
      socket.emit("sendMessage", {
        sender: userInfo.id,
        content: message,
        recipient: selectedChatId,
        messageType: "text",
      });
    } else if (selectedChatType === "group") {
      socket.emit("sendGroupMessage", {
        sender: userInfo.id,
        content: message,
        messageType: "text",
        groupId: selectedChatId,
      });
    }

    setActiveChatId(selectedChatId);
    setPlaceholderMessage(message);
    setMessage("");
    setRefreshChatList(true);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleSendMessage();
    }
  };

  const fileInputRef = useRef();

  const handleFileAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileAttachmentChange = async (event) => {
    try {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB");
        event.target.value = "";
        return;
      }

      const fileUrl = await upload(file, selectedChatId);

      if (!fileUrl) {
        event.target.value = "";
        return;
      }

      if (selectedChatType === "contact") {
        socket.emit("sendMessage", {
          sender: userInfo.id,
          recipient: selectedChatId,
          messageType: "file",
          fileUrl,
        });
      } else if (selectedChatType === "group") {
        socket.emit("sendGroupMessage", {
          sender: userInfo.id,
          messageType: "file",
          fileUrl,
          groupId: selectedChatId,
        });
      }
    } catch (error) {
      console.error("File upload error:", error);
    } finally {
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleUnblock = async () => {
    try {
      const response = await apiClient.post(
        UNBLOCK_USER_ROUTE,
        { blockedUserId: selectedChatId },
        { withCredentials: true }
      );

      if (response.status === 200) {
        toast.success("User unblocked successfully");
        setIBlockedThem(false);
      }
    } catch (error) {
      console.error("Unblock error:", error);
      toast.error(error.response?.data?.error || "Failed to unblock user");
    }
  };

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData?.emoji || "";
    if (!emoji) return;
    setMessage((prev) => `${prev}${emoji}`);
    // Keep focus on the input after selecting
    requestAnimationFrame(() => {
      messageInputRef.current?.focus();
    });
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!showEmojiPicker) return;
      const btn = emojiButtonRef.current;
      const picker = document.querySelector(".message-bar .emoji-picker");
      if (btn && btn.contains(e.target)) return;
      if (picker && picker.contains(e.target)) return;
      setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  if (iBlockedThem && selectedChatType === "contact") {
    return (
      <div className="unblock-bar">
        <button className="unblock-button" onClick={handleUnblock}>
          Unblock
        </button>
      </div>
    );
  }

  if (theyBlockedMe && selectedChatType === "contact") {
    return (
      <div className="blocked-message-bar">
        <p>You've been blocked</p>
      </div>
    );
  }

  return (
    <div className="message-bar">
      <button
        type="button"
        className="message-bar-icon"
        onClick={toggleEmojiPicker}
        ref={emojiButtonRef}
        aria-label="Mở bảng chọn biểu tượng cảm xúc"
        title="Chèn emoji"
      >
        <div className="emoji-picker-icon">
          <RiEmojiStickerLine />
        </div>
        {showEmojiPicker && (
          <div
            className="emoji-picker"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              autoFocusSearch={false}
              theme={theme === "dark" ? "dark" : "light"}
            />
          </div>
        )}
      </button>
      <button
        type="button"
        className="message-bar-icon"
        onClick={handleFileAttachmentClick}
        aria-label="Đính kèm tập tin"
        title="Đính kèm tập tin"
      >
        <GrAttachment />
      </button>
      <input
        type="file"
        className="attachment-hidden-input"
        ref={fileInputRef}
        onChange={handleFileAttachmentChange}
        aria-label="Chọn tập tin đính kèm"
        aria-hidden="true"
        tabIndex={-1}
      />
      <div className="message-bar-searchbar">
        <input
          type="text"
          placeholder="Type a message..."
          value={message}
          ref={messageInputRef}
          onChange={(event) => setMessage(event.target.value)}
          className="message-bar-search-input"
          onKeyDown={handleKeyDown}
        />
      </div>
      <button
        type="button"
        className="message-bar-icon send-button"
        onClick={handleSendMessage}
        aria-label="Gửi tin nhắn"
        title="Gửi tin nhắn"
      >
        <IoSend />
      </button>
    </div>
  );
};

export default SingleChatMessageBar;
