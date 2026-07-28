import { currentUser, fail, loadState } from "./core";
import { handleOpsApi } from "./ops-api";
import { handlePublicApi } from "./public-api";
import type { Env, WorkerContext } from "./types";

function secureResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function htmlResponse(response: Response, requestUrl: URL): Promise<Response> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html") || requestUrl.pathname.startsWith("/ops")) {
    return secureResponse(response);
  }
  const absoluteOg = `${requestUrl.origin}/og.png`;
  let html = await response.text();
  html = html
    .replaceAll('content="/og.png"', `content="${absoluteOg}"`)
    .replace(
      '<meta property="og:type" content="website"/>',
      `<meta property="og:type" content="website"/><meta property="og:url" content="${requestUrl.origin}${requestUrl.pathname}"/><link rel="canonical" href="${requestUrl.origin}${requestUrl.pathname}"/>`,
    )
    .replace(
      '<meta property="og:type" content="website" />',
      `<meta property="og:type" content="website" /><meta property="og:url" content="${requestUrl.origin}${requestUrl.pathname}" /><link rel="canonical" href="${requestUrl.origin}${requestUrl.pathname}" />`,
    );
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "no-cache");
  return secureResponse(new Response(html, { status: response.status, headers }));
}

async function serveSite(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const asset = await env.ASSETS.fetch(request);
  if (asset.status !== 404) return htmlResponse(asset, url);

  const lastSegment = url.pathname.split("/").pop() || "";
  if (lastSegment.includes(".")) return secureResponse(asset);

  const entryPath = url.pathname === "/ops" || url.pathname.startsWith("/ops/")
    ? "/ops/index.html"
    : "/index.html";
  const entryRequest = new Request(new URL(entryPath, request.url), {
    method: "GET",
    headers: request.headers,
  });
  const entry = await env.ASSETS.fetch(entryRequest);
  return htmlResponse(entry, url);
}

const worker = {
  async fetch(request: Request, env: Env, _context: WorkerContext): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return serveSite(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": url.origin,
          "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "access-control-allow-headers": "content-type,authorization",
        },
      });
    }

    try {
      const state = await loadState(env);
      const user = await currentUser(request, state);
      const response = await handleOpsApi(request, url, state, user, env)
        || await handlePublicApi(request, url, state, user, env);
      return response || fail(404, "Đường dẫn API không tồn tại.");
    } catch (error) {
      console.error("NOVAWEAR worker error", error);
      return fail(500, "Hệ thống đang bận. Vui lòng thử lại.");
    }
  },
};

export default worker;

