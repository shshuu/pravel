import { TourApiError, searchNearby } from "../lib/tourApi.js";
import { jsonResponse } from "../lib/http.js";

const MAX_RADIUS_METERS = 20_000;

function json(data, status = 200) {
  return jsonResponse(data, { status });
}

function nullableString(value) {
  return value === undefined || value === null || value === "" ? null : String(value);
}

function invalidParameter(parameter, message) {
  return json({ ok: false, error: `${parameter} ${message}` }, 400);
}

function readNumber(url, parameter, minimum, maximum) {
  const rawValue = url.searchParams.get(parameter);

  if (rawValue === null || rawValue.trim() === "") {
    return { error: invalidParameter(parameter, "is required") };
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    return { error: invalidParameter(parameter, "is invalid") };
  }

  return { value };
}

function readRadius(url) {
  const rawValue = url.searchParams.get("radius");

  if (rawValue === null || rawValue.trim() === "") {
    return { error: invalidParameter("radius", "is required") };
  }

  const radius = Number(rawValue);
  if (!Number.isInteger(radius) || radius < 1 || radius > MAX_RADIUS_METERS) {
    return {
      error: invalidParameter("radius", `must be an integer from 1 to ${MAX_RADIUS_METERS}`)
    };
  }

  return { value: radius };
}

function toPravelItem(item) {
  return {
    contentId: nullableString(item.contentid),
    contentTypeId: nullableString(item.contenttypeid),
    title: nullableString(item.title),
    address: nullableString(item.addr1),
    address2: nullableString(item.addr2),
    mapX: nullableString(item.mapx),
    mapY: nullableString(item.mapy),
    dist: nullableString(item.dist),
    firstImage: nullableString(item.firstimage)
  };
}

export async function handleTourNearby(request, env, { fetchImpl = fetch } = {}) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const mapX = readNumber(url, "mapX", -180, 180);
  if (mapX.error) return mapX.error;

  const mapY = readNumber(url, "mapY", -90, 90);
  if (mapY.error) return mapY.error;

  const radius = readRadius(url);
  if (radius.error) return radius.error;

  if (!env.TOUR_API_KR_KEY) {
    return json({ ok: false, error: "TOUR_API_NOT_CONFIGURED" }, 500);
  }

  try {
    const items = await searchNearby({
      serviceKey: env.TOUR_API_KR_KEY,
      mapX: mapX.value,
      mapY: mapY.value,
      radius: radius.value,
      fetchImpl
    });

    return json({ ok: true, items: items.map(toPravelItem) });
  } catch (error) {
    console.error("[TourAPI] nearby request failed", {
      name: error?.name,
      code: error instanceof TourApiError ? error.code : "UNEXPECTED_ERROR",
      message: error?.message
    });

    return json({ ok: false, error: "TOUR_API_REQUEST_FAILED" }, 502);
  }
}
