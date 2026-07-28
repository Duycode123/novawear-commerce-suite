import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate } from "../config";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, PageHeader } from "../components/Ui";

export default function SupportInboxPage() {
  const { notify } = useAdmin();
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get("/admin/contacts");
      setMessages(result.data);
      if (!selected && result.data.length) setSelected(result.data[0]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [selected]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = async (status) => {
    if (!selected) return;
    try {
      const result = await api.patch(`/admin/contacts/${selected.id}`, { status });
      setSelected(result.data);
      setMessages((current) => current.map((item) => item.id === result.data.id ? result.data : item));
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Customer care" title="Hộp thư hỗ trợ" copy="Tiếp nhận và xử lý yêu cầu từ khách hàng trên cửa hàng." actions={<button className="ops-secondary-button" type="button" onClick={load}>↻ Làm mới</button>} />
      {loading && <Loading rows={5} />}
      {error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && messages.length > 0 && (
        <section className="ops-inbox">
          <aside>
            <header><h2>Tin nhắn</h2><span>{messages.filter((item) => item.status === "new").length} mới</span></header>
            <div>
              {messages.map((message) => (
                <button className={`${selected?.id === message.id ? "is-active" : ""} ${message.status === "new" ? "is-new" : ""}`} type="button" onClick={() => setSelected(message)} key={message.id}>
                  <span>{message.name.charAt(0)}</span>
                  <div><strong>{message.name}</strong><b>{message.subject}</b><p>{message.message}</p></div>
                  <time>{formatDate(message.createdAt)}</time>
                </button>
              ))}
            </div>
          </aside>
          <article className="ops-message-detail">
            <header><div><span>{selected.name.charAt(0)}</span><div><h2>{selected.name}</h2><p>{selected.email} · {selected.phone || "Không có SĐT"}</p></div></div><select value={selected.status} onChange={(event) => update(event.target.value)}><option value="new">Mới</option><option value="in_progress">Đang xử lý</option><option value="resolved">Đã giải quyết</option></select></header>
            <div className="ops-message-meta"><span>Chủ đề</span><strong>{selected.subject}</strong><time>{formatDate(selected.createdAt, true)}</time></div>
            <div className="ops-message-body"><p>{selected.message}</p></div>
            <footer><a className="ops-primary-button" href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}>Trả lời qua email ↗</a>{selected.phone && <a className="ops-secondary-button" href={`tel:${selected.phone}`}>Gọi khách hàng</a>}</footer>
          </article>
        </section>
      )}
      {!loading && !error && !messages.length && <Empty title="Hộp thư đang trống" copy="Yêu cầu từ biểu mẫu hỗ trợ của khách sẽ xuất hiện ở đây." />}
    </div>
  );
}
