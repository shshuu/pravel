import { TourApiError, searchFestivals } from "../lib/tourApi.js";
import { jsonResponse } from "../lib/http.js";

const BUSAN_DISTRICT_CODES = {
  gangseo: "440",
  gijang: "710",
  busanjin: "230",
  seo: "140",
  haeundae: "350"
};

function json(data, status = 200) {
  return jsonResponse(data, { status });
}

function nullableString(value) {
  return value === undefined || value === null || String(value).trim() === "" ? null : String(value);
}

function todayInKorea() {
  const date = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}${values.month}${values.day}`;
}

function normalizeFestival(item) {
  return {
    contentId: nullableString(item.contentid),
    title: nullableString(item.title),
    address: nullableString(item.addr1),
    address2: nullableString(item.addr2),
    startDate: nullableString(item.eventstartdate),
    endDate: nullableString(item.eventenddate),
    firstImage: nullableString(item.firstimage),
    mapX: nullableString(item.mapx),
    mapY: nullableString(item.mapy),
    tel: nullableString(item.tel)
  };
}

export async function handleTourFestivals(request, env, { fetchImpl = fetch } = {}) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const district = url.searchParams.get("district")?.trim();
  const lDongSignguCd = BUSAN_DISTRICT_CODES[district];
  if (!lDongSignguCd) {
    return json({ ok: false, error: "district is invalid" }, 400);
  }

  if (!env.TOUR_API_KR_KEY) {
    return json({ ok: false, error: "TOUR_API_KR_NOT_CONFIGURED" }, 500);
  }

  try {
    const items = await searchFestivals({
      serviceKey: env.TOUR_API_KR_KEY,
      eventStartDate: todayInKorea(),
      lDongRegnCd: "26",
      lDongSignguCd,
      fetchImpl
    });

    return json({ ok: true, district, items: items.map(normalizeFestival) });
  } catch (error) {
    console.error("[TourAPI] festival request failed", {
      name: error?.name,
      code: error instanceof TourApiError ? error.code : "UNEXPECTED_ERROR"
    });
    return json({ ok: false, error: "TOUR_API_FESTIVAL_REQUEST_FAILED" }, 502);
  }
}
