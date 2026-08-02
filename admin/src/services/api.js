const defaultBase = window.location.hostname === "localhost"
  ? "http://localhost:5000/api"
  : "/api";

const configuredBase = String(process.env.REACT_APP_API_URL || "").trim();
const API_BASE = (configuredBase || defaultBase).replace(/\/$/, "");
let refreshPromise = null;

function apiConnectionMessage() {
  if (process.env.NODE_ENV === "production" && API_BASE === "/api") {
    return "API chưa được nối với bản giao diện online. Hãy cấu hình REACT_APP_API_URL trỏ tới địa chỉ Render rồi build lại giao diện.";
  }
  return "Không thể kết nối máy chủ. Vui lòng thử lại sau.";
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function request(path, options = {}) {
  const token = sessionStorage.getItem("nova_ops_token");
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (_error) {
    throw new ApiError(apiConnectionMessage(), 0);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    await response.text();
    throw new ApiError(
      response.ok ? apiConnectionMessage() : "Máy chủ API trả về phản hồi không hợp lệ.",
      response.status || 502,
    );
  }
  const payload = await response.json().catch(() => ({ message: "Phản hồi không hợp lệ." }));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/refresh" && !options.__retried) {
      refreshPromise = refreshPromise || fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { Accept: "application/json" },
        credentials: "include",
      }).then(async (refreshResponse) => {
        if (!refreshResponse.ok) throw new Error("refresh_failed");
        const session = await refreshResponse.json();
        if (!session.token || !["admin", "staff"].includes(session.user?.role)) {
          throw new Error("refresh_failed");
        }
        sessionStorage.setItem("nova_ops_token", session.token);
        sessionStorage.setItem("nova_ops_user", JSON.stringify(session.user));
        return session;
      }).finally(() => { refreshPromise = null; });
      try {
        await refreshPromise;
        return request(path, { ...options, __retried: true });
      } catch (_error) {
        // Fall through to session cleanup.
      }
    }
    if (response.status === 401 && (token || options.__retried)) {
      sessionStorage.removeItem("nova_ops_token");
      sessionStorage.removeItem("nova_ops_user");
      window.dispatchEvent(new Event("nova:ops-session-expired"));
    }
    throw new ApiError(payload.message || "Yêu cầu chưa thể hoàn tất.", response.status);
  }
  return payload;
}

export const api = {
  get: (path) => request(path, { method: "GET" }),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) => request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
  upload: (path, file) => {
    const body = new FormData();
    body.append("file", file);
    return request(path, { method: "POST", body });
  },
};
