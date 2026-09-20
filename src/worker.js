import { handleTourSearch } from "./api/tourSearch.js";
import { handleTourNearby } from "./api/tourNearby.js";
import { handleTourBarrierFree } from "./api/tourBarrierFree.js";
import { handleTourFestivals } from "./api/tourFestivals.js";
import { handleTourRelated } from "./api/tourRelated.js";
import { handleTourAudio } from "./api/tourAudio.js";
import { jsonResponse } from "./lib/http.js";

/** API entry point; Tourism API secrets are read only from `env`. */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return jsonResponse({
        ok: true,
        service: "pravel",
        environment: "cloudflare"
      });
    }

    if (url.pathname === "/api/tour/search") {
      return handleTourSearch(request, env);
    }

    if (url.pathname === "/api/tour/nearby") {
      return handleTourNearby(request, env);
    }

    if (url.pathname === "/api/tour/barrier-free") {
      return handleTourBarrierFree(request, env);
    }

    if (url.pathname === "/api/tour/festivals") {
      return handleTourFestivals(request, env);
    }

    if (url.pathname === "/api/tour/related") {
      return handleTourRelated(request, env);
    }

    if (url.pathname === "/api/tour/audio") {
      return handleTourAudio(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  }
};
