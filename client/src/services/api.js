const defaultBase = window.location.hostname === "localhost"
  ? "http://localhost:5000/api"
  : "/api";

export const API_BASE = (process.env.REACT_APP_API_URL || defaultBase).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, options = {}) {
  const token = sessionStorage.getItem("novawear_token");
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: options.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Không thể kết nối máy chủ. Hãy kiểm tra backend đang chạy.", 0);
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    if (response.status === 401 && token) {
      sessionStorage.removeItem("novawear_token");
      sessionStorage.removeItem("novawear_user");
      window.dispatchEvent(new Event("novawear:session-expired"));
    }
    throw new ApiError(payload.message || "Yêu cầu chưa thể hoàn tất.", response.status, payload);
  }
  return payload;
}

export const api = {
  get: (path, options) => apiRequest(path, { ...options, method: "GET" }),
  post: (path, body, options) => apiRequest(path, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: (path, body, options) => apiRequest(path, { ...options, method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: "PATCH", body: JSON.stringify(body) }),
  delete: (path, options) => apiRequest(path, { ...options, method: "DELETE" }),
};
