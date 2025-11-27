import { useEffect, useState, useRef } from "react";
import "./LeftSidebarContactOrGroupProfile.css";
import moment from "moment";
import { useAppStore } from "../../../store";
import { apiClient } from "../../../lib/api-client";
import {
  GET_CONTACT_FILES_ROUTE,
  GET_GROUP_FILES_ROUTE,
  GET_GROUP_MEMBERS_ROUTE,
  GET_GROUPS_IN_COMMON_ROUTE,
  UPDATE_GROUP_INFO_ROUTE,
} from "../../../utils/constants";
import { HiUserGroup } from "react-icons/hi";
import { MdFolderZip, MdEdit, MdCheck, MdClose } from "react-icons/md";
import { IoMdArrowRoundDown } from "react-icons/io";
import { toast } from "react-toastify";
import upload from "../../../lib/upload";

const LeftSidebarContactOrGroupProfile = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editedGroupName, setEditedGroupName] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const handleFilterClick = (filterName) => {
    setActiveFilter(filterName);
  };

  const {
    activeIcon,
    setActiveIcon,
    userInfo,
    setUserInfo,
    closeChat,
    contactOrGroupProfile,
    setContactOrGroupProfile,
    setSelectedChatType,
    selectedChatData,
    setSelectedChatMessages,
    setActiveChatId,
    selectedChatType,
  } = useAppStore();

  const [groupsInCommon, setGroupsInCommon] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);

  const handleEditGroupClick = () => {
    setIsEditingGroup(true);
    setEditedGroupName(contactOrGroupProfile.name || "");
  };

  const handleCancelEdit = () => {
    setIsEditingGroup(false);
    setEditedGroupName("");
  };

  const handleSaveGroupInfo = async () => {
    try {
      const updates = {};
      if (editedGroupName.trim() && editedGroupName !== contactOrGroupProfile.name) {
        updates.name = editedGroupName.trim();
      }

      if (Object.keys(updates).length === 0) {
        toast.info("No changes to save");
        setIsEditingGroup(false);
        return;
      }

      const response = await apiClient.put(
        `${UPDATE_GROUP_INFO_ROUTE}/${contactOrGroupProfile._id}`,
        updates,
        { withCredentials: true }
      );

      if (response.status === 200) {
        toast.success("Group updated successfully");
        setContactOrGroupProfile({
          ...contactOrGroupProfile,
          ...updates,
        });
        setIsEditingGroup(false);
      }
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error(error.response?.data?.error || "Failed to update group");
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const imageUrl = await upload(file);

      const response = await apiClient.put(
        `${UPDATE_GROUP_INFO_ROUTE}/${contactOrGroupProfile._id}`,
        { image: imageUrl },
        { withCredentials: true }
      );

      if (response.status === 200) {
        toast.success("Group image updated");
        setContactOrGroupProfile({
          ...contactOrGroupProfile,
          image: imageUrl,
        });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    const getGroupsInCommon = async () => {
      try {
        const response = await apiClient.get(
          `${GET_GROUPS_IN_COMMON_ROUTE}/${contactOrGroupProfile._id}`,
          { withCredentials: true }
        );

        if (response.status === 201 && response.data.groups) {
          setGroupsInCommon(response.data.groups);
        }
      } catch (error) {
        console.log(error);
      }
    };

    const getGroupMembers = async () => {
      try {
        const response = await apiClient.get(
          `${GET_GROUP_MEMBERS_ROUTE}/${contactOrGroupProfile._id}`,
          { withCredentials: true }
        );

        if (response.data.members) {
          setGroupMembers(response.data.members);
        }
      } catch (error) {
        console.log(error);
      }
    };

    const getContactFiles = async () => {
      try {
        const response = await apiClient.get(
          `${GET_CONTACT_FILES_ROUTE}/${contactOrGroupProfile._id}`,
          { withCredentials: true }
        );

        if (response.data.files) {
          setSharedFiles(response.data.files);
        }
      } catch (error) {
        console.log(error);
      }
    };
    const getGroupFiles = async () => {
      try {
        const response = await apiClient.get(
          `${GET_GROUP_FILES_ROUTE}/${contactOrGroupProfile._id}`,
          { withCredentials: true }
        );

        if (response.data.files) {
          setSharedFiles(response.data.files);
        }
      } catch (error) {
        console.log(error);
      }
    };

    if (!contactOrGroupProfile.name) {
      console.log(contactOrGroupProfile._id);
      getGroupsInCommon();
      getContactFiles();
    } else if (contactOrGroupProfile.name) {
      getGroupMembers();
      getGroupFiles();
    }
  }, [contactOrGroupProfile]);

  // console.log("sharedFiles:");
  // console.log(sharedFiles);

  const checkIfImage = (filePath) => {
    // Extract the part before the query parameters
    const pathWithoutParams = filePath.split("?")[0];

    // Define regex to check if it ends with a valid image extension
    const imageRegex =
      /\.(jpg|jpeg|png|gif|bmp|tiff|tif|webp|svg|ico|heic|heif|jfif)$/i;

    // Test the cleaned path
    return imageRegex.test(pathWithoutParams);
  };

  const getFileNameFromUrl = (fileName, maxLength = 81) => {
    if (!fileName) return "";

    // Find the last closing parenthesis ")"
    const lastClosingParenIndex = fileName.lastIndexOf(")");

    // Extract the file name part after the last closing parenthesis
    const cleanFileName =
      lastClosingParenIndex !== -1
        ? fileName.substring(lastClosingParenIndex + 1).trim()
        : fileName; // If no closing parenthesis, return the original file name

    return cleanFileName.length > maxLength
      ? cleanFileName.substring(0, maxLength) + "..."
      : cleanFileName;
  };

  const handleDownload = (url) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", ""); // This forces a download -> Downloads with the original filename from the URL
    // link.setAttribute("download", "myFileName.extension"); // Downloads as "myImage.jpg" for example
    document.body.appendChild(link);
    link.click();
    // link.remove(); redundant -> below line already does the same thing
    document.body.removeChild(link);
  };

  return (
    <div className="left-sidebar-contact-or-group-profile">
      <div className="name-header">
        {isEditingGroup ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
            <input
              type="text"
              value={editedGroupName}
              onChange={(e) => setEditedGroupName(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 12px",
                fontSize: "1.2rem",
                border: "2px solid #4a9eff",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.05)",
                color: "white",
              }}
              placeholder="Enter group name"
              autoFocus
            />
            <button
              onClick={handleSaveGroupInfo}
              style={{
                padding: "8px 12px",
                background: "#4a9eff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <MdCheck size={20} color="white" />
            </button>
            <button
              onClick={handleCancelEdit}
              style={{
                padding: "8px 12px",
                background: "#666",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
              }}
            >
              <MdClose size={20} color="white" />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
            <h1 style={{ flex: 1 }}>
              {contactOrGroupProfile.name
                ? contactOrGroupProfile.name
                : `${contactOrGroupProfile.firstName} ${contactOrGroupProfile.lastName}`}
            </h1>
            {contactOrGroupProfile.name && (
              <button
                onClick={handleEditGroupClick}
                style={{
                  padding: "8px",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Edit group name"
              >
                <MdEdit size={20} color="white" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="info-container">
        <div className="info-inputs">
          {!contactOrGroupProfile.name ? (
            contactOrGroupProfile.image ? (
              <div className="info-input-container">
                <img
                  src={contactOrGroupProfile.image}
                  alt=""
                  className="profile-image"
                />
              </div>
            ) : (
              <div className="info-input-container">
                <div className="profile-image">
                  <svg
                    viewBox="0 0 340 340"
                    xmlns="http://www.w3.org/2000/svg"
                    width="340"
                    height="340"
                  >
                    <path
                      fill="#2c2e3b"
                      d="m169,.5a169,169 0 1,0 2,0zm0,86a76,76 0 1 1-2,0zM57,287q27-35 67-35h92q40,0 67,35a164,164 0 0,1-226,0"
                    />
                  </svg>
                </div>
              </div>
            )
          ) : (
            <div className="info-input-container">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                style={{ display: "none" }}
              />
              <div
                className="profile-image group"
                style={{
                  backgroundImage: contactOrGroupProfile.image
                    ? `url(${contactOrGroupProfile.image})`
                    : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  cursor: "pointer",
                  position: "relative",
                }}
                onClick={() => fileInputRef.current?.click()}
                title="Click to change group image"
              >
                {!contactOrGroupProfile.image && <HiUserGroup />}
                {uploadingImage && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(0,0,0,0.7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      color: "white",
                      fontSize: "0.9rem",
                    }}
                  >
                    Uploading...
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="footer">
            <div className="info-input-container">
              {!contactOrGroupProfile.name ? (
                // <div className="label">Email:</div>
                <div className="label">Contact:</div>
              ) : (
                <div className="label">Created at:</div>
              )}
              <div className="info-input">
                {contactOrGroupProfile.name ? (
                  // moment(contactOrGroupProfile.createdAt).format("YYYY-MM-DD")
                  moment(contactOrGroupProfile.createdAt).format("L")
                ) : (
                  <div className="contact-info">
                    {contactOrGroupProfile.firstName}
                    {"\u00A0"}
                    {contactOrGroupProfile.lastName}
                    {"\u00A0"}
                    {"\u00A0"}
                    <div className="contact-info-divider-container">
                      <div className="contact-info-divider"></div>
                    </div>
                    {"\u00A0"}
                    {"\u00A0"}
                    {contactOrGroupProfile.email}
                  </div>
                )}
              </div>
            </div>
            {contactOrGroupProfile.name && (
              <div className="info-input-container">
                {/* {
                  contactOrGroupProfile.name && ( */}
                <div className="label">Group members:</div>
                {/* )
                  // : (
                  //   <div className="label">Full name:</div>
                  // )
                } */}
                <div className="info-input group-members">
                  {
                    contactOrGroupProfile.name &&
                    (groupMembers.length > 0 ? (
                      <div>
                        {groupMembers.map((member, index) => {
                          const resolvedId = member.id || member._id;
                          const memberId = resolvedId
                            ? resolvedId.toString()
                            : undefined;
                          const displayName =
                            memberId === userInfo.id
                              ? "You"
                              : `${member.firstName} ${member.lastName}`;

                          return (
                            <div
                              className="group-member"
                              key={memberId || `group-member-${index}`}
                            >
                              {displayName}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      "no members"
                    ))
                    // : (
                    //   `${contactOrGroupProfile.firstName} ${contactOrGroupProfile.lastName}`
                    // )
                  }
                </div>
              </div>
            )}
            {!contactOrGroupProfile.name && (
              <div className="info-input-container">
                <div className="label">Groups in common:</div>
                <div className="info-input shared-groups">
                  {groupsInCommon.length > 0 ? (
                    <div>
                      {groupsInCommon.map((group) => (
                        <div
                          className="group-in-common"
                          key={group._id}
                        // onClick={() => handleGroupInCommonClick(group)}
                        >
                          {group.name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    "no groups in common"
                  )}
                </div>
              </div>
            )}
            <div className="info-input-container">
              <div className="label">Shared files:</div>
              <div className="info-input shared-files-placeholder"></div>
            </div>
            <div className="info-input-container">
              <div className="info-input shared-files">
                {sharedFiles.length <= 0
                  ? "no shared files"
                  : sharedFiles.map((file) => (
                    <div className="shared-file" key={file._id}>
                      {checkIfImage(file.fileUrl) ? (
                        <div
                          className="image-container"
                        // onClick={() => {
                        //   setShowImage(true);
                        //   setImageURL(file.fileUrl);
                        // }}
                        >
                          <img src={file.fileUrl} alt="" />
                        </div>
                      ) : (
                        <div className="file-container">
                          <div className="file-icon-container">
                            <MdFolderZip className="file-icon" />
                          </div>
                          <div className="file-name">
                            {getFileNameFromUrl(
                              file.fileUrl.split("?")[0].split("/").pop()
                            )}
                          </div>
                          <div className="download-icon-container-link">
                            <a
                              className="download-icon-container"
                              onClick={() => handleDownload(file.fileUrl)}
                            >
                              <IoMdArrowRoundDown className="download-icon" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebarContactOrGroupProfile;
