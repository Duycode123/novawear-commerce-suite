const defaultBase = window.location.hostname === "localhost"
  ? "http://localhost:5000/api"
  : "/api";

const API_BASE = (process.env.REACT_APP_API_URL || defaultBase).replace(/\/$/, "");

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
      headers: {
        Accept: "application/json",
        ...(options.body && !isFormData ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (_error) {
    throw new ApiError("Không thể kết nối. Vui lòng thử lại sau.", 0);
  }

  const payload = await response.json().catch(() => ({ message: "Phản hồi không hợp lệ." }));
  if (!response.ok) {
    if (response.status === 401 && token) {
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
