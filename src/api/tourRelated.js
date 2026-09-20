import { TourApiError } from "../lib/tourApi.js";
import { fetchRelatedTours } from "../lib/relatedTourApi.js";
import { jsonResponse } from "../lib/http.js";

const RELATED_TOUR_DISTRICTS = {
  gangseo: { areaCd: "26", signguCd: "26440" },
  gijang: { areaCd: "26", signguCd: "26710" },
  busanjin: { areaCd: "26", signguCd: "26230" },
  seo: { areaCd: "26", signguCd: "26140" },
  haeundae: { areaCd: "26", signguCd: "26350" }
};

// Check the current Korean calendar month first. Bound the lookup so an empty
// district cannot cause unbounded requests to the upstream service.
function recentMonths(now) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit"
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return Array.from({ length: 12 }, (_, offset) => {
    const date = new Date(Date.UTC(Number(values.year), Number(values.month) - 1 - offset, 1));
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

function json(data, status = 200) {
  return jsonResponse(data, { status });
}

function nullableString(value) {
  return value === undefined || value === null || String(value).trim() === "" ? null : String(value);
}

function normalizeRelatedTour(item) {
  return {
    sourceName: nullableString(item.tAtsNm),
    rank: nullableString(item.rlteRank),
    name: nullableString(item.rlteTatsNm),
    category: nullableString(item.rlteCtgryMclsNm),
    subcategory: nullableString(item.rlteCtgrySclsNm),
    areaName: nullableString(item.rlteRegnNm),
    sigunguName: nullableString(item.rlteSignguNm)
  };
}

export async function handleTourRelated(request, env, { fetchImpl = fetch, now = new Date() } = {}) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  const district = new URL(request.url).searchParams.get("district")?.trim();
  const parameters = Object.hasOwn(RELATED_TOUR_DISTRICTS, district) ? RELATED_TOUR_DISTRICTS[district] : null;
  if (!parameters) {
    return json({ ok: false, error: "district is invalid" }, 400);
  }

  const serviceKey = env.TOUR_API_RELATED_KEY || env.TOUR_API_KR_KEY;
  if (!serviceKey) {
    return json({ ok: false, error: "TOUR_API_RELATED_NOT_CONFIGURED" }, 500);
  }

  try {
    const months = recentMonths(now);
    for (const baseYm of months) {
      const items = await fetchRelatedTours({ serviceKey, baseYm, ...parameters, fetchImpl });
      if (items.length === 0) continue;
      return json({
        ok: true, district, baseYm,
        items: items.map(normalizeRelatedTour).filter((item) => item.name)
      });
    }
    return json({ ok: true, district, baseYm: null, searchedMonths: months, items: [] });
  } catch (error) {
    console.error("[RelatedTourAPI] request failed", {
      name: error?.name,
      code: error instanceof TourApiError ? error.code : "UNEXPECTED_ERROR"
    });
    return json({ ok: false, error: "RELATED_TOUR_API_REQUEST_FAILED" }, 502);
  }
}
