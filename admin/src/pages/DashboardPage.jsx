import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { formatDate, formatMoney, resolveAsset } from "../config";
import { ErrorPanel, Loading, PageHeader, ProductImage, Status } from "../components/Ui";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get("/admin/overview");
      setData(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxRevenue = useMemo(() => Math.max(...(data?.revenueByDay || []).map((item) => item.value), 1), [data]);

  return (
    <div>
      <PageHeader
        eyebrow="Tổng quan vận hành"
        title="Bảng điều khiển"
        copy="Nắm nhanh doanh thu, đơn hàng và việc cần xử lý hôm nay."
        actions={<><Link className="ops-secondary-button" to="/workspace">Bắt đầu ca làm</Link><Link className="ops-primary-button" to="/orders">Xử lý đơn hàng →</Link></>}
      />
      {loading && <Loading rows={5} />}
      {error && <ErrorPanel message={error} onRetry={load} />}
      {!loading && !error && data && (
        <>
          <section className="ops-stat-grid">
            <article className="ops-stat-card ops-stat-card--dark">
              <div><span>Doanh thu lũy kế</span><i>↗</i></div>
              <strong>{formatMoney(data.revenue)}</strong>
              <p><b>+12.4%</b> so với kỳ trước</p>
            </article>
            <article className="ops-stat-card">
              <div><span>Doanh thu hôm nay</span><i>₫</i></div>
              <strong>{formatMoney(data.todayRevenue)}</strong>
              <p><b>{data.pendingCount}</b> đơn đang chờ xác nhận</p>
            </article>
            <article className="ops-stat-card ops-stat-card--blue">
              <div><span>Tổng đơn hàng</span><i>▢</i></div>
              <strong>{data.orderCount}</strong>
              <p><b>{data.statusCounts.shipping || 0}</b> đơn đang giao</p>
            </article>
            <article className="ops-stat-card ops-stat-card--lime">
              <div><span>Khách hàng</span><i>○</i></div>
              <strong>{data.customerCount}</strong>
              <p><b>{data.lowStockCount}</b> sản phẩm sắp hết</p>
            </article>
          </section>

          <section className="ops-dashboard-grid">
            <article className="ops-panel ops-revenue-panel">
              <header><div><p>7 ngày gần nhất</p><h2>Nhịp doanh thu</h2></div><span>Tổng <strong>{formatMoney(data.revenueByDay.reduce((sum, item) => sum + item.value, 0))}</strong></span></header>
              <div className="ops-chart">
                {data.revenueByDay.map((item) => (
                  <div className="ops-chart__column" key={item.date}>
                    <span>{item.value ? formatMoney(item.value).replace(/\s/g, "") : "0₫"}</span>
                    <i><b style={{ height: `${Math.max(5, item.value / maxRevenue * 100)}%` }} /></i>
                    <small>{item.label}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="ops-panel ops-order-mix">
              <header><div><p>Trạng thái đơn</p><h2>Phân bổ xử lý</h2></div><Link to="/orders">Chi tiết →</Link></header>
              <div className="ops-donut-wrap">
                <div className="ops-donut" style={{ "--shipping": `${Math.round((data.statusCounts.shipping || 0) / Math.max(1, data.orderCount) * 100)}%` }}><span><strong>{data.orderCount}</strong>đơn hàng</span></div>
                <div className="ops-donut-legend">
                  {[
                    ["pending", "Chờ xác nhận"],
                    ["confirmed", "Đã xác nhận"],
                    ["packing", "Đóng gói"],
                    ["shipping", "Đang giao"],
                    ["delivered", "Đã giao"],
                  ].map(([status, label]) => <div key={status}><i className={`dot dot--${status}`} /><span>{label}</span><strong>{data.statusCounts[status] || 0}</strong></div>)}
                </div>
              </div>
            </article>
          </section>

          <section className="ops-dashboard-grid ops-dashboard-grid--lower">
            <article className="ops-panel ops-recent-orders">
              <header><div><p>Luồng bán hàng</p><h2>Đơn mới nhất</h2></div><Link to="/orders">Xem tất cả →</Link></header>
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Thời gian</th><th>Trạng thái</th><th>Tổng tiền</th><th /></tr></thead>
                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td><strong>{order.id}</strong></td>
                        <td><div className="ops-customer-cell"><span>{order.customer.name.charAt(0)}</span><div><strong>{order.customer.name}</strong><small>{order.customer.phone}</small></div></div></td>
                        <td>{formatDate(order.createdAt, true)}</td>
                        <td><Status value={order.status} /></td>
                        <td><strong>{formatMoney(order.total)}</strong></td>
                        <td><Link to={`/orders?open=${order.id}`}>→</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="ops-panel ops-low-stock">
              <header><div><p>Cảnh báo kho</p><h2>Sắp hết hàng</h2></div><Link to="/inventory">Mở kho →</Link></header>
              <div>
                {data.lowStock.length ? data.lowStock.map((product) => (
                  <div className="ops-stock-item" key={product.id}>
                    <ProductImage src={product.image} alt={product.name} />
                    <span><strong>{product.name}</strong><small>{product.sku}</small></span>
                    <b>{product.stock}</b>
                  </div>
                )) : <p className="ops-muted">Tồn kho đang ở mức an toàn.</p>}
              </div>
            </article>
          </section>

          <section className="ops-top-products">
            <div className="ops-section-title"><div><p>Sản phẩm nổi bật</p><h2>Top bán chạy</h2></div><Link to="/products">Quản lý sản phẩm →</Link></div>
            <div className="ops-top-product-grid">
              {data.topProducts.map((product, index) => (
                <article key={product.id}>
                  <span>0{index + 1}</span>
                  <img src={resolveAsset(product.image)} alt={product.name} />
                  <div><strong>{product.name}</strong><small>{product.sold} đã bán · Tồn {product.stock}</small></div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
