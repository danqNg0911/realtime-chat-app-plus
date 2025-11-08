import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../../../store";
import "./ChatSearch.css";

const ChatSearch = () => {
  const {
    isChatSearchOpen,
    setChatSearchOpen,
    selectedChatMessages,
  } = useAppStore();
  const [term, setTerm] = useState("");
  const [idx, setIdx] = useState(0);
  const lastHighlighted = useRef(null);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    return selectedChatMessages
      .filter((m) => m.messageType === "text" && typeof m.content === "string")
      .map((m) => ({ id: m._id, content: m.content }))
      .filter((m) => m.content?.toLowerCase().includes(t));
  }, [selectedChatMessages, term]);

  useEffect(() => {
    // Reset index when list changes
    setIdx(0);
  }, [term]);

  useEffect(() => {
    if (!isChatSearchOpen) return;
    const current = matches[idx];
    if (current && current.id) {
      const el = document.getElementById(`msg-${current.id}`);
      if (el) {
        lastHighlighted.current?.classList?.remove("search-highlight");
        el.classList.add("search-highlight");
        lastHighlighted.current = el;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [idx, matches, isChatSearchOpen]);

  if (!isChatSearchOpen) return null;

  return (
    <div className="chat-search">
      <input
        autoFocus
        placeholder="Tìm trong đoạn chat..."
        value={term}
        onChange={(e) => setTerm(e.target.value)}
      />
      <div className="count">{matches.length > 0 ? `${idx + 1}/${matches.length}` : "0/0"}</div>
      <button
        onClick={() => setIdx((i) => (matches.length ? (i - 1 + matches.length) % matches.length : 0))}
      >
        Prev
      </button>
      <button
        onClick={() => setIdx((i) => (matches.length ? (i + 1) % matches.length : 0))}
      >
        Next
      </button>
      <button className="close" onClick={() => setChatSearchOpen(false)}>
        ✕
      </button>
    </div>
  );
};

export default ChatSearch;

