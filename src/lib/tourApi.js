const TOUR_API_SEARCH_URL = "https://apis.data.go.kr/B551011/KorService2/searchKeyword2";
const TOUR_API_NEARBY_URL = "https://apis.data.go.kr/B551011/KorService2/locationBasedList2";
const TOUR_API_BARRIER_URL = "https://apis.data.go.kr/B551011/KorWithService2/detailWithTour2";
const TOUR_API_FESTIVAL_URL = "https://apis.data.go.kr/B551011/KorService2/searchFestival2";

export class TourApiError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = "TourApiError";
    this.code = code;
    this.details = details;
  }
}

function decodingServiceKey(serviceKey) {
  // Store the public-data portal's Decoding key in the appropriate Worker
  // secret. This defensive branch prevents a pre-encoded key being encoded twice.
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

function createTourApiUrl(endpoint, serviceKey, parameters) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    serviceKey: decodingServiceKey(serviceKey),
    MobileOS: "ETC",
    MobileApp: "Pravel",
    _type: "json",
    ...parameters
  }).toString();

  return url;
}

async function requestTourApi({ url, serviceKey, fetchImpl }) {

  let response;
  try {
    response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  } catch (_) {
    throw new TourApiError("TOUR_API_NETWORK_ERROR");
  }

  let responseText;
  try {
    responseText = await response.text();
  } catch (_) {
    throw new TourApiError("TOUR_API_RESPONSE_READ_ERROR", { status: response.status });
  }

  if (!response.ok) {
    console.error("[TourAPI] upstream HTTP error", {
      status: response.status,
      statusText: response.statusText
    });
    throw new TourApiError("TOUR_API_HTTP_ERROR", { status: response.status });
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (_) {
    throw new TourApiError("TOUR_API_INVALID_JSON");
  }

  const header = payload?.response?.header;
  if (!header || header.resultCode !== "0000") {
    console.error("[TourAPI] upstream response error", {
      resultCode: header?.resultCode ?? null,
      resultMsg: header?.resultMsg ?? null
    });
    throw new TourApiError("TOUR_API_RESPONSE_ERROR", {
      resultCode: header?.resultCode ?? null,
      resultMsg: header?.resultMsg ?? null
    });
  }

  return asArray(payload?.response?.body?.items?.item);
}

export async function searchKeyword({ serviceKey, keyword, fetchImpl = fetch }) {
  const url = createTourApiUrl(TOUR_API_SEARCH_URL, serviceKey, {
    keyword,
    numOfRows: "20",
    pageNo: "1",
    arrange: "A"
  });

  return requestTourApi({ url, serviceKey, fetchImpl });
}

export async function searchNearby({ serviceKey, mapX, mapY, radius, fetchImpl = fetch }) {
  const url = createTourApiUrl(TOUR_API_NEARBY_URL, serviceKey, {
    mapX: String(mapX),
    mapY: String(mapY),
    radius: String(radius),
    numOfRows: "50",
    pageNo: "1"
  });

  return requestTourApi({ url, serviceKey, fetchImpl });
}

export async function fetchBarrierFreeInfo({ serviceKey, contentId, fetchImpl = fetch }) {
  const url = createTourApiUrl(TOUR_API_BARRIER_URL, serviceKey, { contentId });

  return requestTourApi({ url, serviceKey, fetchImpl });
}

export async function searchFestivals({
  serviceKey,
  eventStartDate,
  lDongRegnCd,
  lDongSignguCd,
  fetchImpl = fetch
}) {
  const parameters = {
    eventStartDate,
    lDongRegnCd,
    numOfRows: "20",
    pageNo: "1",
    arrange: "A"
  };

  if (lDongSignguCd) parameters.lDongSignguCd = lDongSignguCd;

  const url = createTourApiUrl(TOUR_API_FESTIVAL_URL, serviceKey, parameters);
  return requestTourApi({ url, serviceKey, fetchImpl });
}
