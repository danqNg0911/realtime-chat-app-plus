import { useEffect } from "react";
import ChatList from "../../components/ChatPageComponents/ChatList";
import LeftSidebar from "../../components/ChatPageComponents/LeftSidebar";
import SingleChat from "../../components/ChatPageComponents/SingleChat";
import PhotoFeedPage from "../PhotoFeedPage";
import MusicPlayer from "../../components/ChatPageComponents/MusicPlayer";
import ChristmasEffect from "../../components/ChatPageComponents/MusicPlayer/ChristmasEffect";
import VietnamFlagEffect from "../../components/ChatPageComponents/MusicPlayer/VietnamFlagEffect";
import { useAppStore } from "../../store";
import { useAudio } from "../../context/AudioContext";
import "./ChatPage.css";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

const ChatPage = () => {
  const {
    userInfo,
    activeIcon,
    setSelectedChatData,
    setSelectedChatType,
    setSelectedChatMessages,
    setActiveChatId,
  } = useAppStore();
  const { currentSongIndex, isPlaying } = useAudio();
  const navigate = useNavigate();
  useEffect(() => {
    if (!userInfo.profileSetup) {
      toast.error("Please set up your profile first");
      navigate("/profile");
    }
  }, [userInfo, navigate]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveChatId(undefined);
        setSelectedChatType(undefined);
        setSelectedChatData(undefined);
        setSelectedChatMessages([]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="chat-page">
      <LeftSidebar />
      {activeIcon === "photos" ? (
        <PhotoFeedPage />
      ) : activeIcon === "music" ? (
        <div className="music-page-container">
          <MusicPlayer />
          {/* Show effects only when playing */}
          {isPlaying && currentSongIndex === 0 && <ChristmasEffect />}
          {isPlaying && currentSongIndex === 1 && <VietnamFlagEffect />}
        </div>
      ) : (
        <>
          <ChatList />
          <SingleChat />
        </>
      )}
    </div>
  );
};

export default ChatPage;
