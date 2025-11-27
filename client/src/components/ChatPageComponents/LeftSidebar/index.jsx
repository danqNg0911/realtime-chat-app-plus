import { BsChatLeftText } from "react-icons/bs";
import { IoMailOutline, IoCameraOutline, IoMusicalNotesOutline } from "react-icons/io5";
import "./LeftSidebar.css";
import { useAppStore } from "../../../store";
import { useEffect } from "react";
import { apiClient } from "../../../lib/api-client";
import { GET_FRIEND_REQUESTS_ROUTE } from "../../../utils/constants";

const LeftSidebar = () => {
  const { activeIcon, setActiveIcon, userInfo } = useAppStore();

  const handleIconClick = (iconName) => {
    setActiveIcon(iconName);
  };

  const { friendRequestsCount, setFriendRequestsCount } = useAppStore();

  useEffect(() => {
    setActiveIcon("chat");

    const getFriendRequests = async () => {
      const response = await apiClient.get(GET_FRIEND_REQUESTS_ROUTE, {
        withCredentials: true,
      });
      if (response.data.friendRequests) {
        setFriendRequestsCount(response.data.friendRequests.length);
      }
    };

    getFriendRequests();
  }, [setActiveIcon, setFriendRequestsCount]);

  return (
    <div className="left-sidebar">
      <div className="icons">
        <div className="icon-container">
          <div
            className={`tooltip icon ${activeIcon === "chat" ? "active-icon" : ""
              }`}
            onClick={() => handleIconClick("chat")}
          >
            <BsChatLeftText />
            <span className="tooltiptext">Chats</span>
          </div>
        </div>
        <div className="icon-container">
          <div
            className={`tooltip icon ${activeIcon === "photos" ? "active-icon" : ""
              }`}
            onClick={() => handleIconClick("photos")}
          >
            <IoCameraOutline />
            <span className="tooltiptext">Photos</span>
          </div>
        </div>
        <div className="icon-container">
          <div
            className={`tooltip icon friend-requests-icon-container ${activeIcon === "friend-requests" ? "active-icon" : ""
              }`}
            onClick={() => handleIconClick("friend-requests")}
          >
            {friendRequestsCount > 0 && (
              <div className="friend-requests-count">{friendRequestsCount}</div>
            )}
            <IoMailOutline />
            <span className="tooltiptext">Requests</span>
          </div>
        </div>
      </div>
      {/* <div className="between-icon-vertical-space-filler"></div> */}
      <div className="icons">
        <div className="icon-container">
          <div
            className={`tooltip icon ${activeIcon === "music" ? "active-icon" : ""
              }`}
            onClick={() => handleIconClick("music")}
          >
            <IoMusicalNotesOutline />
            <span className="tooltiptext">Music</span>
          </div>
        </div>
        <div className="icon-container">
          <div
            className={`tooltip icon ${activeIcon === "avatar" ? "active-icon" : ""
              }`}
            onClick={() => handleIconClick("avatar")}
          >
            <div className="avatar">
              {userInfo.image ? (
                <img src={userInfo.image} alt="avatar" className="img" />
              ) : (
                <div className="img no-avatar">
                  {userInfo.firstName && userInfo.lastName
                    ? `${userInfo.firstName.charAt(0)} ${userInfo.lastName.charAt(
                      0
                    )}`
                    : userInfo.firstName
                      ? userInfo.firstName.charAt(0)
                      : userInfo.lastName
                        ? userInfo.lastName.charAt(0)
                        : userInfo.email.charAt(0)}
                </div>
              )}
            </div>
            <span className="tooltiptext">Profile</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;
