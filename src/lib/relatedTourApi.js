import { TourApiError } from "./tourApi.js";

const RELATED_TOUR_API_URL = "https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1";

function decodingServiceKey(serviceKey) {
  try {
    return /%[0-9a-f]{2}/i.test(serviceKey) ? decodeURIComponent(serviceKey) : serviceKey;
  } catch (_) {
    return serviceKey;
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  return value && typeof value === "object" ? [value] : [];
}

/** The live API wraps both header and body in a `response` object. */
export async function fetchRelatedTours({ serviceKey, baseYm, areaCd, signguCd, fetchImpl = fetch }) {
  const url = new URL(RELATED_TOUR_API_URL);
  url.search = new URLSearchParams({
    serviceKey: decodingServiceKey(serviceKey),
    MobileOS: "ETC",
    MobileApp: "Pravel",
    _type: "json",
    numOfRows: "50",
    pageNo: "1",
    baseYm,
    areaCd,
    signguCd
  }).toString();

  let response;
  try {
    response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  } catch (_) {
    throw new TourApiError("RELATED_TOUR_API_NETWORK_ERROR");
  }

  const responseText = await response.text();
  if (!response.ok) {
    console.error("[RelatedTourAPI] upstream HTTP error", {
      status: response.status,
      statusText: response.statusText
    });
    throw new TourApiError("RELATED_TOUR_API_HTTP_ERROR", { status: response.status });
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (_) {
    throw new TourApiError("RELATED_TOUR_API_INVALID_JSON");
  }

  const header = payload?.response?.header;
  if (!header || !["0000", "00"].includes(header.resultCode)) {
    console.error("[RelatedTourAPI] upstream response error", {
      resultCode: header?.resultCode ?? null,
      resultMsg: header?.resultMsg ?? null
    });
    throw new TourApiError("RELATED_TOUR_API_RESPONSE_ERROR", {
      resultCode: header?.resultCode ?? null,
      resultMsg: header?.resultMsg ?? null
    });
  }

  return asArray(payload?.response?.body?.items?.item);
}
