export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const isHttps = url.protocol === "https:" || forwardedProto === "https";

    if (!isHttps) {
      url.protocol = "https:";
      return Response.redirect(url.toString(), 308);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const response = new Response(assetResponse.body, assetResponse);

    response.headers.set("Strict-Transport-Security", "max-age=31536000");
    response.headers.set("Content-Security-Policy", "upgrade-insecure-requests");

    return response;
  }
};
