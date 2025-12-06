export const createChatSlice = (set, get) => ({
  activeChatId: undefined,
  refreshChatList: undefined,
  selectedChatType: undefined,
  selectedChatData: undefined,
  selectedChatMessages: [],
  selectedChatMembers: [],
  // In-chat search state
  isChatSearchOpen: false,
  setChatSearchOpen: (isOpen) => set({ isChatSearchOpen: isOpen }),
  unreadChatIds: [],
  unreadGroupIds: [],
  setSelectedChatMembers: (selectedChatMembers) => set({ selectedChatMembers }),
  markChatAsUnread: (chatId) =>
    set((state) => {
      if (!chatId || state.unreadChatIds.includes(chatId)) {
        return {};
      }

      return { unreadChatIds: [...state.unreadChatIds, chatId] };
    }),
  markChatAsRead: (chatId) =>
    set((state) => {
      if (!chatId || !state.unreadChatIds.includes(chatId)) {
        return {};
      }

      return {
        unreadChatIds: state.unreadChatIds.filter((id) => id !== chatId),
      };
    }),
  markGroupAsUnread: (groupId) =>
    set((state) => {
      if (!groupId || state.unreadGroupIds.includes(groupId)) {
        return {};
      }

      return { unreadGroupIds: [...state.unreadGroupIds, groupId] };
    }),
  markGroupAsRead: (groupId) =>
    set((state) => {
      if (!groupId || !state.unreadGroupIds.includes(groupId)) {
        return {};
      }

      return {
        unreadGroupIds: state.unreadGroupIds.filter((id) => id !== groupId),
      };
    }),
  directMessagesContacts: [],
  // isSeen: false,
  uploadProgress: 0,
  placeholderMessage: undefined,
  // showFileUploadPlaceholder: false,
  uploadFileName: undefined,
  uploadTargetId: undefined,
  friendRequests: [],
  friendRequestsCount: 0,
  setFriendRequestsCount: (friendRequestsCount) => set({ friendRequestsCount }),
  setFriendRequests: (friendRequests) => set({ friendRequests }),
  // addFriendRequest: (friendRequest, requester) => {
  //   const { friendRequests } = get();
  // },
  addFriendRequestInFriendRequestsList: (friendRequest) => {
    const { friendRequests } = get();
    // set({ friendRequests: [...friendRequests, friendRequest] });
    get().setFriendRequests([...friendRequests, friendRequest]);
  },
  setUploadTargetId: (uploadTargetId) => set({ uploadTargetId }),
  setPlaceholderMessage: (placeholderMessage) => set({ placeholderMessage }),
  // setShowFileUploadPlaceholder: (showFileUploadPlaceholder) =>
  //   set({ showFileUploadPlaceholder }),
  setUploadFileName: (uploadFileName) => set({ uploadFileName }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
  setIsSeen: (isSeen) => set({ isSeen }),
  setActiveChatId: (activeChatId) => set({ activeChatId }),
  setRefreshChatList: (refreshChatList) => set({ refreshChatList }),
  // setRefreshFriendRequests: (refreshFriendRequests) =>
  //   set({ refreshFriendRequests }),
  setSelectedChatType: (selectedChatType) => set({ selectedChatType }),
  setSelectedChatData: (selectedChatData) => set({ selectedChatData }),
  setSelectedChatMessages: (selectedChatMessages) =>
    set({ selectedChatMessages }),
  setDirectMessagesContacts: (directMessagesContacts) =>
    set({ directMessagesContacts }),
  closeChat: () =>
    set({
      selectedChatType: undefined,
      selectedChatData: undefined,
      selectedChatMessages: [],
      selectedChatMembers: [],
    }),
  /*  
  addMessage: (message) => {
    const { selectedChatMessages } = get();
    const { selectedChatType } = get();
    set({
      placeholderMessage: undefined,
    });
    set({
      selectedChatMessages: [
        ...selectedChatMessages,
        {
          ...message,
          recipient:
            selectedChatType === "group"
              ? message.recipient
              : message.recipient._id,
          sender:
            selectedChatType === "group" ? message.sender : message.sender._id,
        },
      ],
    });
    // set({
    //   showFileUploadPlaceholder: true,
    // });
  },*/

  addMessage: (message) => {
    const { selectedChatMessages } = get();
    
    // Check trùng lặp: Nếu tin nhắn có _id này đã tồn tại thì KHÔNG thêm nữa
    const isDuplicate = selectedChatMessages.some(msg => msg._id === message._id);
    if (isDuplicate) return;

    set({
      selectedChatMessages: [
        ...selectedChatMessages,
        {
          ...message,
          // Đảm bảo giữ nguyên Object để UI hiển thị đúng avatar/tên
          sender: message.sender,
          recipient: message.recipient, 
        },
      ],
    });
  },

  /*addContactsInDMContacts: (message) => {
    // 1. Kiểm tra an toàn: Nếu message rỗng thì dừng ngay để tránh sập
    if (!message || !message.sender || !message.recipient) return;

    const userId = get().userInfo.id;
    const fromId =
      message.sender._id === userId
        ? message.recipient._id
        : message.sender._id;
    const fromData =
      message.sender._id === userId ? message.recipient : message.sender;
    const dmContacts = [...get().directMessagesContacts];
    //const dmContacts = get().directMessagesContacts;
    //const data = dmContacts.find((contact) => contact._id === fromId);
    const index = dmContacts.findIndex((contact) => contact._id === fromId);

    // message preview 
    let previewContent = message.content;
    if (message.messageType === "file") {
        previewContent = "Has sent a file"; 
    }

    // Tạo object tin nhắn preview chuẩn
    const lastMessageData = {
        _id: message._id, 
        content: previewContent || "", 
        // QUAN TRỌNG: Phải có sender để UI biết ai nhắn (tránh crash khi check sender._id)
        sender: message.sender, 
        messageType: message.messageType,
        fileUrl: message.fileUrl,
        // Chấp nhận cả 2 trường thời gian để không bị lỗi hiển thị giờ
        timestamp: message.timestamp || message.createdAt || new Date().toISOString(),
    };

    if (index !== -1 && index !== undefined) {
      dmContacts.splice(index, 1);
      dmContacts.unshift(data);
    } else {
      dmContacts.unshift(fromData);
    }

    if (index !== -1 && index !== undefined) {
      // User đã có trong list -> Cắt ra khỏi vị trí cũ
      const [existingContact] = dmContacts.splice(index, 1);
      
      // Cập nhật tin nhắn mới nhất
      const updatedContact = {
          ...existingContact,
          lastMessage: lastMessageData, 
      };
      
      // Đưa lên đầu
      dmContacts.unshift(updatedContact);
    } else {
      // User mới -> Tạo mới
      const newContact = {
          ...fromData,
          lastMessage: lastMessageData,
      };
      dmContacts.unshift(newContact);
    }
    
    set({ directMessagesContacts: dmContacts });
  },*/

  addContactsInDMContacts: (message) => {
    try {
        const { userInfo, directMessagesContacts } = get();
        if (!userInfo || !message || !message.sender) return;

        const myId = userInfo.id || userInfo._id; 
        const senderId = message.sender._id || message.sender.id;
        const recipientId = message.recipient._id || message.recipient.id;

        // Xác định ID người kia
        const fromId = (senderId.toString() === myId.toString()) ? recipientId : senderId;
        const fromData = (senderId.toString() === myId.toString()) ? message.recipient : message.sender;

        const dmContacts = [...(directMessagesContacts || [])];
        const index = dmContacts.findIndex((contact) => 
            (contact._id || contact.id).toString() === fromId.toString()
        );

        // Preview text
        let previewContent = message.content;
        if (message.messageType === "file") {
            previewContent = message.fileUrl ? "Đã gửi một ảnh" : "Đã gửi một tệp";
        }

        // Tạo lastMessage
        const lastMessageData = {
            _id: message._id,
            content: previewContent || "", 
            sender: message.sender, 
            messageType: message.messageType,
            fileUrl: message.fileUrl,
            timestamp: message.timestamp || message.createdAt || new Date().toISOString(),
        };

        if (index !== -1) {
            const [existingContact] = dmContacts.splice(index, 1);
            dmContacts.unshift({
                ...existingContact,
                lastMessage: lastMessageData, 
            });
        } else {
            dmContacts.unshift({
                ...fromData,
                lastMessage: lastMessageData,
            });
        }

        set({ directMessagesContacts: dmContacts });

    } catch (error) {
        console.error("⚠️ Sidebar Error:", error);
    }
  },

  groups: [],

  setGroups: (groups) => set({ groups }),
  updateGroupData: (groupId, updates = {}) =>
    set((state) => {
      console.log(`🔄 updateGroupData called:`, { groupId, updates });

      const groups = state.groups || [];

      // Find and update the group in the array
      const updatedGroups = groups.map((group) => {
        if (group._id === groupId) {
          console.log(`  ✅ Found group to update:`, group);
          return { ...group, ...updates };
        }
        return group;
      });

      const result = { groups: updatedGroups };
      console.log(`  ✅ Updated groups array`);

      // If this is the currently selected chat, update it too
      if (
        state.selectedChatType === "group" &&
        state.selectedChatData &&
        state.selectedChatData._id === groupId
      ) {
        result.selectedChatData = {
          ...state.selectedChatData,
          ...updates,
        };
        console.log(`  ✅ Updated selectedChatData`);
      }

      // If the sidebar is showing this group's profile, update it too
      if (
        state.contactOrGroupProfile &&
        state.contactOrGroupProfile._id === groupId
      ) {
        result.contactOrGroupProfile = {
          ...state.contactOrGroupProfile,
          ...updates,
        };
        console.log(`  ✅ Updated contactOrGroupProfile`);
      }

      // If updating members, also update selectedChatMembers
      if (updates.members) {
        result.selectedChatMembers = updates.members;
        console.log(`  ✅ Updated selectedChatMembers`);
      }

      return result;
    }),
  // addGroup: (group) => {
  //   const { groups } = get();
  //   set({ groups: [group, ...groups] });
  // },
  addGroup: (group) => {
    const { groups } = get();
    // Check if the group already exists in the groups array
    const groupExists = groups.some((g) => g._id === group._id);
    // If the group does not exist, add it to the beginning
    if (!groupExists) {
      set({ groups: [group, ...groups] });
    }
  },
  // deleteGroup: (group) => {
  //   const { groups } = get();
  //   const groupExists = groups.some((g) => g._id === group._id);
  //   if (groupExists) {
  //     set({ groups: groups.filter((g) => g._id !== group._id) });
  //   }
  // },
  addGroupInGroupList: (message) => {
    const { groups } = get();
    const data = groups.find((group) => group._id === message.groupId);
    const index = groups.findIndex((group) => group._id === message.groupId);
    if (index !== -1 && index !== undefined) {
      groups.splice(index, 1);
      groups.unshift(data);
    }
    set({ groups });
  },
  sortGroupList: (group) => {
    const { groups } = get();
    const index = groups.findIndex((g) => g._id === group._id);
    if (index !== -1 && index !== undefined) {
      groups.splice(index, 1);
      groups.unshift(group);
    }
    set({ groups });
  },
  contactOrGroupProfile: undefined,
  setContactOrGroupProfile: (profile) =>
    set({ contactOrGroupProfile: profile }),
});
