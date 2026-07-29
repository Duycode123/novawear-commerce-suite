import React, { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { useAdmin } from "../context/AdminContext";
import { Empty, ErrorPanel, Loading, Modal, PageHeader } from "../components/Ui";

const blank = {
  title: "",
  excerpt: "",
  content: "",
  category: "NOVA Journal",
  image: "/Images/nova-v3/home-story.png",
  status: "published",
  publishedAt: new Date().toISOString().slice(0, 10),
};

export default function NewsPage() {
  const { notify } = useAdmin();
  const [articles, setArticles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get("/admin/news");
      setArticles(result.data);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (article = null) => {
    setEditing(article || {});
    setForm(article
      ? { ...blank, ...article, publishedAt: String(article.publishedAt || "").slice(0, 10) }
      : blank);
  };
  const close = () => { setEditing(null); setForm(blank); };
  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = editing?.id
        ? await api.put(`/admin/news/${editing.id}`, form)
        : await api.post("/admin/news", form);
      notify(result.message);
      close();
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (article) => {
    if (!window.confirm(`Xóa “${article.title}”?`)) return;
    try {
      const result = await api.delete(`/admin/news/${article.id}`);
      notify(result.message);
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Website content"
        title="Bài viết"
        copy="Tạo nội dung Blog hiển thị trực tiếp trên cửa hàng và quản lý trạng thái xuất bản."
        actions={<button className="ops-primary-button" onClick={() => open()} type="button">＋ Thêm bài viết</button>}
      />
      {loading && <Loading rows={4} />}
      {error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && articles.length > 0 && (
        <section className="ops-panel ops-list-panel">
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead><tr><th>Tiêu đề</th><th>Chuyên mục</th><th>Trạng thái</th><th>Ngày</th><th /></tr></thead>
              <tbody>
                {articles.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.title}</strong><small>{item.excerpt}</small></td>
                    <td>{item.category}</td>
                    <td>{item.status === "published" ? "Đã xuất bản" : "Bản nháp"}</td>
                    <td>{new Date(item.publishedAt).toLocaleDateString("vi-VN")}</td>
                    <td><div className="ops-row-actions"><button type="button" onClick={() => open(item)}>Sửa</button><button className="danger" type="button" onClick={() => remove(item)}>×</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {!loading && !error && !articles.length && <Empty title="Chưa có bài viết" copy="Tạo bài đầu tiên để hiển thị tại trang Blog." />}

      <Modal open={Boolean(editing)} title={editing?.id ? "Chỉnh sửa bài viết" : "Thêm bài viết"} onClose={close} wide>
        <form className="ops-simple-form" onSubmit={save}>
          <label className="ops-field"><span>Tiêu đề *</span><input required minLength={5} value={form.title} onChange={(event) => change("title", event.target.value)} /></label>
          <label className="ops-field"><span>Chuyên mục</span><input value={form.category} onChange={(event) => change("category", event.target.value)} /></label>
          <label className="ops-field"><span>Đường dẫn ảnh</span><input value={form.image} onChange={(event) => change("image", event.target.value)} /></label>
          <label className="ops-field"><span>Ngày xuất bản</span><input type="date" value={form.publishedAt} onChange={(event) => change("publishedAt", event.target.value)} /></label>
          <label className="ops-field"><span>Trạng thái</span><select value={form.status} onChange={(event) => change("status", event.target.value)}><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option></select></label>
          <label className="ops-field"><span>Tóm tắt *</span><textarea required rows={4} value={form.excerpt} onChange={(event) => change("excerpt", event.target.value)} /></label>
          <label className="ops-field"><span>Nội dung đầy đủ *</span><textarea required rows={15} value={form.content || ""} onChange={(event) => change("content", event.target.value)} placeholder={"## Tiêu đề mục\nNội dung đoạn văn...\n\n## Tiêu đề mục tiếp theo\nNội dung đoạn văn..."} /></label>
          <small>Dùng “##” ở đầu dòng để tạo tiêu đề từng phần trong trang đọc bài.</small>
          <div className="ops-form-actions"><button className="ops-secondary-button" type="button" onClick={close}>Hủy</button><button className="ops-primary-button" disabled={saving} type="submit">{saving ? "Đang lưu..." : "Lưu bài viết"}</button></div>
        </form>
      </Modal>
    </div>
  );
}
