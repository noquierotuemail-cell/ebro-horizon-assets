import app from './index.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Binary/static assets must be served directly by Cloudflare Static Assets.
    // This deliberately bypasses the legacy image proxy in src/index.js,
    // which was causing valid images to arrive as broken resources.
    if (url.pathname.startsWith('/assets/')) {
      const assetResponse = await env.ASSETS.fetch(request);
      const headers = new Headers(assetResponse.headers);
      headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
      headers.delete('content-disposition');
      return new Response(assetResponse.body, {
        status: assetResponse.status,
        statusText: assetResponse.statusText,
        headers
      });
    }

    return app.fetch(request, env, ctx);
  }
};
