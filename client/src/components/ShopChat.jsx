import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../services/api";
import { useShop } from "../context/ShopContext";
import Icon from "./Icon";

const STORAGE_KEY = "novawear_chat_session";

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch (_error) {
    return null;
  }
}

function chatHeaders(session) {
  return session?.accessToken ? { "X-Chat-Token": session.accessToken } : {};
}

function messageTime(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ShopChat() {
  const { user } = useShop();
  const location = useLocation();
  const [open, setOpen] = useState(
    () => new URLSearchParams(window.location.search).get("chat") === "open",
  );
  const [session, setSession] = useState(readSession);
  const [conversation, setConversation] = useState(null);
  const [profile, setProfile] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [initialMessage, setInitialMessage] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(Boolean(session));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    setProfile({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
    });
  }, [user]);

  useEffect(() => {
    const shouldOpen = new URLSearchParams(location.search).get("chat") === "open";
    if (shouldOpen) setOpen(true);
  }, [location.search]);

  useEffect(() => {
    if (!session?.userId || session.userId === user?.id) return;
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setConversation(null);
    setLoading(false);
  }, [session, user?.id]);

  const loadConversation = useCallback(async (markRead = false, quiet = false) => {
    if (!session?.conversationId) return;
    if (!quiet) setLoading(true);
    try {
      const result = await api.get(
        `/chat/conversations/${session.conversationId}${markRead ? "?markRead=true" : ""}`,
        { headers: chatHeaders(session) },
      );
      setConversation(result.data);
      setError("");
    } catch (requestError) {
      if ([401, 403, 404].includes(requestError.status)) {
        localStorage.removeItem(STORAGE_KEY);
        setSession(null);
        setConversation(null);
        setError("Cuộc trò chuyện cũ không còn khả dụng. Bạn có thể bắt đầu cuộc trò chuyện mới.");
      } else if (!quiet) {
        setError(requestError.message);
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session?.conversationId) return undefined;
    loadConversation(open);
    const interval = window.setInterval(
      () => loadConversation(open, true),
      open ? 5000 : 15000,
    );
    return () => window.clearInterval(interval);
  }, [session?.conversationId, open, loadConversation]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [open, conversation?.messages?.length]);

  useEffect(() => {
    const closeWithEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, []);

  const createConversation = async (event) => {
    event.preventDefault();
    setSending(true);
    setError("");
    try {
      const result = await api.post("/chat/conversations", {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        message: initialMessage,
      });
      const nextSession = {
        conversationId: result.data.id,
        accessToken: result.accessToken || null,
        userId: user?.id || null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
      setConversation(result.data);
      setInitialMessage("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !session) return;
    setSending(true);
    setError("");
    try {
      const result = await api.post(
        `/chat/conversations/${session.conversationId}/messages`,
        { message },
        { headers: chatHeaders(session) },
      );
      setConversation(result.data);
      setDraft("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  };

  const unreadCount = Number(conversation?.customerUnreadCount || 0);

  return (
    <div className={`shop-chat ${open ? "is-open" : ""}`}>
      {!open && (
        <button
          className="shop-chat__trigger"
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Nhắn tin với NOVAWEAR"
        >
          <span><Icon name="message" size={20} /></span>
          <strong>Chat với shop</strong>
          {unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}
        </button>
      )}

      {open && (
        <section className="shop-chat__panel" aria-label="Trò chuyện với NOVAWEAR">
          <header className="shop-chat__header">
            <div>
              <span className="shop-chat__avatar">N</span>
              <p>
                <strong>NOVA Support</strong>
                <small><i /> Thường phản hồi trong vài phút</small>
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Thu nhỏ cửa sổ chat">
              <Icon name="close" size={19} />
            </button>
          </header>

          {!conversation && (
            <div className="shop-chat__welcome">
              <div>
                <span>Xin chào!</span>
                <h2>Bạn cần NOVA hỗ trợ điều gì?</h2>
                <p>Gửi câu hỏi về sản phẩm, size hoặc đơn hàng. Nhân viên sẽ trả lời ngay trong cửa sổ này.</p>
              </div>
              <form onSubmit={createConversation}>
                {!user && (
                  <div className="shop-chat__identity">
                    <label>
                      <span>Họ và tên</span>
                      <input
                        value={profile.name}
                        onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                        autoComplete="name"
                        maxLength={100}
                        required
                      />
                    </label>
                    <label>
                      <span>Email</span>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                        autoComplete="email"
                        required
                      />
                    </label>
                    <label>
                      <span>Số điện thoại <em>(không bắt buộc)</em></span>
                      <input
                        value={profile.phone}
                        onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))}
                        autoComplete="tel"
                        maxLength={15}
                      />
                    </label>
                  </div>
                )}
                {user && <p className="shop-chat__signed-in">Đang trò chuyện với tên <strong>{user.name}</strong></p>}
                <label>
                  <span>Lời nhắn đầu tiên</span>
                  <textarea
                    value={initialMessage}
                    onChange={(event) => setInitialMessage(event.target.value)}
                    placeholder="Ví dụ: Shop tư vấn giúp mình chọn size..."
                    minLength={2}
                    maxLength={1000}
                    required
                  />
                </label>
                {error && <p className="shop-chat__error">{error}</p>}
                <button className="shop-chat__start" type="submit" disabled={sending}>
                  {sending ? "Đang kết nối..." : "Bắt đầu trò chuyện"} <Icon name="send" size={16} />
                </button>
              </form>
            </div>
          )}

          {conversation && (
            <>
              <div className="shop-chat__messages" ref={scrollRef}>
                <p className="shop-chat__day">Cuộc trò chuyện với NOVAWEAR</p>
                {(conversation.messages || []).map((message) => (
                  <article
                    className={message.sender === "operations" ? "is-shop" : "is-customer"}
                    key={message.id}
                  >
                    <div>
                      {message.sender === "operations" && <strong>{message.senderName}</strong>}
                      <p>{message.body}</p>
                      <time>{messageTime(message.createdAt)}</time>
                    </div>
                  </article>
                ))}
                {loading && <p className="shop-chat__loading">Đang cập nhật cuộc trò chuyện...</p>}
              </div>
              <form className="shop-chat__composer" onSubmit={sendMessage}>
                {error && <p className="shop-chat__error">{error}</p>}
                <div>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        if (draft.trim() && !sending) event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Nhập tin nhắn..."
                    maxLength={1000}
                    rows={1}
                  />
                  <button type="submit" disabled={!draft.trim() || sending} aria-label="Gửi tin nhắn">
                    <Icon name="send" size={18} />
                  </button>
                </div>
                <small>Enter để gửi · Shift + Enter để xuống dòng</small>
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
