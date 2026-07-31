import React, { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { formatDate } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, PageHeader } from "../components/Ui";

const STATUS_LABELS = {
  new: "Mới",
  in_progress: "Đang xử lý",
  resolved: "Đã giải quyết",
};

function lastMessage(contact) {
  const messages = contact.messages || [];
  return messages[messages.length - 1]?.body || contact.message || "Chưa có nội dung.";
}

export default function SupportInboxPage() {
  const { notify } = useAdmin();
  const requestedId = useMemo(
    () => new URLSearchParams(window.location.search).get("open"),
    [],
  );
  const [contacts, setContacts] = useState([]);
  const [selectedId, setSelectedId] = useState(requestedId || "");
  const [filter, setFilter] = useState("all");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const selected = contacts.find((item) => item.id === selectedId) || null;
  const visibleContacts = contacts.filter((item) => {
    if (filter === "chat") return item.channel === "chat";
    if (filter === "open") return item.status !== "resolved";
    return true;
  });

  const mergeContact = useCallback((nextContact) => {
    setContacts((current) => current.map((item) => (
      item.id === nextContact.id ? nextContact : item
    )));
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await api.get("/admin/contacts");
      const list = result.data || [];
      setContacts(list);
      setSelectedId((current) => {
        if (current && list.some((item) => item.id === current)) return current;
        if (requestedId && list.some((item) => item.id === requestedId)) return requestedId;
        return list[0]?.id || "";
      });
      setError("");
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [requestedId]);

  const openConversation = useCallback(async (id, silent = false) => {
    if (!id) return;
    try {
      const result = await api.get(`/admin/contacts/${id}`);
      mergeContact(result.data);
      if (!silent) setError("");
    } catch (requestError) {
      if (!silent) {
        setError(requestError.message);
        notify(requestError.message, "error");
      }
    }
  }, [mergeContact, notify]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!selectedId) return undefined;
    openConversation(selectedId);
    const timer = window.setInterval(() => openConversation(selectedId, true), 5000);
    return () => window.clearInterval(timer);
  }, [selectedId, openConversation]);

  const selectContact = (id) => {
    setSelectedId(id);
    setReply("");
    setContacts((current) => current.map((item) => (
      item.id === id ? { ...item, operationsUnreadCount: 0 } : item
    )));
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    try {
      const result = await api.patch(`/admin/contacts/${selected.id}`, { status });
      mergeContact(result.data);
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  const sendReply = async (event) => {
    event.preventDefault();
    const message = reply.trim();
    if (!selected || !message) return;
    setSending(true);
    try {
      const result = await api.post(`/admin/contacts/${selected.id}/messages`, { message });
      mergeContact(result.data);
      setReply("");
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Customer care"
        title="Hộp thư hỗ trợ"
        copy="Tiếp nhận tin nhắn trực tiếp và yêu cầu liên hệ từ khách hàng trong cùng một nơi."
        actions={(
          <button className="ops-secondary-button" type="button" onClick={() => load()}>
            ↻ Làm mới
          </button>
        )}
      />

      {loading && <Loading rows={5} />}
      {error && !contacts.length && <ErrorPanel message={error} onRetry={() => load()} />}

      {!loading && contacts.length > 0 && (
        <section className="ops-inbox ops-support-inbox">
          <aside>
            <header>
              <div>
                <h2>Hội thoại</h2>
                <span>{contacts.reduce((sum, item) => sum + Number(item.operationsUnreadCount || 0), 0)} chưa đọc</span>
              </div>
              <nav aria-label="Lọc hội thoại">
                <button type="button" className={filter === "all" ? "is-active" : ""} onClick={() => setFilter("all")}>Tất cả</button>
                <button type="button" className={filter === "chat" ? "is-active" : ""} onClick={() => setFilter("chat")}>Chat</button>
                <button type="button" className={filter === "open" ? "is-active" : ""} onClick={() => setFilter("open")}>Đang mở</button>
              </nav>
            </header>

            <div className="ops-support-list">
              {visibleContacts.map((contact) => (
                <button
                  className={`${selectedId === contact.id ? "is-active" : ""} ${Number(contact.operationsUnreadCount || 0) > 0 ? "is-new" : ""}`}
                  type="button"
                  onClick={() => selectContact(contact.id)}
                  key={contact.id}
                >
                  <span>{String(contact.name || "K").charAt(0).toUpperCase()}</span>
                  <div>
                    <strong>{contact.name}</strong>
                    <b>{contact.channel === "chat" ? "Chat trực tiếp" : contact.subject}</b>
                    <p>{lastMessage(contact)}</p>
                    <small>{STATUS_LABELS[contact.status] || contact.status}</small>
                  </div>
                  <time>{formatDate(contact.lastMessageAt || contact.createdAt, true)}</time>
                  {Number(contact.operationsUnreadCount || 0) > 0 && (
                    <em>{contact.operationsUnreadCount > 9 ? "9+" : contact.operationsUnreadCount}</em>
                  )}
                </button>
              ))}
              {!visibleContacts.length && (
                <p className="ops-support-list__empty">Không có hội thoại phù hợp bộ lọc.</p>
              )}
            </div>
          </aside>

          {selected && (
            <article className="ops-message-detail ops-chat-detail">
              <header>
                <div>
                  <span>{String(selected.name || "K").charAt(0).toUpperCase()}</span>
                  <div>
                    <h2>{selected.name}</h2>
                    <p>
                      {selected.email} · {selected.phone || "Không có SĐT"}
                      {selected.assigneeName && <> · Phụ trách: {selected.assigneeName}</>}
                    </p>
                  </div>
                </div>
                <select value={selected.status} onChange={(event) => updateStatus(event.target.value)}>
                  <option value="new">Mới</option>
                  <option value="in_progress">Đang xử lý</option>
                  <option value="resolved">Đã giải quyết</option>
                </select>
              </header>

              <div className="ops-message-meta">
                <span>{selected.channel === "chat" ? "Chat trực tiếp" : "Biểu mẫu"}</span>
                <strong>{selected.subject}</strong>
                <time>Bắt đầu {formatDate(selected.createdAt, true)}</time>
              </div>

              <div className="ops-chat-thread">
                <p>Cuộc trò chuyện với {selected.name}</p>
                {(selected.messages || []).map((message) => (
                  <article
                    className={message.sender === "operations" ? "is-operations" : "is-customer"}
                    key={message.id}
                  >
                    <div>
                      <strong>
                        {message.sender === "operations"
                          ? (message.senderName || "NOVAWEAR")
                          : (message.senderName || selected.name)}
                      </strong>
                      <p>{message.body}</p>
                      <time>{formatDate(message.createdAt, true)}</time>
                    </div>
                  </article>
                ))}
              </div>

              {selected.channel === "chat" ? (
                <form className="ops-chat-composer" onSubmit={sendReply}>
                  <label htmlFor="ops-chat-reply">Trả lời khách hàng</label>
                  <div>
                    <textarea
                      id="ops-chat-reply"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          if (reply.trim() && !sending) event.currentTarget.form?.requestSubmit();
                        }
                      }}
                      placeholder="Nhập nội dung hỗ trợ..."
                      maxLength={1000}
                      rows={2}
                    />
                    <button className="ops-primary-button" type="submit" disabled={!reply.trim() || sending}>
                      {sending ? "Đang gửi..." : "Gửi trả lời →"}
                    </button>
                  </div>
                  <small>Tin nhắn được lưu cùng hội thoại. Enter để gửi, Shift + Enter để xuống dòng.</small>
                </form>
              ) : (
                <footer>
                  <a
                    className="ops-primary-button"
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                  >
                    Trả lời qua email ↗
                  </a>
                  {selected.phone && (
                    <a className="ops-secondary-button" href={`tel:${selected.phone}`}>Gọi khách hàng</a>
                  )}
                </footer>
              )}
            </article>
          )}
        </section>
      )}

      {!loading && !error && !contacts.length && (
        <Empty
          title="Hộp thư đang trống"
          copy="Tin nhắn từ widget chat và biểu mẫu hỗ trợ của khách hàng sẽ xuất hiện ở đây."
        />
      )}
    </div>
  );
}
