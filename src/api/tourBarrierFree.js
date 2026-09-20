import { TourApiError, fetchBarrierFreeInfo } from "../lib/tourApi.js";
import { jsonResponse } from "../lib/http.js";

const ACCESSIBILITY_FIELDS = {
  physical: [
    "parking",
    "publictransport",
    "route",
    "ticketoffice",
    "promotion",
    "wheelchair",
    "exit",
    "elevator",
    "restroom",
    "auditorium",
    "room",
    "handicapetc"
  ],
  visual: [
    "braileblock",
    "helpdog",
    "guidehuman",
    "audioguide",
    "bigprint",
    "brailepromotion",
    "guidesystem",
    "blindhandicapetc"
  ],
  hearing: [
    "signguide",
    "videoguide",
    "hearingroom",
    "hearinghandicapetc"
  ],
  infantFamily: [
    "stroller",
    "lactationroom",
    "babysparechair",
    "infantsfamilyetc"
  ]
};

function json(data, status = 200) {
  return jsonResponse(data, { status });
}

function normalizeAccessibility(item) {
  const accessibility = {};

  for (const [category, fields] of Object.entries(ACCESSIBILITY_FIELDS)) {
    const values = {};

    for (const field of fields) {
      const value = item[field];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        values[field] = String(value);
      }
    }

    if (Object.keys(values).length > 0) {
      accessibility[category] = values;
    }
  }

  return Object.keys(accessibility).length > 0 ? accessibility : null;
}

function isValidContentId(contentId) {
  return /^\d{1,20}$/.test(contentId);
}

export async function handleTourBarrierFree(request, env, { fetchImpl = fetch } = {}) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const contentId = url.searchParams.get("contentId")?.trim();

  if (!contentId) {
    return json({ ok: false, error: "contentId is required" }, 400);
  }

  if (!isValidContentId(contentId)) {
    return json({ ok: false, error: "contentId is invalid" }, 400);
  }

  if (!env.TOUR_API_BARRIER_KEY) {
    return json({ ok: false, error: "TOUR_API_BARRIER_NOT_CONFIGURED" }, 500);
  }

  try {
    const [item] = await fetchBarrierFreeInfo({
      serviceKey: env.TOUR_API_BARRIER_KEY,
      contentId,
      fetchImpl
    });

    return json({
      ok: true,
      contentId,
      accessibility: item ? normalizeAccessibility(item) : null
    });
  } catch (error) {
    console.error("[TourAPI] barrier-free request failed", {
      name: error?.name,
      code: error instanceof TourApiError ? error.code : "UNEXPECTED_ERROR",
      message: error?.message
    });

    return json({ ok: false, error: "TOUR_API_BARRIER_REQUEST_FAILED" }, 502);
  }
}
