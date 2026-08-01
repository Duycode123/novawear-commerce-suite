import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import CheckoutPage from "./CheckoutPage";
import { useShop } from "../context/ShopContext";
import { api } from "../services/api";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
  Link: () => null,
  Navigate: () => null,
  useNavigate: () => mockNavigate,
}));

jest.mock("../context/ShopContext", () => ({
  useShop: jest.fn(),
}));

jest.mock("../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const cart = [{
  key: "product-1-M-Den",
  productId: "product-1",
  name: "Áo thun Airy Cotton",
  image: "/product.jpg",
  price: 289000,
  quantity: 1,
  size: "M",
  color: "Đen",
}];

const renderCheckout = (user, options = {}) => {
  const notify = jest.fn();
  const clearCart = jest.fn();
  useShop.mockReturnValue({
    cart,
    cartSubtotal: 289000,
    user,
    clearCart,
    notify,
    integrations: { sepay: Boolean(options.sepay) },
  });

  return {
    notify,
    clearCart,
    ...render(<CheckoutPage />),
  };
};

describe("CheckoutPage recipient information", () => {
  afterEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  test("prefills recipient fields from the authenticated customer profile", async () => {
    const user = {
      id: "user-1",
      name: "Nguyễn Duy",
      email: "duy@example.com",
      phone: "0934457124",
    };
    api.get.mockResolvedValue({
      user,
      customer: {
        phone: "0934457124",
        address: "12 Trần Duy Hưng, Cầu Giấy, Hà Nội",
      },
    });

    const { container, getByText } = renderCheckout(user);

    await waitFor(() => {
      expect(container.querySelector('input[name="address"]')).toHaveValue("12 Trần Duy Hưng, Cầu Giấy, Hà Nội");
    });
    expect(container.querySelector('input[name="name"]')).toHaveValue("Nguyễn Duy");
    expect(container.querySelector('input[name="phone"]')).toHaveValue("0934457124");
    expect(container.querySelector('input[name="email"]')).toHaveValue("duy@example.com");
    expect(container.querySelector('input[name="email"]')).toHaveAttribute("readonly");
    expect(getByText("Thông tin từ hồ sơ của bạn.")).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith("/auth/me");
  });

  test("keeps recipient fields empty for a guest", () => {
    const { container, getByText } = renderCheckout(null);

    expect(container.querySelector('input[name="name"]')).toHaveValue("");
    expect(container.querySelector('input[name="phone"]')).toHaveValue("");
    expect(container.querySelector('input[name="email"]')).toHaveValue("");
    expect(container.querySelector('input[name="address"]')).toHaveValue("");
    expect(getByText("Khách vãng lai vui lòng nhập thông tin để chúng tôi giao và xác nhận đơn hàng.")).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  test("does not overwrite a delivery address edited while the profile is loading", async () => {
    let resolveProfile;
    api.get.mockReturnValue(new Promise((resolve) => {
      resolveProfile = resolve;
    }));
    const user = {
      id: "user-1",
      name: "Nguyễn Duy",
      email: "duy@example.com",
      phone: "0934457124",
    };
    const { container, getByText } = renderCheckout(user);
    const addressInput = container.querySelector('input[name="address"]');

    fireEvent.change(addressInput, { target: { name: "address", value: "Địa chỉ dùng riêng cho đơn này" } });
    resolveProfile({
      user,
      customer: { address: "Địa chỉ mặc định trong hồ sơ" },
    });

    await waitFor(() => {
      expect(getByText("Thông tin từ hồ sơ của bạn.")).toBeInTheDocument();
    });
    expect(addressInput).toHaveValue("Địa chỉ dùng riêng cho đơn này");
  });

  test("requires map review and sends the confirmed address with an authenticated order", async () => {
    const user = {
      id: "user-1",
      name: "Nguyễn Duy",
      email: "duy@example.com",
      phone: "0934457124",
    };
    const address = "01 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh";
    api.get.mockResolvedValue({
      user,
      customer: { phone: user.phone, address },
      membership: { tier: "Silver", discountPercent: 2, freeShippingThreshold: 499000 },
    });
    api.post.mockResolvedValue({ message: "Đã tạo đơn.", data: { id: "ORD-TEST" } });
    const view = renderCheckout(user);

    await waitFor(() => expect(view.container.querySelector('input[name="address"]')).toHaveValue(address));
    fireEvent.click(view.getByRole("button", { name: "Kiểm tra trên bản đồ" }));
    fireEvent.click(view.getByRole("button", { name: "Đúng địa chỉ này" }));
    expect(view.getByRole("button", { name: "✓ Đã xác nhận trên bản đồ" })).toBeInTheDocument();

    const submitButton = view.container.querySelector('button[type="submit"]');
    fireEvent.submit(view.container.querySelector("form"));
    await waitFor(() => expect(submitButton).not.toBeDisabled());
    expect(api.post).toHaveBeenCalledWith("/orders", expect.objectContaining({
      addressConfirmation: { address, confirmed: true },
    }));
  });

  test("opens the SePay handoff before clearing the cart", async () => {
    const user = {
      id: "user-1",
      name: "Nguyễn Duy",
      email: "duy@example.com",
      phone: "0934457124",
    };
    const address = "01 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh";
    const order = {
      id: "ORD-2026-999",
      trackingCode: "NVA26ABC123",
      total: 319000,
      paymentMethod: "bank",
      paymentStatus: "awaiting",
      paymentCode: "NVA26ABC123",
      paymentExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    };
    api.get.mockResolvedValue({ user, customer: { address, phone: user.phone } });
    api.post.mockResolvedValue({ message: "Đã tạo đơn.", data: order });
    const view = renderCheckout(user, { sepay: true });

    await waitFor(() => expect(view.container.querySelector('input[name="address"]')).toHaveValue(address));
    fireEvent.click(view.getByRole("button", { name: "Kiểm tra trên bản đồ" }));
    fireEvent.click(view.getByRole("button", { name: "Đúng địa chỉ này" }));
    fireEvent.click(view.getByRole("radio", { name: /Chuyển khoản qua SePay/i }));
    fireEvent.submit(view.container.querySelector("form"));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(
      "/dat-hang-thanh-cong",
      { replace: true, state: { order } },
    ));
    expect(view.clearCart).toHaveBeenCalledTimes(1);
    expect(mockNavigate.mock.invocationCallOrder[0]).toBeLessThan(view.clearCart.mock.invocationCallOrder[0]);
    expect(JSON.parse(sessionStorage.getItem("novawear_checkout_order"))).toEqual(order);
  });
});
