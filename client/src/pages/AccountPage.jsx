import React, { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney, PAYMENT_STATUS } from "../config/site";
import { useShop } from "../context/ShopContext";
import { ErrorState, Modal, SmartImage, StatusPill } from "../components/Common";

function normalizeAddress(value = "") {
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

const ACCOUNT_TABS = new Set(["overview", "orders", "profile", "security", "settings"]);
const DEFAULT_PREFERENCES = { orderStatusEmails: true, reducedMotion: false };

function validAccountTab(value) {
  return ACCOUNT_TABS.has(value) ? value : "overview";
}

export default function AccountPage() {
  const { user, logout, notify, updateLocalUser, integrations } = useShop();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(() => validAccountTab(searchParams.get("tab")));
  const [orders, setOrders] = useState([]);
  const [membership, setMembership] = useState(null);
  const [profile, setProfile] = useState({ name: user?.name || "", phone: user?.phone || "", address: "" });
  const [savedProfileAddress, setSavedProfileAddress] = useState("");
  const [addressCheckOpen, setAddressCheckOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [cancelReason, setCancelReason] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: "", images: [] });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);
  const [preferences, setPreferences] = useState({
    ...DEFAULT_PREFERENCES,
    ...(user?.preferences || {}),
  });

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const [me, history] = await Promise.all([api.get("/auth/me"), api.get("/orders/my")]);
      setOrders(history.data);
      setMembership(me.membership || null);
      const openId = searchParams.get("order");
      setSelectedOrder((current) => {
        const targetId = openId || current?.id;
        return targetId ? history.data.find((item) => item.id === targetId) || null : current;
      });
      const profileAddress = me.customer?.address || me.employee?.address || "";
      setProfile({
        name: me.user.name,
        phone: me.user.phone || "",
        address: profileAddress,
      });
      setSavedProfileAddress(profileAddress);
      setPreferences({ ...DEFAULT_PREFERENCES, ...(me.user.preferences || {}) });
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, searchParams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const nextTab = validAccountTab(searchParams.get("tab"));
    setTab(nextTab);
  }, [searchParams]);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(() => load({ silent: true }), 15000);
    return () => window.clearInterval(timer);
  }, [user, load]);

  const changeTab = (nextTab) => {
    setTab(nextTab);
    const next = new URLSearchParams(searchParams);
    if (nextTab === "overview") next.delete("tab"); else next.set("tab", nextTab);
    next.delete("order");
    setSearchParams(next, { replace: true });
  };

  const openOrder = (order) => {
    setSelectedOrder(order);
    setCancelReason("");
    const next = new URLSearchParams(searchParams);
    next.set("tab", "orders");
    next.set("order", order.id);
    setTab("orders");
    setSearchParams(next, { replace: true });
  };

  const closeOrder = () => {
    setSelectedOrder(null);
    setCancelReason("");
    const next = new URLSearchParams(searchParams);
    next.delete("order");
    setSearchParams(next, { replace: true });
  };

  const closeReview = () => {
    setReviewTarget(null);
    setReviewForm({ rating: 5, content: "", images: [] });
  };

  if (!user) return <Navigate to="/dang-nhap" state={{ from: "/tai-khoan" }} replace />;

  const persistProfile = async (addressConfirmation = null) => {
    setSaving(true);
    try {
      const result = await api.put("/auth/me", {
        ...profile,
        ...(addressConfirmation ? { addressConfirmation } : {}),
      });
      updateLocalUser(result.user);
      setSavedProfileAddress(result.customer?.address ?? result.employee?.address ?? profile.address);
      setAddressCheckOpen(false);
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    const addressChanged = normalizeAddress(profile.address) !== normalizeAddress(savedProfileAddress);
    if (addressChanged && profile.address.trim()) {
      if (profile.address.trim().length < 10) {
        notify("Vui lòng nhập địa chỉ đầy đủ hơn.", "error");
        return;
      }
      setAddressCheckOpen(true);
      return;
    }
    await persistProfile();
  };

  const mapsEmbedKey = process.env.REACT_APP_GOOGLE_MAPS_EMBED_KEY || "";
  const profileMapEmbedUrl = mapsEmbedKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(mapsEmbedKey)}&q=${encodeURIComponent(profile.address)}&language=vi&region=VN`
    : "";
  const profileMapSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}`;

  const cancelOrder = async (order) => {
    try {
      const result = await api.patch(`/orders/${order.id}/cancel`, {
        reason: cancelReason,
        expectedVersion: order.version,
      });
      setOrders((current) => current.map((item) => item.id === order.id ? result.data : item));
      setSelectedOrder(result.data);
      setCancelReason("");
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
      if (requestError.status === 409) await load({ silent: true });
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

  const savePreferences = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.put("/auth/preferences", preferences);
      updateLocalUser(result.user);
      setPreferences({ ...DEFAULT_PREFERENCES, ...(result.user.preferences || {}) });
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const uploadAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const result = await api.upload("/uploads/avatar", file);
      updateLocalUser({ avatar: result.data.url });
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const openReview = async (order, item) => {
    if (order.status !== "delivered") {
      notify("Bạn chỉ có thể đánh giá sau khi đơn hàng đã giao thành công.", "info");
      return;
    }
    if (item.reviewStatus === "reviewed") {
      notify("Bạn đã đánh giá sản phẩm này.", "info");
      return;
    }
    try {
      const result = await api.get(`/products/${item.productId}/review-eligibility`);
      if (!result.data?.eligible) {
        notify(result.data?.reviewed ? "Bạn đã đánh giá sản phẩm này." : "Sản phẩm chưa đủ điều kiện đánh giá.", "info");
        return;
      }
      closeOrder();
      setReviewTarget({ ...item, orderId: order.id, deliveredAt: order.updatedAt || order.createdAt });
      setReviewForm({ rating: 5, content: "", images: [] });
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  const uploadReviewImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file || reviewForm.images.length >= 3) return;
    setUploadingReviewImage(true);
    try {
      const result = await api.upload("/uploads/review", file);
      setReviewForm((current) => ({ ...current, images: [...current.images, result.data.url] }));
      notify(result.message);
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setUploadingReviewImage(false);
      event.target.value = "";
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!reviewTarget) return;
    setSubmittingReview(true);
    try {
      const result = await api.post(`/products/${reviewTarget.productId}/reviews`, reviewForm);
      const markReviewed = (order) => ({
        ...order,
        items: order.items.map((item) => (
          item.productId === reviewTarget.productId ? { ...item, reviewStatus: "reviewed" } : item
        )),
      });
      setOrders((current) => current.map(markReviewed));
      setSelectedOrder((current) => current ? markReviewed(current) : current);
      notify(result.message);
      closeReview();
    } catch (requestError) {
      notify(requestError.message, "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const activeOrders = orders.filter((order) => !["delivered", "cancelled"].includes(order.status));
  const orderTotalSpent = orders
    .filter((order) => order.status === "delivered" && ["paid", "partially_refunded"].includes(order.paymentStatus))
    .reduce((sum, order) => sum + Math.max(0, order.total - Number(order.refundedAmount || 0)), 0);
  const totalSpent = Number(membership?.totalSpent ?? orderTotalSpent);

  return (
    <div className="account-page section">
      <header className="account-header">
        <div className="account-header__identity">
          {integrations.uploads ? <label className="avatar avatar--large account-avatar-upload" title="Đổi ảnh đại diện">
            {user.avatar ? <SmartImage src={user.avatar} alt={user.name} /> : user.name?.charAt(0)}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={uploadAvatar} disabled={uploadingAvatar} />
            <span>{uploadingAvatar ? "…" : "＋"}</span>
          </label> : <span className="avatar avatar--large">{user.avatar ? <SmartImage src={user.avatar} alt={user.name} /> : user.name?.charAt(0)}</span>}
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
          <button className={tab === "overview" ? "is-active" : ""} onClick={() => changeTab("overview")} type="button"><span>01</span>Tổng quan</button>
          <button className={tab === "orders" ? "is-active" : ""} onClick={() => changeTab("orders")} type="button"><span>02</span>Đơn hàng <b>{orders.length}</b></button>
          <button className={tab === "profile" ? "is-active" : ""} onClick={() => changeTab("profile")} type="button"><span>03</span>Thông tin cá nhân</button>
          <button className={tab === "security" ? "is-active" : ""} onClick={() => changeTab("security")} type="button"><span>04</span>Bảo mật</button>
          <button className={tab === "settings" ? "is-active" : ""} onClick={() => changeTab("settings")} type="button"><span>05</span>Cài đặt</button>
          <p>Dịch vụ</p>
          <Link to="/doi-tra"><span>06</span>Đổi trả & hoàn tiền</Link>
          <Link to="/ho-tro"><span>07</span>Trợ giúp</Link>
        </aside>

        <div className="account-content">
          {loading && <div className="account-loading"><div className="skeleton skeleton--panel" /><div className="skeleton skeleton--panel" /></div>}
          {error && <ErrorState message={error} onRetry={load} />}

          {!loading && !error && tab === "overview" && (
            <>
              <div className="account-stats">
                <button type="button" onClick={() => changeTab("orders")}><span>Đơn đang xử lý</span><strong>{activeOrders.length}</strong><small>Theo dõi ngay →</small></button>
                <div><span>Tổng đơn hàng</span><strong>{orders.length}</strong><small>Từ khi tham gia</small></div>
                <div><span>Tổng chi tiêu</span><strong>{formatMoney(totalSpent)}</strong><small>Cảm ơn bạn!</small></div>
              </div>
              <section className="account-panel">
                <div className="panel-heading"><div><p className="eyebrow">Gần đây</p><h2>Đơn hàng mới nhất</h2></div><button type="button" onClick={() => changeTab("orders")}>Xem tất cả →</button></div>
                {orders.length ? (
                  <div className="compact-orders">
                    {orders.slice(0, 3).map((order) => (
                      <button type="button" className="compact-order" onClick={() => openOrder(order)} key={order.id}>
                        <div className="compact-order__images">
                          {order.items.slice(0, 2).map((item, index) => <SmartImage src={item.image} alt="" key={`${item.productId}-${index}`} />)}
                        </div>
                        <div><strong>{order.id}</strong><span>{formatDate(order.createdAt)} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm</span></div>
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
                <div className="member-banner__intro">
                  <p className="eyebrow">NOVA {membership?.tier?.toUpperCase() || "MEMBER"}</p>
                  <h2>{membership?.nextTier ? `Tiến gần hơn tới hạng ${membership.nextTier}.` : "Bạn đã đạt hạng thành viên cao nhất."}</h2>
                  <p>Hạng được tính tự động từ tổng giá trị các đơn đã giao và đã thanh toán.</p>
                  {membership?.benefits?.length > 0 && <ul>{membership.benefits.map((benefit) => <li key={benefit}>✓ {benefit}</li>)}</ul>}
                </div>
                <div className="member-banner__progress">
                  <strong>{membership?.progressPercent ?? 0}%</strong>
                  <span>{membership?.nextTier ? `Tiến độ lên hạng ${membership.nextTier}` : "Hạng cao nhất"}</span>
                  <i><b style={{ width: `${membership?.progressPercent ?? 0}%` }} /></i>
                  <small>{membership?.nextTier ? `Còn ${formatMoney(membership.amountToNextTier)} để nâng hạng` : `Tổng chi tiêu ${formatMoney(totalSpent)}`}</small>
                </div>
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
                        <button type="button" onClick={() => openOrder(order)}>Xem chi tiết →</button>
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
                  <label className="field field--wide"><span>Địa chỉ mặc định</span><textarea rows={3} value={profile.address} onChange={(event) => setProfile((current) => ({ ...current, address: event.target.value }))} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" /><small>Chỉ cần kiểm tra vị trí khi bạn thay đổi địa chỉ này.</small></label>
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
          {!loading && !error && tab === "settings" && (
            <section className="account-panel account-settings-panel">
              <div className="panel-heading"><div><p className="eyebrow">Cài đặt</p><h2>Trải nghiệm của bạn</h2></div></div>
              <form onSubmit={savePreferences}>
                <div className="account-setting-list">
                  <label className="account-setting-row">
                    <span><strong>Cập nhật đơn hàng qua email</strong><small>Nhận email khi đơn được xác nhận, giao cho vận chuyển hoặc hoàn tất.</small></span>
                    <input type="checkbox" checked={preferences.orderStatusEmails} onChange={(event) => setPreferences((current) => ({ ...current, orderStatusEmails: event.target.checked }))} />
                  </label>
                  <label className="account-setting-row">
                    <span><strong>Giảm hiệu ứng chuyển động</strong><small>Hiển thị nội dung ngay và hạn chế animation trên toàn bộ cửa hàng.</small></span>
                    <input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => setPreferences((current) => ({ ...current, reducedMotion: event.target.checked }))} />
                  </label>
                </div>
                <div className="account-connection-summary">
                  <span>Trạng thái tài khoản</span>
                  <strong>{user.verified ? "Email đã xác minh" : "Email chưa xác minh"}</strong>
                  <small>{user.linkedProviders?.length
                    ? `Đã liên kết: ${user.linkedProviders.map((provider) => provider === "google" ? "Google" : "Facebook").join(", ")}`
                    : "Đăng nhập bằng email và mật khẩu"}</small>
                </div>
                <button className="button button--dark" type="submit" disabled={saving}>{saving ? "Đang lưu..." : "Lưu cài đặt"}</button>
              </form>
            </section>
          )}
        </div>
      </div>

      <Modal open={Boolean(selectedOrder)} title={`Chi tiết ${selectedOrder?.id || ""}`} onClose={closeOrder} size="large">
        {selectedOrder && (
          <div className="order-detail-modal">
            <div className="order-detail-meta">
              <div><span>Trạng thái</span><StatusPill status={selectedOrder.status} /></div>
              <div><span>Mã tra cứu</span><strong>{selectedOrder.trackingCode}</strong></div>
              <div><span>Ngày đặt</span><strong>{formatDate(selectedOrder.createdAt)}</strong></div>
              <div><span>Thanh toán</span><strong className={`customer-payment customer-payment--${selectedOrder.paymentStatus}`}>{PAYMENT_STATUS[selectedOrder.paymentStatus]?.label || selectedOrder.paymentStatus}</strong></div>
            </div>
            {selectedOrder.paymentStatus === "refund_pending" && <div className="order-alert order-alert--refund"><strong>Khoản thanh toán đang được hoàn</strong><p>NOVAWEAR sẽ cập nhật mã đối soát ngay khi giao dịch hoàn tiền hoàn tất.</p></div>}
            {selectedOrder.status === "delivery_failed" && <div className="order-alert order-alert--danger"><strong>Lần giao gần nhất chưa thành công</strong><p>{selectedOrder.lastDeliveryFailure?.reason || "Đội ngũ vận hành đang liên hệ để sắp xếp giao lại."}</p></div>}
            <div className="order-timeline">
              {selectedOrder.timeline.map((entry, index) => (
                <div className="is-done" key={entry.id || `${entry.status}-${index}`}><i>✓</i><span><strong>{entry.label}</strong>{entry.note && <p>{entry.note}</p>}<small>{entry.actorName || "Hệ thống NOVAWEAR"} · {formatDate(entry.at, { hour: "2-digit", minute: "2-digit" })}</small></span></div>
              ))}
            </div>
            {selectedOrder.shipment?.trackingNumber && <div className="order-shipment"><div><span>Đơn vị vận chuyển</span><strong>{selectedOrder.shipment.carrier}</strong></div><div><span>Mã vận đơn</span><strong>{selectedOrder.shipment.trackingNumber}</strong></div><div><span>Số lần giao</span><strong>{selectedOrder.deliveryAttempts || 1}</strong></div>{selectedOrder.shipment.estimatedDeliveryAt && <div><span>Dự kiến giao</span><strong>{formatDate(selectedOrder.shipment.estimatedDeliveryAt, { hour: "2-digit", minute: "2-digit" })}</strong></div>}</div>}
            <div className="order-detail-items">
              {selectedOrder.items.map((item, index) => (
                <div className="order-detail-item" key={`${item.productId}-${index}`}>
                  <SmartImage src={item.image} alt={item.name} />
                  <span><strong>{item.name}</strong><small>{item.color} · Size {item.size} · SL {item.quantity}</small></span>
                  <div className="order-detail-item__actions">
                    <b>{formatMoney(item.price * item.quantity)}</b>
                    {selectedOrder.status === "delivered" && (
                      item.reviewStatus === "reviewed"
                        ? <span className="order-review-complete">✓ Đã đánh giá</span>
                        : <button className="order-review-button" type="button" onClick={() => openReview(selectedOrder, item)}>Đánh giá sản phẩm →</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="order-detail-breakdown">
              <div><span>Tạm tính</span><strong>{formatMoney(selectedOrder.subtotal)}</strong></div>
              <div><span>Phí giao hàng</span><strong>{selectedOrder.shippingFee ? formatMoney(selectedOrder.shippingFee) : "Miễn phí"}</strong></div>
              {selectedOrder.membershipDiscount > 0 && <div><span>Quyền lợi hạng {selectedOrder.membershipTier}</span><strong>−{formatMoney(selectedOrder.membershipDiscount)}</strong></div>}
              {selectedOrder.couponDiscount > 0 && <div><span>Mã ưu đãi {selectedOrder.couponCode}</span><strong>−{formatMoney(selectedOrder.couponDiscount)}</strong></div>}
              {!selectedOrder.membershipDiscount && !selectedOrder.couponDiscount && selectedOrder.discount > 0 && <div><span>Ưu đãi {selectedOrder.couponCode}</span><strong>−{formatMoney(selectedOrder.discount)}</strong></div>}
            </div>
            <div className="order-detail-total"><span>Tổng thanh toán</span><strong>{formatMoney(selectedOrder.total)}</strong></div>
            {["pending", "confirmed"].includes(selectedOrder.status) && (
              <div className="customer-cancel-order"><label className="field"><span>Lý do hủy đơn *</span><input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} minLength={5} placeholder="Ví dụ: Tôi muốn thay đổi sản phẩm trong đơn" /></label><button className="button button--danger" disabled={cancelReason.trim().length < 5} type="button" onClick={() => cancelOrder(selectedOrder)}>Xác nhận hủy đơn hàng</button><small>Đơn đã thanh toán sẽ chuyển sang quy trình hoàn tiền, không thay đổi thủ công.</small></div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={addressCheckOpen} title="Kiểm tra địa chỉ mặc định" onClose={() => !saving && setAddressCheckOpen(false)} size="medium">
        <div className="checkout-address-map">
          <div>
            <span>ĐỊA CHỈ MỚI</span>
            <strong>{profile.address}</strong>
            <p>Đối chiếu số nhà, tên đường và khu vực. Sau khi lưu, checkout sẽ tự chọn địa chỉ này cho những lần đặt tiếp theo.</p>
          </div>
          {profileMapEmbedUrl ? (
            <iframe title="Bản đồ kiểm tra địa chỉ mặc định" src={profileMapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          ) : (
            <div className="checkout-address-map__fallback">
              <span aria-hidden="true">⌖</span>
              <strong>Kiểm tra vị trí trên Google Maps</strong>
              <p>Mở Maps để đối chiếu nhanh vị trí trước khi lưu làm địa chỉ mặc định.</p>
              <a className="button button--outline" href={profileMapSearchUrl} target="_blank" rel="noreferrer">Mở Google Maps ↗</a>
            </div>
          )}
          <div className="checkout-address-map__actions">
            {profileMapEmbedUrl && <a href={profileMapSearchUrl} target="_blank" rel="noreferrer">Mở Google Maps ↗</a>}
            <button className="button button--dark" type="button" disabled={saving} onClick={() => persistProfile({
              confirmed: true,
              address: profile.address,
            })}>{saving ? "Đang lưu..." : "Xác nhận và lưu"}</button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(reviewTarget)} title="Đánh giá sản phẩm" onClose={closeReview} size="medium">
        {reviewTarget && (
          <form className="account-review-form" onSubmit={submitReview}>
            <header className="account-review-product">
              <SmartImage src={reviewTarget.image} alt={reviewTarget.name} />
              <div><p>Đơn hàng {reviewTarget.orderId}</p><h3>{reviewTarget.name}</h3><span>{reviewTarget.color} · Size {reviewTarget.size}</span></div>
            </header>
            <div className="account-review-verified"><span>✓</span><p><strong>Đã xác minh mua hàng</strong>Đơn hàng đã giao thành công. Đánh giá của bạn sẽ được gắn nhãn người mua đã xác minh.</p></div>
            <fieldset className="account-review-score">
              <legend>Chất lượng sản phẩm</legend>
              <div role="radiogroup" aria-label="Điểm đánh giá">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={reviewForm.rating === rating}
                    aria-label={`${rating} sao`}
                    className={reviewForm.rating >= rating ? "is-active" : ""}
                    onClick={() => setReviewForm((current) => ({ ...current, rating }))}
                    key={rating}
                  >
                    ★
                  </button>
                ))}
                <strong>{reviewForm.rating}/5</strong>
              </div>
            </fieldset>
            <label className="account-review-message">
              <span>Cảm nhận của bạn <small>{reviewForm.content.length}/500</small></span>
              <textarea required minLength={10} maxLength={500} rows={5} value={reviewForm.content} placeholder="Chia sẻ về phom dáng, chất liệu và cảm giác khi mặc…" onChange={(event) => setReviewForm((current) => ({ ...current, content: event.target.value }))} />
            </label>
            {integrations.uploads && (
              <label className="account-review-upload">
                <span>Ảnh thực tế <small>Tối đa 3 ảnh</small></span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={uploadReviewImage} disabled={uploadingReviewImage || reviewForm.images.length >= 3} />
                <i>{uploadingReviewImage ? "Đang tải ảnh…" : "+ Thêm ảnh sản phẩm thực tế"}</i>
              </label>
            )}
            {reviewForm.images.length > 0 && (
              <div className="account-review-images">
                {reviewForm.images.map((image) => (
                  <div key={image}><SmartImage src={image} alt="Ảnh đánh giá chờ gửi" /><button type="button" aria-label="Xóa ảnh" onClick={() => setReviewForm((current) => ({ ...current, images: current.images.filter((item) => item !== image) }))}>×</button></div>
                ))}
              </div>
            )}
            <button className="button button--dark account-review-submit" type="submit" disabled={submittingReview || reviewForm.content.trim().length < 10}>
              {submittingReview ? "Đang gửi đánh giá…" : "Gửi đánh giá"} <span>→</span>
            </button>
            <p className="account-review-note">Mỗi sản phẩm chỉ được đánh giá một lần. Nội dung sẽ hiển thị công khai tại trang sản phẩm.</p>
          </form>
        )}
      </Modal>
    </div>
  );
}
