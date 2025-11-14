import { useEffect, useRef, useState } from "react";
import "./LeftSidebarProfile.css";
import { useAppStore } from "../../../store";
import { apiClient } from "../../../lib/api-client";
import {
  HOST,
  LOGOUT_ROUTE,
  UPDATE_PROFILE_ROUTE,
  CHANGE_PASSWORD_ROUTE,
  DELETE_ACCOUNT_ROUTE,
} from "../../../utils/constants";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import upload from "../../../lib/upload";

const LeftSidebarProfile = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const handleFilterClick = (filterName) => {
    setActiveFilter(filterName);
  };

  const {
    activeIcon,
    setActiveIcon,
    userInfo,
    setUserInfo,
    closeChat,
    uploadProgress,
    setUploadProgress,
    uploadTargetId,
    setUploadTargetId,
    uploadFileName,
    setUploadFileName,
  } = useAppStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [image, setImage] = useState(null);
  const [selectedColor, setSelectedColor] = useState(0);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (userInfo.profileSetup) {
      setFirstName(userInfo.firstName);
      setLastName(userInfo.lastName);
      setSelectedColor(userInfo.color);
    }
    if (userInfo.image) {
      setImage(userInfo.image);
    }
  }, [userInfo]);

  const validateProfile = () => {
    if (!firstName) {
      toast.error("First name is required");
      return false;
    }
    if (!lastName) {
      toast.error("Last name is required");
      return false;
    }
    return true;
  };

  const saveChanges = async () => {
    if (validateProfile()) {
      try {
        const response = await apiClient.post(
          UPDATE_PROFILE_ROUTE,
          {
            firstName,
            lastName,
            color: selectedColor,
            image,
          },
          {
            withCredentials: true,
          }
        );

        if (response.status === 200 && response.data) {
          setUserInfo({ ...response.data });
          toast.success("Profile updated successfully");

          // If password fields are filled (for local users), change password
          if (userInfo.authProvider === "local" && currentPassword && newPassword) {
            try {
              const passwordResponse = await apiClient.put(
                CHANGE_PASSWORD_ROUTE,
                { currentPassword, newPassword },
                { withCredentials: true }
              );

              if (passwordResponse.status === 200) {
                toast.success("Password changed successfully");
                setCurrentPassword("");
                setNewPassword("");
              }
            } catch (error) {
              console.error("Change password error:", error);
              const errorMessage = error.response?.data?.error || "Failed to change password";
              toast.error(errorMessage);
            }
          }
        }
      } catch (error) {
        console.log(error);
        toast.error(error.message);
      }
    }
  };

  // const handleFileInputClick = () => {
  //   fileInputRef.current.click();
  // };

  const navigate = useNavigate();

  const logOut = async () => {
    try {
      const response = await apiClient.post(
        LOGOUT_ROUTE,
        {},
        { withCredentials: true }
      );
      if (response.status === 200) {
        navigate("/auth");
        setUserInfo(null);
        closeChat();
      }
    } catch (error) {
      console.log(error);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await apiClient.delete(
        DELETE_ACCOUNT_ROUTE,
        { withCredentials: true }
      );

      if (response.status === 200) {
        toast.success("Account deleted successfully");
        navigate("/auth");
        setUserInfo(null);
        closeChat();
      }
    } catch (error) {
      console.error("Delete account error:", error);
      const errorMessage = error.response?.data?.error || "Failed to delete account";
      toast.error(errorMessage);
    }
  };

  const handleImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = async (event) => {
    let fileUrl = null;

    try {
      const file = event.target.files[0];

      // alert if file size exceeds 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB");
        return;
      }
      // console.log("file:");
      // console.log(file);

      if (file) {
        // setShowFileUploadPlaceholder(true);

        fileUrl = await upload(file, userInfo.id);

        if (fileUrl) {
          setImage(fileUrl);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="left-sidebar-profile">
      <h1>Profile</h1>

      <div className="info-container">
        {/* <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleImageChange}
            name="profile-image"
            accept="image/png, image/jpeg, image/jpg, image/svg, image/webp, image/jfif"
          />
        </div> */}

        <div className="info-inputs">
          <div className="info-input-container">
            {uploadProgress > 0 && uploadTargetId === userInfo.id ? (
              <div className="profile-image uploading">
                {`${uploadProgress.toFixed(2)}%`}
              </div>
            ) : image ? (
              <img
                src={image}
                alt=""
                // alt="profile-image"
                className="profile-image"
                onClick={handleImageClick}
              />
            ) : (
              <div className="profile-image" onClick={handleImageClick}>
                <svg
                  viewBox="0 0 340 340"
                  // className="profile-image-default-user-svg"
                  xmlns="http://www.w3.org/2000/svg"
                  width="340"
                  height="340"
                >
                  <path
                    fill="#2c2e3b"
                    d="m169,.5a169,169 0 1,0 2,0zm0,86a76,76 0 1
1-2,0zM57,287q27-35 67-35h92q40,0 67,35a164,164 0 0,1-226,0"
                  />
                </svg>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageChange}
              // name="profile-image"
              accept="image/png, image/jpeg, image/jpg, image/svg, image/webp, image/jfif"
            />
          </div>
          <div className="info-input-container">
            <input
              placeholder="Email"
              type="email"
              disabled
              value={userInfo.email}
              className="info-input disabled"
            />
          </div>
          <div className="info-input-container">
            <input
              placeholder="First Name"
              type="text"
              onChange={(e) => setFirstName(e.target.value)}
              value={firstName}
              className="info-input"
            />
          </div>
          <div className="info-input-container">
            <input
              placeholder="Last Name"
              type="text"
              onChange={(e) => setLastName(e.target.value)}
              value={lastName}
              className="info-input"
            />
          </div>

          {/* Change Password - Only for local auth users */}
          {userInfo.authProvider === "local" && (
            <>
              <div className="info-input-container">
                <input
                  placeholder="Current Password"
                  type="password"
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  value={currentPassword}
                  className="info-input"
                />
              </div>
              <div className="info-input-container">
                <input
                  placeholder="New Password"
                  type="password"
                  onChange={(e) => setNewPassword(e.target.value)}
                  value={newPassword}
                  className="info-input"
                />
              </div>
            </>
          )}
        </div>
        <div className="info-input-container">
          <button
            className={`info-button ${firstName.length && lastName.length ? "" : "button-disabled"
              }`}
            onClick={saveChanges}
          >
            Save Changes
          </button>
        </div>
        <div className="info-input-container">
          <button className="logout-button" onClick={logOut}>
            Logout
          </button>
        </div>
        <div className="info-input-container">
          <button className="delete-account-button" onClick={deleteAccount}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebarProfile;
