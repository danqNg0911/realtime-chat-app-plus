import { IoMdMore } from "react-icons/io";
import { IoIosSearch, IoIosCall, IoIosVideocam } from "react-icons/io";
import { IoPersonAdd } from "react-icons/io5";
import "./SingleChatHeader.css";
import { useAppStore } from "../../../store";
import {
  GET_GROUP_MEMBERS_ROUTE,
  BLOCK_USER_ROUTE,
  UNBLOCK_USER_ROUTE,
  LEAVE_GROUP_ROUTE,
  CHECK_BLOCK_STATUS_ROUTE,
  UNFRIEND_CONTACT_ROUTE,
} from "../../../utils/constants";
import { useEffect, useState, useRef } from "react";
import { apiClient } from "../../../lib/api-client";
import { HiUserGroup } from "react-icons/hi";
import { toast } from "react-toastify";
import AddMemberModal from "../AddMemberModal";
import { useSocket } from "../../../context/SocketContext";
import { joinLiveKitRoom, groupRoomName } from "../../../lib/livekit";

const SingleChatHeader = () => {
  const {
    selectedChatData,
    selectedChatType,
    setActiveIcon,
    selectedChatMembers,
    setSelectedChatMembers,
    userInfo,
    setContactOrGroupProfile,
    groups,
    directMessagesContacts,
    setSelectedChatData,
    setDirectMessagesContacts,
    closeChat,
    setActiveChatId,
    setChatSearchOpen,
    setCallStatus,
    setCallType,
    setCallId,
    setCallPeerId,
    setGroupCallStatus,
    setGroupCallId,
  } = useAppStore();
  const socket = useSocket();

  const [showMenu, setShowMenu] = useState(false);
  const [showSnowfall, setShowSnowfall] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [iBlockedThem, setIBlockedThem] = useState(false);
  const [theyBlockedMe, setTheyBlockedMe] = useState(false);

  // Check if current chat is AI Assistant - match with actual .env email
  const isAIAssistant =
    selectedChatData?.email?.includes("ai@system") ||
    selectedChatData?.email?.includes("assistant@system") ||
    (selectedChatData?.firstName?.toLowerCase().includes("ai") &&
      selectedChatData?.lastName?.toLowerCase() === "ai");

  useEffect(() => {
    const getGroupMembers = async () => {
      try {
        const response = await apiClient.get(
          `${GET_GROUP_MEMBERS_ROUTE}/${selectedChatData._id}`,
          { withCredentials: true }
        );

        if (response.data.members) {
          setSelectedChatMembers(response.data.members);
        }
      } catch (error) {
        console.log(error);
      }
    };

    if (selectedChatData._id) {
      if (selectedChatType === "group") {
        getGroupMembers();
      } else if (selectedChatType === "contact") {
        // Check block status for contacts
        checkBlockStatus();
      }
    }
  }, [selectedChatData, selectedChatType, setSelectedChatMembers]);

  // ❌ REMOVED: Sync useEffect caused infinite loop
  // updateGroupData already updates selectedChatData and contactOrGroupProfile in the store
  // No need to sync here - trust the single source of truth from updateGroupData

  const checkBlockStatus = async () => {
    if (selectedChatType !== "contact" || !selectedChatData?._id) return;

    try {
      const response = await apiClient.get(
        `${CHECK_BLOCK_STATUS_ROUTE}/${selectedChatData._id}`,
        { withCredentials: true }
      );
      setIBlockedThem(response.data.iBlockedThem);
      setTheyBlockedMe(response.data.theyBlockedMe);
    } catch (error) {
      console.error("Check block status error:", error);
    }
  };

  const handleMoreClick = () => {
    if (isAIAssistant) {
      // Trigger full-screen Christmas effect for AI assistant
      setShowSnowfall(true);
      setTimeout(() => setShowSnowfall(false), 3000); // 3 seconds
    } else {
      // Toggle menu for regular chats
      setShowMenu(!showMenu);
    }
  };

  const handleBlockFriend = async () => {
    try {
      const response = await apiClient.post(
        BLOCK_USER_ROUTE,
        { blockedUserId: selectedChatData._id },
        { withCredentials: true }
      );

      if (response.status === 200) {
        toast.success("User blocked successfully");
        setShowMenu(false);
        // Trigger re-fetch of chat data
        window.location.reload(); // Simple reload, or use state management
      }
    } catch (error) {
      console.error("Block friend error:", error);
      toast.error(error.response?.data?.error || "Failed to block user");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) {
      return;
    }

    try {
      const response = await apiClient.post(
        `${LEAVE_GROUP_ROUTE}/${selectedChatData._id}`,
        {},
        { withCredentials: true }
      );

      if (response.status === 200) {
        toast.success("Left group successfully");
        setShowMenu(false);
        // Close chat and refresh
        window.location.reload();
      }
    } catch (error) {
      console.error("Leave group error:", error);
      toast.error(error.response?.data?.error || "Failed to leave group");
    }
  };

  const handleUnfriend = async () => {
    if (selectedChatType !== "contact" || !selectedChatData?._id) {
      return;
    }

    const confirmFirst = window.confirm(
      "Are you sure you want to unfriend this user?"
    );

    if (!confirmFirst) {
      return;
    }

    const confirmSecond = window.confirm(
      "This action will remove this friend from your list and delete the relationship from the database. You can still search and add them again later.\n\nSelect OK to confirm unfriend or Cancel to go back."
    );

    if (!confirmSecond) {
      return;
    }

    try {
      const response = await apiClient.delete(
        `${UNFRIEND_CONTACT_ROUTE}/${selectedChatData._id}`,
        { withCredentials: true }
      );

      if (response.status === 200) {
        toast.success("Friend removed successfully");
        setShowMenu(false);

        setDirectMessagesContacts(
          directMessagesContacts.filter(
            (contact) => contact._id !== selectedChatData._id
          )
        );

        closeChat();
        setActiveChatId(undefined);
      }
    } catch (error) {
      console.error("Unfriend error:", error);
      toast.error(error.response?.data?.error || "Failed to unfriend user");
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showMenu && !e.target.closest('.more-menu-container')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // Helper function to get latest chat data
  const getLatestChatData = () => {
    if (selectedChatType === "group") {
      // Find updated group from groups list
      const latestGroup = groups.find((g) => g._id === selectedChatData._id);
      return latestGroup || selectedChatData;
    } else {
      // Find updated contact from DM contacts list
      const latestContact = directMessagesContacts.find(
        (c) => c._id === selectedChatData._id
      );
      return latestContact || selectedChatData;
    }
  };

  const handleProfileClick = () => {
    const latestData = getLatestChatData();
    setContactOrGroupProfile(latestData);
    setActiveIcon("contactOrGroupProfile");
  };

  const startDmCall = (type) => {
    if (selectedChatType !== "contact" || !selectedChatData?._id) return;

    // Block check: prevent calls if either user blocked the other
    if (iBlockedThem || theyBlockedMe) {
      toast.error("Cannot call this user");
      return;
    }

    const peerId = selectedChatData._id;
    const callId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString();
    setCallType(type);
    setCallPeerId(peerId);
    setCallId(callId);
    setCallStatus("ringing");
    socket?.emit("call:offer", { to: peerId, callId, callType: type });
  };

  const startGroupCall = (type) => {
    if (selectedChatType !== "group" || !selectedChatData?._id) return;
    const groupId = selectedChatData._id;
    setCallType(type);
    setGroupCallId(groupId);
    setGroupCallStatus("ringing");
    socket?.emit("group:call:offer", { groupId, callType: type });
    // Caller joins room immediately
    const roomName = groupRoomName(groupId);
    joinLiveKitRoom({ roomName, callType: type }).catch(() => { });
  };

  return (
    <div className="single-chat-header">
      <div className="user">
        <div
          className="avatar"
          onClick={handleProfileClick}
        >
          {selectedChatData.name ? (
            selectedChatData.image ? (
              <img src={selectedChatData.image} alt="group avatar" className="img" />
            ) : (
              <div className="img group-img">
                <HiUserGroup />
              </div>
            )
          ) : selectedChatData.image ? (
            <img src={selectedChatData.image} alt="avatar" className="img" />
          ) : (
            <div className="img non-present">
              {selectedChatData.firstName && selectedChatData.lastName
                ? `${selectedChatData.firstName.charAt(
                  0
                )} ${selectedChatData.lastName.charAt(0)}`
                : selectedChatData.firstName
                  ? selectedChatData.firstName.charAt(0)
                  : selectedChatData.lastName
                    ? selectedChatData.lastName.charAt(0)
                    : selectedChatData.email.charAt(0)}
            </div>
          )}
        </div>
        <div
          className="info"
          onClick={handleProfileClick}
        >
          <div>
            {selectedChatType === "group" && selectedChatData.name}
            {selectedChatType === "contact" &&
              (selectedChatData.firstName && selectedChatData.lastName
                ? `${selectedChatData.firstName} ${selectedChatData.lastName}`
                : selectedChatData.firstName
                  ? selectedChatData.firstName
                  : selectedChatData.lastName
                    ? selectedChatData.lastName
                    : selectedChatData.email)}
          </div>
          {selectedChatType === "group" ? (
            <div className="group-members">
              {selectedChatMembers.map((member, index) => (
                <span key={member.id} className="member">
                  {member.id === userInfo.id
                    ? "You"
                    : `${member.firstName} ${member.lastName}`}
                  {index < selectedChatMembers.length - 1 && `,\u00A0`}
                </span>
              ))}
            </div>
          ) : (
            <div>Last Seen</div>
          )}
        </div>
        <div></div>
      </div>
      <div className="icons">
        {selectedChatType === "group" && (
          <>
            <div className="icon" title="Voice call" onClick={() => startGroupCall("audio")}>
              <IoIosCall />
            </div>
            <div className="icon" title="Video call" onClick={() => startGroupCall("video")}>
              <IoIosVideocam />
            </div>
            <div className="icon" onClick={() => setShowAddMemberModal(true)} title="Add Member">
              <IoPersonAdd />
            </div>
          </>
        )}
        {selectedChatType === "contact" && (
          <>
            <div className="icon" title="Voice call" onClick={() => startDmCall("audio")}>
              <IoIosCall />
            </div>
            <div className="icon" title="Video call" onClick={() => startDmCall("video")}>
              <IoIosVideocam />
            </div>
          </>
        )}
        <div
          className="icon"
          title="Search in chat"
          onClick={() => setChatSearchOpen(true)}
        >
          <IoIosSearch />
        </div>

        {/* Hide menu icon if they blocked me */}
        {!theyBlockedMe && (
          <div className="more-menu-container">
            <div className="icon" onClick={handleMoreClick}>
              <IoMdMore />
            </div>

            {/* Dropdown menu for regular chats */}
            {showMenu && !isAIAssistant && (
              <div className="more-menu">
                {selectedChatType === "contact" ? (
                  <>
                    <div className="menu-item" onClick={handleUnfriend}>
                      Unfriend
                    </div>
                    <div className="menu-item" onClick={handleBlockFriend}>
                      Block Friend
                    </div>
                  </>
                ) : (
                  <div className="menu-item" onClick={handleLeaveGroup}>
                    Leave Group
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen Christmas effect for AI assistant */}
      {showSnowfall && isAIAssistant && (
        <div className="christmas-effect-overlay">
          <div className="santa-container">
            <div className="santa">🎅</div>
          </div>
          <div className="snowfall-full">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="snowflake-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                  fontSize: `${0.8 + Math.random() * 0.8}rem`
                }}
              >
                ❄
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <AddMemberModal
          groupId={selectedChatData._id}
          currentMembers={selectedChatMembers.map((m) => m._id)}
          onClose={(success) => {
            setShowAddMemberModal(false);
            if (success) {
              // Refresh member list
              window.location.reload();
            }
          }}
        />
      )}
    </div>
  );
};

export default SingleChatHeader;
