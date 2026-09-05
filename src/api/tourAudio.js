import { TourApiError } from "../lib/tourApi.js";
import { fetchOdiiStories, searchOdiiThemes } from "../lib/odiiApi.js";
import { jsonResponse } from "../lib/http.js";

function json(data, status = 200) {
  return jsonResponse(data, { status });
}

function nullableString(value) {
  return value === undefined || value === null || String(value).trim() === "" ? null : String(value);
}

function comparableName(value) {
  return String(value ?? "").toLocaleLowerCase("ko-KR").replace(/[^0-9a-z\uac00-\ud7a3]/gi, "");
}

function normalizeStory(item) {
  return {
    storyId: nullableString(item.stid),
    title: nullableString(item.title),
    audioTitle: nullableString(item.audioTitle),
    script: nullableString(item.script),
    playTime: nullableString(item.playTime),
    audioUrl: nullableString(item.audioUrl),
    imageUrl: nullableString(item.imageUrl)
  };
}

export async function handleTourAudio(request, env, { fetchImpl = fetch } = {}) {
  if (request.method !== "GET") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }

  const keyword = new URL(request.url).searchParams.get("keyword")?.trim();
  if (!keyword) return json({ ok: false, error: "keyword is required" }, 400);
  if (keyword.length > 80) return json({ ok: false, error: "keyword is too long" }, 400);

  const serviceKey = env.TOUR_API_ODII_KEY || env.TOUR_API_KR_KEY;
  if (!serviceKey) {
    return json({ ok: false, error: "TOUR_API_ODII_NOT_CONFIGURED" }, 500);
  }

  try {
    const themes = await searchOdiiThemes({ serviceKey, keyword, fetchImpl });
    const target = comparableName(keyword);
    const theme = themes.find((item) => comparableName(item.title) === target);
    if (!theme?.tid || !theme?.tlid) {
      return json({ ok: true, keyword, theme: null, items: [] });
    }

    const stories = await fetchOdiiStories({
      serviceKey,
      tid: String(theme.tid),
      tlid: String(theme.tlid),
      fetchImpl
    });

    return json({
      ok: true,
      keyword,
      theme: {
        id: String(theme.tid),
        languageId: String(theme.tlid),
        title: nullableString(theme.title)
      },
      items: stories.map(normalizeStory)
    });
  } catch (error) {
    console.error("[OdiiAPI] request failed", {
      name: error?.name,
      code: error instanceof TourApiError ? error.code : "UNEXPECTED_ERROR"
    });
    return json({ ok: false, error: "ODII_API_REQUEST_FAILED" }, 502);
  }
}
