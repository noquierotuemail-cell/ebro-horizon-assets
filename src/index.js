export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isHttps = url.protocol === "https:" || forwardedProto === "https";

    if (!isHttps) {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 308);
    }

    if (url.pathname === "/api/chatkit/config") {
      return chatkitConfig(request, env);
    }

    if (url.pathname === "/chatkit") {
      return proxyChatKit(request, env, url);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get("content-type") || "";
    const response = contentType.includes("text/html")
      ? injectChatKit(assetResponse)
      : new Response(assetResponse.body, assetResponse);

    applySecurityHeaders(response.headers);
    return response;
  }
};

const VISITOR_COOKIE = "habro_chat_visitor";

function applySecurityHeaders(headers) {
  headers.set("Strict-Transport-Security", "max-age=31536000");
  headers.set("Content-Security-Policy", "upgrade-insecure-requests");
  headers.set("X-Content-Type-Options", "nosniff");
}

function injectChatKit(response) {
  const rewritten = new HTMLRewriter()
    .on("head", {
      element(element) {
        element.append('<link rel="stylesheet" href="/css/chatkit.css">', { html: true });
      }
    })
    .on("body", {
      element(element) {
        element.append('<script src="/js/chatkit-launcher.js" defer></script>', { html: true });
      }
    })
    .transform(response);

  return new Response(rewritten.body, rewritten);
}

function visitorFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`));
  const existing = match ? decodeURIComponent(match[1]) : "";
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing);
  return valid ? { id: existing, isNew: false } : { id: crypto.randomUUID(), isNew: true };
}

function visitorCookie(id) {
  return `${VISITOR_COOKIE}=${encodeURIComponent(id)}; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax`;
}

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  applySecurityHeaders(headers);
  return new Response(JSON.stringify(payload), { status, headers });
}

function chatkitConfig(request, env) {
  const visitor = visitorFromRequest(request);
  const enabled = Boolean(env.CHATKIT_BACKEND_URL && env.CHATKIT_DOMAIN_KEY);
  const headers = visitor.isNew ? { "Set-Cookie": visitorCookie(visitor.id) } : {};

  return jsonResponse({
    enabled,
    apiUrl: "/chatkit",
    domainKey: enabled ? env.CHATKIT_DOMAIN_KEY : "",
    assistantName: "HABRO Assistant"
  }, 200, headers);
}

async function proxyChatKit(request, env, incomingUrl) {
  if (!env.CHATKIT_BACKEND_URL) {
    return jsonResponse({
      error: "chatkit_not_configured",
      message: "HABRO Assistant todavía no tiene un backend configurado."
    }, 503);
  }

  const visitor = visitorFromRequest(request);
  const target = new URL(env.CHATKIT_BACKEND_URL);
  target.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  ["host", "cookie", "cf-connecting-ip", "cf-ray", "cf-worker", "x-forwarded-proto"].forEach(name => headers.delete(name));
  headers.set("X-HABRO-Visitor-ID", visitor.id);
  const localeHeader = request.headers.get("x-habro-locale") || "es";
  headers.set("X-HABRO-Locale", localeHeader.toLowerCase().startsWith("pt") ? "pt" : "es");

  const init = {
    method: request.method,
    headers,
    redirect: "manual"
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const upstream = await fetch(new Request(target.toString(), init));
    const response = new Response(upstream.body, upstream);
    response.headers.delete("set-cookie");
    response.headers.set("Cache-Control", "no-store");
    if (visitor.isNew) response.headers.set("Set-Cookie", visitorCookie(visitor.id));
    applySecurityHeaders(response.headers);
    return response;
  } catch (error) {
    return jsonResponse({
      error: "chatkit_backend_unavailable",
      message: "El asistente no está disponible temporalmente."
    }, 502, visitor.isNew ? { "Set-Cookie": visitorCookie(visitor.id) } : {});
  }
}
