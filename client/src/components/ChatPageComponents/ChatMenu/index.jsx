import { useState } from "react";
import { useAppStore } from "../../../store";
import "./ChatMenu.css";

const ChatMenu = () => {
  const {
    isChatMenuOpen,
    setChatMenuOpen,
    selectedChatType,
    selectedChatData,
    setActiveIcon,
    setContactOrGroupProfile,
    setSharedFilesFilter,
    setNickname,
  } = useAppStore();

  const [expandFiles, setExpandFiles] = useState(true);
  if (!isChatMenuOpen) return null;

  const goProfileWith = (filter) => {
    setContactOrGroupProfile(selectedChatData);
    setSharedFilesFilter(filter);
    setActiveIcon("contactOrGroupProfile");
    setChatMenuOpen(false);
  };

  const onEditNickname = () => {
    if (selectedChatType !== "contact") return;
    const current = prompt("Nhập biệt danh cho liên hệ này (để trống để xoá):");
    setNickname(selectedChatData._id, current || "");
    setChatMenuOpen(false);
  };

  return (
    <div className="chat-menu">
      <div className="menu-item" onClick={onEditNickname}>
        Aa  Chỉnh sửa biệt danh
      </div>
      <div className="menu-group" onClick={() => setExpandFiles((v) => !v)}>
        <div>File phương tiện & file</div>
        <div className="arrow">{expandFiles ? "▾" : "▸"}</div>
      </div>
      {expandFiles && (
        <>
          <div className="menu-subitem" onClick={() => goProfileWith("media")}>
            📷  File phương tiện
          </div>
          <div className="menu-subitem" onClick={() => goProfileWith("files")}>
            📄  File
          </div>
        </>
      )}
    </div>
  );
};

export default ChatMenu;

