import "./Chat.css";
import { HiUserGroup } from "react-icons/hi";
import { MdFolderZip } from "react-icons/md";

import moment from "moment";

const Chat = ({ contact, isGroup = false, isActive = false, isUnread = false }) => {
  const getFileExtensionFromUrl = (url) => {
    if (!url) return "";

    // Remove query parameters if they exist
    const pathWithoutParams = url.split("?")[0];

    // Get the file name part (last part after "/")
    const fileName = pathWithoutParams.split("/").pop();

    // Extract the extension (part after the last ".")
    const extension = fileName.includes(".") ? fileName.split(".").pop() : "";

    return `${extension} file`;
  };

  const shortenLastMessage = (message) => {
    return message.length > 60 ? `${message.slice(0, 57)}...` : message;
  };

  // ✅ Use contact.image for both group and individual chats
  const avatarImage = contact.image;
  const UNREAD_PLACEHOLDER = "Unread message";

  const getGroupPreview = () => {
    if (isUnread) {
      return UNREAD_PLACEHOLDER;
    }

    if (!contact.lastMessage) {
      return "";
    }

    if (contact.lastMessage?.messageType === "file") {
      return getFileExtensionFromUrl(contact.lastMessage?.fileUrl);
    }

    if (contact.lastMessage?.messageType === "text") {
      return shortenLastMessage(contact.lastMessage?.content || "");
    }

    return "";
  };

  /*const getDirectPreview = () => {
    if (isUnread) {
      return UNREAD_PLACEHOLDER;
    }

    if (!contact.lastMessageType) {
      return "";
    }

    if (contact.lastMessageType === "file") {
      return getFileExtensionFromUrl(contact.lastMessage);
    }

    if (contact.lastMessageType === "text") {
      return shortenLastMessage(contact.lastMessage || "");
    }

    return "";
  };*/

  const getDirectPreview = () => {
    if (isUnread) {
      return UNREAD_PLACEHOLDER;
    }

    // Lấy object tin nhắn (ưu tiên lastMessage vì cấu trúc mới đã chuẩn hóa)
    const msg = contact.lastMessage;
    
    // Nếu không có lastMessage, return rỗng
    if (!msg) return "";

    // Xử lý content: Nếu là object (từ DB cũ) thì lấy .content, nếu là string (preview tự tạo) thì lấy chính nó
    const content = typeof msg.content === 'string' ? msg.content : msg;
    const type = msg.messageType; 

    if (type === "file") {
       // Nếu là file, hiển thị tên file hoặc text cố định
       return msg.fileUrl ? getFileExtensionFromUrl(msg.fileUrl) : "File đính kèm";
    }

    if (type === "text") {
       return shortenLastMessage(content || "");
    }
    
    // Fallback cho trường hợp msg chỉ là chuỗi text (do logic cũ)
    if (typeof msg === 'string') return shortenLastMessage(msg);

    return "";
  };

  // Helper để lấy thời gian chuẩn nhất
  const getLastMessageTime = () => {
    return contact.lastMessage?.timestamp || contact.lastMessageTime || contact.lastMessage?.createdAt;
  };

  const renderDate = (timestamp) => {
    if (!timestamp) return "";
    const date = moment(timestamp);
    const now = moment();

    if (now.format("YYYY-MM-DD") === date.format("YYYY-MM-DD")) {
      return date.format("LT");
    }
    if (now.subtract(1, "days").format("YYYY-MM-DD") === date.format("YYYY-MM-DD")) {
      return "Yesterday";
    }
    if (now.diff(date, 'days') < 7) {
      return date.format("dddd");
    }
    return date.format("L");
  };

  const displayTime = getLastMessageTime();

  return (
    <div className={`chat ${isActive ? "active-chat" : ""}`}>
      {!isGroup && (
        <div className="chat-header-info-avatar">
          {avatarImage ? (
            <img src={avatarImage} alt="avatar" className="img" />
          ) : (
            <div className="img non-present">
              {contact.firstName && contact.lastName
                ? `${contact.firstName.charAt(0)} ${contact.lastName.charAt(0)}`
                : contact.firstName
                  ? contact.firstName.charAt(0)
                  : contact.lastName
                    ? contact.lastName.charAt(0)
                    : contact.email.charAt(0)}
            </div>
          )}
        </div>
      )}
      {isGroup && (
        <div className="chat-header-info-avatar">
          {avatarImage ? (
            <img src={avatarImage} alt="group avatar" className="img" />
          ) : (
            <div className="group-img">
              <HiUserGroup />
            </div>
          )}
        </div>
      )}
      {isGroup ? (
        <div className="chat-info">
          <div className="chat-info-head">
            <span className={`chat-name ${isUnread ? "chat-name-unread" : ""}`}>
              {contact.name}
            </span>
            <div className="date">
              {contact.lastMessage?.timestamp &&
                moment(Date.now()).format("YYYY-MM-DD") ===
                moment(contact.lastMessage?.timestamp).format("YYYY-MM-DD")
                ? moment(contact.lastMessage?.timestamp).format("LT")
                : moment(Date.now())
                  .subtract(1, "days")
                  .format("YYYY-MM-DD") ===
                  moment(contact.lastMessage?.timestamp).format("YYYY-MM-DD")
                  ? "Yesterday"
                  : moment(Date.now())
                    .subtract(2, "days")
                    .format("YYYY-MM-DD") ===
                    moment(contact.lastMessage?.timestamp).format(
                      "YYYY-MM-DD"
                    ) ||
                    moment(Date.now())
                      .subtract(3, "days")
                      .format("YYYY-MM-DD") ===
                    moment(contact.lastMessage?.timestamp).format(
                      "YYYY-MM-DD"
                    ) ||
                    moment(Date.now())
                      .subtract(4, "days")
                      .format("YYYY-MM-DD") ===
                    moment(contact.lastMessage?.timestamp).format(
                      "YYYY-MM-DD"
                    ) ||
                    moment(Date.now())
                      .subtract(5, "days")
                      .format("YYYY-MM-DD") ===
                    moment(contact.lastMessage?.timestamp).format(
                      "YYYY-MM-DD"
                    ) ||
                    moment(Date.now())
                      .subtract(6, "days")
                      .format("YYYY-MM-DD") ===
                    moment(contact.lastMessage?.timestamp).format("YYYY-MM-DD")
                    ? moment(contact.lastMessage?.timestamp).format("dddd")
                    : moment(contact.lastMessage?.timestamp).format("L")}
            </div>
          </div>
          <div
            className={`last-message ${isActive ? "active-chat" : ""} ${isUnread ? "unread" : ""}`}
          >
            {!isUnread && contact.lastMessage?.messageType === "file" && (
              <MdFolderZip className="last-message-file" />
            )}
            {getGroupPreview()}
          </div>
        </div>
      ) : (
        <div className="chat-info">
          <div className="chat-info-head">
            <span className={`chat-name ${isUnread ? "chat-name-unread" : ""}`}>
              {contact.firstName && contact.lastName
                ? `${contact.firstName} ${contact.lastName}`
                : contact.firstName
                  ? contact.firstName
                  : contact.lastName
                    ? contact.lastName
                    : contact.email}
            </span>

            <div className="date">
              {contact.lastMessageTime &&
                moment(Date.now()).format("YYYY-MM-DD") ===
                moment(contact.lastMessageTime).format("YYYY-MM-DD")
                ? moment(contact.lastMessageTime).format("LT")
                : moment(Date.now())
                  .subtract(1, "days")
                  .format("YYYY-MM-DD") ===
                  moment(contact.lastMessageTime).format("YYYY-MM-DD")
                  ? "Yesterday"
                  : moment(Date.now())
                    .subtract(2, "days")
                    .format("YYYY-MM-DD") ===
                    moment(contact.lastMessageTime).format("YYYY-MM-DD") ||
                    moment(Date.now())
                      .subtract(3, "days")
                      .format("YYYY-MM-DD") ===
                    moment(contact.lastMessageTime).format("YYYY-MM-DD") ||
                    moment(Date.now())
                      .subtract(4, "days")
                      .format("YYYY-MM-DD") ===
                    moment(contact.lastMessageTime).format("YYYY-MM-DD") ||
                    moment(Date.now())
                      .subtract(5, "days")
                      .format("YYYY-MM-DD") ===
                    moment(contact.lastMessageTime).format("YYYY-MM-DD") ||
                    moment(Date.now())
                      .subtract(6, "days")
                      .format("YYYY-MM-DD") ===
                    moment(contact.lastMessageTime).format("YYYY-MM-DD")
                    ? moment(contact.lastMessageTime).format("dddd")
                    : moment(contact.lastMessageTime).format("L")}
            </div>
          </div>
          <div
            className={`last-message ${isActive ? "active-chat" : ""} ${isUnread ? "unread" : ""}`}
          >
            {!isUnread && contact.lastMessageType === "file" && (
              <MdFolderZip className="last-message-file" />
            )}
            {getDirectPreview()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
