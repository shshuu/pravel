import { searchKeyword, TourApiError } from "../lib/tourApi.js";
import { jsonResponse } from "../lib/http.js";

const MAX_KEYWORD_LENGTH = 100;

function json(body, status = 200, headers = {}) {
  return jsonResponse(body, { status, headers });
}

function nullableString(value) {
  return value === undefined || value === null || value === "" ? null : String(value);
}

function toPravelTourItem(item) {
  return {
    contentId: nullableString(item.contentid),
    contentTypeId: nullableString(item.contenttypeid),
    title: nullableString(item.title),
    address: nullableString(item.addr1),
    address2: nullableString(item.addr2),
    areaCode: nullableString(item.areacode),
    sigunguCode: nullableString(item.sigungucode),
    mapX: nullableString(item.mapx),
    mapY: nullableString(item.mapy),
    firstImage: nullableString(item.firstimage)
  };
}

export async function handleTourSearch(request, env, { fetchImpl = fetch } = {}) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "method not allowed" }, 405, { Allow: "GET" });
  }

  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword")?.trim() ?? "";
  if (!keyword) return json({ ok: false, error: "keyword is required" }, 400);
  if (keyword.length > MAX_KEYWORD_LENGTH) {
    return json({ ok: false, error: "keyword is too long" }, 400);
  }

  if (!env.TOUR_API_KR_KEY) {
    console.error(JSON.stringify({ event: "tour_api_search_failed", code: "TOUR_API_NOT_CONFIGURED" }));
    return json({ ok: false, error: "TOUR_API_NOT_CONFIGURED" }, 500);
  }

  try {
    const rawItems = await searchKeyword({
      serviceKey: env.TOUR_API_KR_KEY,
      keyword,
      fetchImpl
    });
    return json({ ok: true, keyword, items: rawItems.map(toPravelTourItem) });
  } catch (error) {
    const details = error instanceof TourApiError ? error.details : {};
    console.error(JSON.stringify({
      event: "tour_api_search_failed",
      code: error instanceof TourApiError ? error.code : "TOUR_API_UNKNOWN_ERROR",
      resultCode: details.resultCode ?? null,
      resultMsg: details.resultMsg ?? null
    }));
    return json({ ok: false, error: "TOUR_API_REQUEST_FAILED" }, 502);
  }
}
