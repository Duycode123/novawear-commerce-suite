import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney } from "../config/site";
import { useShop } from "../context/ShopContext";
import { ErrorState, Modal, SmartImage, StatusPill } from "../components/Common";

export default function AccountPage() {
  const { user, logout, notify, updateLocalUser } = useShop();
  const [tab, setTab] = useState("overview");
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "", address: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const [me, history] = await Promise.all([api.get("/auth/me"), api.get("/orders/my")]);
      setOrders(history.data);
      setProfile({
        name: me.user.name,
        phone: me.user.phone || "",
        address: me.customer?.address || me.employee?.address || "",
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user) return <Navigate to="/dang-nhap" state={{ from: "/tai-khoan" }} replace />;

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.put("/auth/me", profile);
      updateLocalUser(result.user);
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Bạn chắc chắn muốn hủy đơn hàng này?")) return;
    try {
      const result = await api.patch(`/orders/${orderId}/cancel`, {});
      setOrders((current) => current.map((item) => item.id === orderId ? result.data : item));
      setSelectedOrder(result.data);
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };
  const changePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return notify("Mật khẩu xác nhận chưa khớp.", "error");
    setSaving(true);
    try {
      const result = await api.put("/auth/password", passwordForm);
      if (result.token) sessionStorage.setItem("novawear_token", result.token);
      notify(result.message);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }
    catch (requestError) { notify(requestError.message, "error"); }
    finally { setSaving(false); }
  };

  const activeOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const totalSpent = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="account-page section">
      <header className="account-header">
        <div className="account-header__identity">
          <div className="avatar avatar--large">{user.name?.charAt(0)}</div>
          <div><p className="eyebrow">NOVA MEMBER / ACTIVE</p><h1>Xin chào, {user.name?.split(" ").slice(-1)[0]}.</h1><p>Quản lý đơn hàng, hồ sơ và bảo mật tài khoản của bạn.</p></div>
        </div>
        <div className="account-header__meta">
          <span>Tài khoản</span>
          <strong>{user.email}</strong>
          <button type="button" onClick={logout}>Đăng xuất <span>↗</span></button>
        </div>
      </header>

      <div className="account-layout">
        <aside className="account-nav">
          <p>Quản lý tài khoản</p>
          <button className={tab === "overview" ? "is-active" : ""} onClick={() => setTab("overview")} type="button"><span>01</span>Tổng quan</button>
          <button className={tab === "orders" ? "is-active" : ""} onClick={() => setTab("orders")} type="button"><span>02</span>Đơn hàng <b>{orders.length}</b></button>
          <button className={tab === "profile" ? "is-active" : ""} onClick={() => setTab("profile")} type="button"><span>03</span>Thông tin cá nhân</button>
          <button className={tab === "security" ? "is-active" : ""} onClick={() => setTab("security")} type="button"><span>04</span>Bảo mật</button>
          <p>Dịch vụ</p>
          <Link to="/doi-tra"><span>05</span>Đổi trả & hoàn tiền</Link>
          <Link to="/ho-tro"><span>06</span>Trợ giúp</Link>
        </aside>

        <main className="account-content">
          {loading && <div className="account-loading"><div className="skeleton skeleton--panel" /><div className="skeleton skeleton--panel" /></div>}
          {error && <ErrorState message={error} onRetry={load} />}

          {!loading && !error && tab === "overview" && (
            <>
              <div className="account-stats">
                <div><span>Đơn đang xử lý</span><strong>{activeOrders.length}</strong><small>Theo dõi ngay →</small></div>
                <div><span>Tổng đơn hàng</span><strong>{orders.length}</strong><small>Từ khi tham gia</small></div>
                <div><span>Tổng chi tiêu</span><strong>{formatMoney(totalSpent)}</strong><small>Cảm ơn bạn!</small></div>
              </div>
              <section className="account-panel">
                <div className="panel-heading"><div><p className="eyebrow">Gần đây</p><h2>Đơn hàng mới nhất</h2></div><button type="button" onClick={() => setTab("orders")}>Xem tất cả →</button></div>
                {orders.length ? (
                  <div className="compact-orders">
                    {orders.slice(0, 3).map((order) => (
                      <button type="button" className="compact-order" onClick={() => setSelectedOrder(order)} key={order.id}>
                        <div className="compact-order__images">
                          {order.items.slice(0, 2).map((item, index) => <SmartImage src={item.image} alt="" key={`${item.productId}-${index}`} />)}
                        </div>
                        <div><strong>{order.id}</strong><span>{formatDate(order.createdAt)} · {order.items.length} sản phẩm</span></div>
                        <StatusPill status={order.status} />
                        <b>{formatMoney(order.total)}</b>
                        <span>→</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="inline-empty"><p>Bạn chưa có đơn hàng nào.</p><Link className="button button--dark button--small" to="/cua-hang">Mua sắm ngay</Link></div>
                )}
              </section>
              <section className="member-banner">
                <div><p className="eyebrow">NOVA MEMBER</p><h2>Tích lũy theo cách tự nhiên.</h2><p>Mỗi đơn hàng đưa bạn gần hơn tới các đặc quyền thành viên.</p></div>
                <div><strong>{Math.min(100, Math.round(totalSpent / 50000))}%</strong><span>Tiến độ lên hạng Gold</span></div>
              </section>
            </>
          )}

          {!loading && !error && tab === "orders" && (
            <section className="account-panel">
              <div className="panel-heading"><div><p className="eyebrow">Lịch sử</p><h2>Tất cả đơn hàng</h2></div><Link to="/tra-cuu">Tra cứu đơn khách →</Link></div>
              {orders.length ? (
                <div className="order-history">
                  {orders.map((order) => (
                    <article className="history-order" key={order.id}>
                      <header><div><strong>{order.id}</strong><span>Đặt ngày {formatDate(order.createdAt)} · Mã tra cứu {order.trackingCode}</span></div><StatusPill status={order.status} /></header>
                      <div className="history-order__body">
                        <div className="history-order__items">
                          {order.items.slice(0, 3).map((item, index) => (
                            <div key={`${item.productId}-${index}`}><SmartImage src={item.image} alt={item.name} /><span>{item.quantity}</span></div>
                          ))}
                        </div>
                        <div><span>Tổng thanh toán</span><strong>{formatMoney(order.total)}</strong></div>
                        <button type="button" onClick={() => setSelectedOrder(order)}>Xem chi tiết →</button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <div className="inline-empty"><p>Bạn chưa có đơn hàng nào.</p><Link className="button button--dark button--small" to="/cua-hang">Mua sắm ngay</Link></div>}
            </section>
          )}

          {!loading && !error && tab === "profile" && (
            <section className="account-panel profile-panel">
              <div className="panel-heading"><div><p className="eyebrow">Hồ sơ</p><h2>Thông tin cá nhân</h2></div></div>
              <form onSubmit={saveProfile}>
                <div className="form-grid">
                  <label className="field"><span>Họ và tên</span><input required minLength={2} value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} /></label>
                  <label className="field"><span>Số điện thoại</span><input required value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} /></label>
                  <label className="field field--wide"><span>Email</span><input value={user.email} disabled /><small>Email đăng nhập chưa thể thay đổi trực tuyến.</small></label>
                  <label className="field field--wide"><span>Địa chỉ mặc định</span><textarea rows={3} value={profile.address} onChange={(event) => setProfile((current) => ({ ...current, address: event.target.value }))} placeholder="Địa chỉ thường nhận hàng" /></label>
                </div>
                <button className="button button--dark" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
              </form>
            </section>
          )}
          {!loading && !error && tab === "security" && (
            <section className="account-panel profile-panel"><div className="panel-heading"><div><p className="eyebrow">Bảo mật</p><h2>Đổi mật khẩu</h2></div></div>
              <form onSubmit={changePassword} className="password-form"><label className="field"><span>Mật khẩu hiện tại</span><input type="password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} /></label><label className="field"><span>Mật khẩu mới</span><input type="password" minLength={10} maxLength={128} pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,128}" required value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} /><small>Từ 10 ký tự, gồm chữ hoa, chữ thường và số.</small></label><label className="field"><span>Xác nhận mật khẩu mới</span><input type="password" minLength={10} maxLength={128} required value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} /></label><button className="button button--dark" type="submit" disabled={saving}>{saving ? "Đang cập nhật..." : "Cập nhật mật khẩu"}</button></form>
            </section>
          )}
        </main>
      </div>

      <Modal open={Boolean(selectedOrder)} title={`Chi tiết ${selectedOrder?.id || ""}`} onClose={() => setSelectedOrder(null)} size="large">
        {selectedOrder && (
          <div className="order-detail-modal">
            <div className="order-detail-meta">
              <div><span>Trạng thái</span><StatusPill status={selectedOrder.status} /></div>
              <div><span>Mã tra cứu</span><strong>{selectedOrder.trackingCode}</strong></div>
              <div><span>Ngày đặt</span><strong>{formatDate(selectedOrder.createdAt)}</strong></div>
            </div>
            <div className="order-timeline">
              {selectedOrder.timeline.map((entry, index) => (
                <div className="is-done" key={`${entry.status}-${index}`}><i>✓</i><span><strong>{entry.label}</strong><small>{formatDate(entry.at, { hour: "2-digit", minute: "2-digit" })}</small></span></div>
              ))}
            </div>
            <div className="order-detail-items">
              {selectedOrder.items.map((item, index) => (
                <div key={`${item.productId}-${index}`}>
                  <SmartImage src={item.image} alt={item.name} />
                  <span><strong>{item.name}</strong><small>{item.color} · Size {item.size} · SL {item.quantity}</small></span>
                  <b>{formatMoney(item.price * item.quantity)}</b>
                </div>
              ))}
            </div>
            <div className="order-detail-total"><span>Tổng thanh toán</span><strong>{formatMoney(selectedOrder.total)}</strong></div>
            {["pending", "confirmed"].includes(selectedOrder.status) && (
              <button className="button button--danger" type="button" onClick={() => cancelOrder(selectedOrder.id)}>Hủy đơn hàng</button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
