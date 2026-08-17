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

    if (url.pathname === "/api/locale") {
      return localeConfig(request);
    }

    if (url.pathname === "/chatkit") {
      return proxyChatKit(request, env, url);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get("content-type") || "";
    const response = contentType.includes("text/html")
      ? injectSite(assetResponse, request)
      : new Response(assetResponse.body, assetResponse);

    if (contentType.includes("text/html")) {
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set("Vary", "CF-IPCountry");
    }

    applySecurityHeaders(response.headers);
    return response;
  }
};

const VISITOR_COOKIE = "habro_chat_visitor";
const CHATKIT_BACKEND_URL = "https://ebro-horizon-assets.onrender.com/chatkit";
const CHATKIT_DOMAIN_KEY = "domain_pk_6a8168a3f250819492ae3c9a4df255c400ee8b3e878e05df";
const FAVICON_VERSION = "webhabro-20260816";
const SCREENSHOT_VERSION = "habro-ui-20260817-rebuilt-1845";
const SCREENSHOT_PATHS = new Set([
  "/assets/inicio-alert.webp",
  "/assets/energia.webp",
  "/assets/clima.webp",
  "/assets/mantenimiento.webp",
  "/assets/solar.webp",
  "/assets/vehiculo.webp"
]);

function countryFromRequest(request) {
  return String((request.cf && request.cf.country) || request.headers.get("CF-IPCountry") || "").toUpperCase();
}

function localeFromRequest(request) {
  const country = countryFromRequest(request);
  return {
    country,
    language: country === "PT" ? "pt" : "es"
  };
}

function applySecurityHeaders(headers) {
  headers.set("Strict-Transport-Security", "max-age=31536000");
  headers.set("Content-Security-Policy", "upgrade-insecure-requests");
  headers.set("X-Content-Type-Options", "nosniff");
}

function injectSite(response, request) {
  const geo = localeFromRequest(request);
  const country = JSON.stringify(geo.country);
  const language = JSON.stringify(geo.language);
  const geoBootstrap = `<script>(()=>{const country=${country};const language=${language};window.__HABRO_GEO__={country,language};try{const params=new URLSearchParams(location.search);const explicit=params.get('lang');if(explicit==='es'||explicit==='pt'){localStorage.setItem('habro-language-choice','manual');localStorage.setItem('habro-language',explicit);}else if(localStorage.getItem('habro-language-choice')!=='manual'){localStorage.setItem('habro-language',language);}}catch(e){}document.addEventListener('click',e=>{const t=e.target&&e.target.closest?e.target.closest('.language-toggle'):null;if(t){try{localStorage.setItem('habro-language-choice','manual');}catch(err){}}},true);})();</script>`;
  const faviconMarkup = `<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=${FAVICON_VERSION}"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=${FAVICON_VERSION}"><link rel="manifest" href="/site.webmanifest?v=${FAVICON_VERSION}">`;

  const rewritten = new HTMLRewriter()
    .on('link[rel="icon"]', {
      element(element) {
        element.setAttribute("href", `/favicon.ico?v=${FAVICON_VERSION}`);
        element.setAttribute("type", "image/x-icon");
      }
    })
    .on("figure.phone.one img", {
      element(element) {
        element.setAttribute("src", `/assets/inicio-alert.webp?v=${SCREENSHOT_VERSION}`);
        element.setAttribute("width", "360");
        element.setAttribute("height", "598");
        element.setAttribute("alt", "Pantalla de inicio de HABRO RemoteApp");
        element.removeAttribute("srcset");
      }
    })
    .on("figure.phone.two img", {
      element(element) {
        element.setAttribute("src", `/assets/energia.webp?v=${SCREENSHOT_VERSION}`);
        element.setAttribute("width", "360");
        element.setAttribute("height", "588");
        element.setAttribute("alt", "Pantalla de energía de HABRO RemoteApp");
        element.removeAttribute("srcset");
      }
    })
    .on("figure.phone.three img", {
      element(element) {
        element.setAttribute("src", `/assets/clima.webp?v=${SCREENSHOT_VERSION}`);
        element.setAttribute("width", "360");
        element.setAttribute("height", "659");
        element.setAttribute("alt", "Pantalla de climatización de HABRO RemoteApp");
        element.removeAttribute("srcset");
      }
    })
    .on("img", {
      element(element) {
        const src = element.getAttribute("src") || "";
        const base = src.split("?")[0];
        const normalized = base.startsWith("/") ? base : `/${base}`;
        if (SCREENSHOT_PATHS.has(normalized)) {
          element.setAttribute("src", `${normalized}?v=${SCREENSHOT_VERSION}`);
          element.removeAttribute("srcset");
        }
      }
    })
    .on("head", {
      element(element) {
        element.append(geoBootstrap, { html: true });
        element.append(faviconMarkup, { html: true });
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

function localeConfig(request) {
  const geo = localeFromRequest(request);
  return jsonResponse({
    country: geo.country || null,
    language: geo.language,
    locale: geo.language === "pt" ? "pt-PT" : "es-ES"
  });
}

function chatkitConfig(request, env) {
  const visitor = visitorFromRequest(request);
  const enabled = Boolean(env.CHATKIT_BACKEND_TOKEN);
  const headers = visitor.isNew ? { "Set-Cookie": visitorCookie(visitor.id) } : {};

  return jsonResponse({
    enabled,
    apiUrl: "/chatkit",
    domainKey: enabled ? CHATKIT_DOMAIN_KEY : "",
    assistantName: "HABRO Assistant"
  }, 200, headers);
}

async function proxyChatKit(request, env, incomingUrl) {
  if (!env.CHATKIT_BACKEND_TOKEN) {
    return jsonResponse({
      error: "chatkit_not_configured",
      message: "HABRO Assistant todavía no tiene un backend configurado."
    }, 503);
  }

  const visitor = visitorFromRequest(request);
  const target = new URL(CHATKIT_BACKEND_URL);
  target.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  [
    "host",
    "cookie",
    "cf-connecting-ip",
    "cf-ray",
    "cf-worker",
    "x-forwarded-proto",
    "x-habro-backend-token"
  ].forEach(name => headers.delete(name));
  headers.set("X-HABRO-Visitor-ID", visitor.id);
  headers.set("X-HABRO-Backend-Token", env.CHATKIT_BACKEND_TOKEN);
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
