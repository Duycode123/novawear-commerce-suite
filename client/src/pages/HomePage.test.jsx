import React from "react";
import { act, render, waitFor } from "@testing-library/react";
import HomePage from "./HomePage";
import { api } from "../services/api";
import { useShop } from "../context/ShopContext";

jest.mock("react-router-dom", () => ({
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));

jest.mock("../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock("../context/ShopContext", () => ({
  useShop: jest.fn(),
}));

const saleProduct = {
  id: "sale-25",
  slug: "ao-khoac-sale-25",
  name: "Áo khoác giảm thật",
  image: "/sale-product.jpg",
  price: 600000,
  comparePrice: 800000,
  saleEndsAt: "2026-12-31T16:59:59.000Z",
  stock: 8,
  colors: ["Đen"],
  category: { name: "Áo khoác nam" },
};

const activePromotion = {
  code: "SAVE15",
  type: "percent",
  value: 15,
  minOrder: 500000,
  maxDiscount: 120000,
  startsAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2026-12-31T16:59:59.000Z",
};

function mockHomeApi({ sale = [saleProduct], promotions = [activePromotion] } = {}) {
  api.get.mockImplementation((path) => {
    if (path === "/products?sale=true&sort=discount-desc&limit=4") {
      return Promise.resolve({ data: sale });
    }
    if (path === "/promotions") return Promise.resolve({ data: promotions });
    return Promise.resolve({ data: [] });
  });
}

describe("HomePage promotion banners", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useShop.mockReturnValue({
      addToCart: jest.fn(),
      toggleWishlist: jest.fn(),
      wishlist: [],
      notify: jest.fn(),
    });
  });

  test("renders exact active sale and coupon data returned by the API", async () => {
    mockHomeApi();
    let view;
    await act(async () => {
      view = render(<HomePage />);
    });

    await waitFor(() => expect(view.getByRole("region", { name: "Ưu đãi nổi bật" })).toBeInTheDocument());
    await waitFor(() => expect(view.queryAllByLabelText("Đang tải sản phẩm")).toHaveLength(0));

    expect(api.get).toHaveBeenCalledWith("/products?sale=true&sort=discount-desc&limit=4");
    expect(api.get).toHaveBeenCalledWith("/promotions");
    expect(view.getByRole("heading", { name: "Giảm 25%" })).toBeInTheDocument();
    expect(view.getByText("Áo khoác giảm thật · 800.000 ₫ → 600.000 ₫")).toBeInTheDocument();
    expect(view.container.querySelector(".home-v4-offer-banner--sale")).toHaveAttribute(
      "href",
      "/san-pham/ao-khoac-sale-25"
    );
    expect(view.getByRole("heading", { name: "SAVE15" })).toBeInTheDocument();
    expect(view.getByText("Giảm 15%, tối đa 120.000 ₫ cho đơn từ 500.000 ₫.")).toBeInTheDocument();
  });

  test("does not invent banners when there is no active promotion data", async () => {
    mockHomeApi({ sale: [], promotions: [] });
    let view;
    await act(async () => {
      view = render(<HomePage />);
    });

    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(7));
    await waitFor(() => expect(view.queryAllByLabelText("Đang tải sản phẩm")).toHaveLength(0));
    expect(view.queryByRole("region", { name: "Ưu đãi nổi bật" })).not.toBeInTheDocument();
    expect(view.queryByText(/Ưu đãi đang chờ bạn/i)).not.toBeInTheDocument();
  });
});
