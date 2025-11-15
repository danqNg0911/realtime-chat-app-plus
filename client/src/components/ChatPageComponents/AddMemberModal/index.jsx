import { useState, useEffect } from "react";
import "./AddMemberModal.css";
import { apiClient } from "../../../lib/api-client";
import { SEARCH_CONTACTS_ROUTE, ADD_MEMBER_TO_GROUP_ROUTE } from "../../../utils/constants";
import { toast } from "react-toastify";
import { useAppStore } from "../../../store";

const AddMemberModal = ({ groupId, onClose, currentMembers }) => {
    const { userInfo } = useAppStore();
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const searchContacts = async () => {
            if (searchTerm.length < 2) {
                setSearchResults([]);
                return;
            }

            setIsSearching(true);
            try {
                const response = await apiClient.post(
                    SEARCH_CONTACTS_ROUTE,
                    { searchTerm },
                    { withCredentials: true }
                );

                // Filter out current members and self
                const filtered = response.data.contacts.filter(
                    (contact) =>
                        !currentMembers.includes(contact._id) &&
                        contact._id !== userInfo.id
                );

                setSearchResults(filtered);
            } catch (error) {
                console.error("Search error:", error);
            } finally {
                setIsSearching(false);
            }
        };

        const debounce = setTimeout(searchContacts, 300);
        return () => clearTimeout(debounce);
    }, [searchTerm, currentMembers, userInfo.id]);

    const toggleUserSelection = (user) => {
        setSelectedUsers((prev) =>
            prev.find((u) => u._id === user._id)
                ? prev.filter((u) => u._id !== user._id)
                : [...prev, user]
        );
    };

    const handleAddMembers = async () => {
        if (selectedUsers.length === 0) {
            toast.error("Please select at least one member");
            return;
        }

        try {
            const response = await apiClient.post(
                `${ADD_MEMBER_TO_GROUP_ROUTE}/${groupId}`,
                { memberIds: selectedUsers.map((u) => u._id) },
                { withCredentials: true }
            );

            if (response.status === 200) {
                toast.success(`Added ${selectedUsers.length} member(s) successfully`);
                onClose(true); // Pass true to indicate success
            }
        } catch (error) {
            console.error("Add member error:", error);
            toast.error(error.response?.data?.error || "Failed to add members");
        }
    };

    return (
        <div className="add-member-modal-overlay" onClick={onClose}>
            <div className="add-member-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Add Members</h2>
                    <button className="close-button" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    <input
                        type="text"
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                        autoFocus
                    />

                    {selectedUsers.length > 0 && (
                        <div className="selected-users">
                            <p>Selected ({selectedUsers.length}):</p>
                            <div className="selected-chips">
                                {selectedUsers.map((user) => (
                                    <div key={user._id} className="user-chip">
                                        <span>
                                            {user.firstName} {user.lastName}
                                        </span>
                                        <button onClick={() => toggleUserSelection(user)}>×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="search-results">
                        {isSearching && <p className="loading">Searching...</p>}

                        {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
                            <p className="no-results">No contacts found</p>
                        )}

                        {searchResults.map((user) => (
                            <div
                                key={user._id}
                                className={`contact-item ${selectedUsers.find((u) => u._id === user._id) ? "selected" : ""
                                    }`}
                                onClick={() => toggleUserSelection(user)}
                            >
                                <div className="contact-avatar">
                                    {user.image ? (
                                        <img src={user.image} alt="" />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {user.firstName?.charAt(0)}
                                            {user.lastName?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <div className="contact-info">
                                    <div className="contact-name">
                                        {user.firstName} {user.lastName}
                                    </div>
                                    <div className="contact-email">{user.email}</div>
                                </div>
                                {selectedUsers.find((u) => u._id === user._id) && (
                                    <div className="check-icon">✓</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="cancel-button" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="add-button"
                        onClick={handleAddMembers}
                        disabled={selectedUsers.length === 0}
                    >
                        Add {selectedUsers.length > 0 && `(${selectedUsers.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddMemberModal;
