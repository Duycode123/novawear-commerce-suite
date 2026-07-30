import React, { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { api } from "../services/api";
import { AdminProvider, useAdmin } from "./AdminContext";

jest.mock("../services/api", () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
  },
}));

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

function SessionProbe() {
  const { user, bootstrapping } = useAdmin();
  return <div>{user ? `${user.role}:${bootstrapping ? "loading" : "ready"}` : "anonymous"}</div>;
}

test("a new operations handoff cannot be erased by a stale tab session in StrictMode", async () => {
  window.history.replaceState(null, "", "/login#code=one-time-handoff");
  sessionStorage.setItem("nova_ops_token", "stale-token");
  sessionStorage.setItem("nova_ops_user", JSON.stringify({
    id: "usr-stale",
    role: "staff",
    status: "active",
  }));

  let completeExchange;
  api.post.mockImplementation((path) => {
    if (path === "/auth/operations-exchange") {
      return new Promise((resolve) => {
        completeExchange = resolve;
      });
    }
    return Promise.resolve({});
  });
  api.get.mockImplementation((path) => Promise.resolve(
    path === "/auth/me"
      ? { user: { id: "usr-staff", role: "staff", status: "active" } }
      : { data: [], unreadCount: 0 },
  ));

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <StrictMode>
        <AdminProvider>
          <SessionProbe />
        </AdminProvider>
      </StrictMode>,
    );
  });

  expect(api.post).toHaveBeenCalledTimes(1);
  expect(api.get).not.toHaveBeenCalled();
  expect(sessionStorage.getItem("nova_ops_token")).toBeNull();

  await act(async () => {
    completeExchange({
      token: "new-token",
      user: { id: "usr-staff", role: "staff", status: "active" },
    });
    await Promise.resolve();
    await Promise.resolve();
  });

  expect(container.textContent).toBe("staff:ready");
  expect(sessionStorage.getItem("nova_ops_token")).toBe("new-token");
  await act(async () => root.unmount());
  container.remove();
});
