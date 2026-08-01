import React from "react";
import { render, waitFor } from "@testing-library/react";
import OrderSuccessPage from "./OrderSuccessPage";
import { api } from "../services/api";

jest.mock("react-router-dom", () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  Navigate: () => null,
  useLocation: () => ({ state: null }),
}));

jest.mock("../services/api", () => ({
  api: { get: jest.fn() },
}));

describe("OrderSuccessPage SePay handoff", () => {
  afterEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  test("recovers the order after a refresh and renders the SePay QR", async () => {
    const order = {
      id: "ORD-2026-999",
      trackingCode: "NVA26ABC123",
      total: 319000,
      paymentMethod: "bank",
      paymentStatus: "awaiting",
      paymentCode: "NVA26ABC123",
      paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    sessionStorage.setItem("novawear_checkout_order", JSON.stringify(order));
    api.get.mockImplementation((path) => {
      if (path.includes("/checkout?")) {
        return Promise.resolve({
          data: {
            qrUrl: "https://qr.sepay.vn/img?acc=123456&bank=MB&amount=319000&des=NVA26ABC123",
            bankCode: "MB",
            accountNumber: "123456",
            accountName: "NOVAWEAR",
          },
        });
      }
      return Promise.resolve({ data: { paymentStatus: "awaiting" } });
    });

    const view = render(<OrderSuccessPage />);

    await waitFor(() => expect(view.getByAltText(`Mã QR thanh toán cho đơn ${order.id}`)).toBeInTheDocument());
    expect(view.getByText(/Thanh toán đơn hàng/i)).toBeInTheDocument();
    expect(view.queryByText("Hoàn tất thanh toán.")).not.toBeInTheDocument();
    expect(view.getByText(/Trạng thái chỉ chuyển sang “Đã thanh toán”/i)).toBeInTheDocument();
    expect(view.getByText("123456")).toBeInTheDocument();
    expect(view.getAllByText("NVA26ABC123").length).toBeGreaterThan(0);
    expect(api.get).toHaveBeenCalledWith(
      expect.stringContaining(`/payments/sepay/orders/${order.id}/checkout`),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
