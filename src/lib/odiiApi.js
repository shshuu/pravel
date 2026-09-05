import { TourApiError } from "./tourApi.js";

const ODII_BASE_URL = "https://apis.data.go.kr/B551011/Odii";

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

async function requestOdii(endpoint, serviceKey, parameters, fetchImpl) {
  const url = new URL(`${ODII_BASE_URL}/${endpoint}`);
  url.search = new URLSearchParams({
    serviceKey: decodingServiceKey(serviceKey),
    MobileOS: "ETC",
    MobileApp: "Pravel",
    _type: "json",
    ...parameters
  }).toString();

  let response;
  try {
    response = await fetchImpl(url, { headers: { Accept: "application/json" } });
  } catch (_) {
    throw new TourApiError("ODII_API_NETWORK_ERROR");
  }

  const responseText = await response.text();
  if (!response.ok) {
    console.error("[OdiiAPI] upstream HTTP error", {
      status: response.status,
      statusText: response.statusText
    });
    throw new TourApiError("ODII_API_HTTP_ERROR", { status: response.status });
  }

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (_) {
    throw new TourApiError("ODII_API_INVALID_JSON");
  }

  const header = payload?.response?.header;
  if (!header || !["0000", "00"].includes(header.resultCode)) {
    console.error("[OdiiAPI] upstream response error", {
      resultCode: header?.resultCode ?? null,
      resultMsg: header?.resultMsg ?? null
    });
    throw new TourApiError("ODII_API_RESPONSE_ERROR", {
      resultCode: header?.resultCode ?? null,
      resultMsg: header?.resultMsg ?? null
    });
  }

  return asArray(payload?.response?.body?.items?.item);
}

export async function searchOdiiThemes({ serviceKey, keyword, fetchImpl = fetch }) {
  return requestOdii("themeSearchList", serviceKey, {
    keyword,
    langCode: "ko",
    numOfRows: "20",
    pageNo: "1"
  }, fetchImpl);
}

export async function fetchOdiiStories({ serviceKey, tid, tlid, fetchImpl = fetch }) {
  return requestOdii("storyBasedList", serviceKey, {
    tid,
    tlid,
    langCode: "ko",
    numOfRows: "20",
    pageNo: "1"
  }, fetchImpl);
}
