/**
 * API entry point. Future Tourism Organization API routes belong in src/api/;
 * secrets such as TOUR_API_KEY must be read only from `env` in those routes.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        ok: true,
        service: "pravel",
        environment: "cloudflare"
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};
