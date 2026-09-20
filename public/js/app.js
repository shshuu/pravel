(async function () {
  "use strict";

  const districtLabels = {
    home: "홈",
    gangseo: "강서구",
    gijang: "기장군",
    busanjin: "부산진구",
    seo: "서구",
    haeundae: "해운대구"
  };
  const ACCESSIBILITY_LABELS = {
    parking: "장애인 주차",
    route: "접근로",
    wheelchair: "휠체어 이용",
    exit: "출입구",
    elevator: "엘리베이터",
    restroom: "장애인 화장실",
    handicapetc: "기타 이동 편의",
    audioguide: "음성 안내",
    brailepromotion: "점자 안내",
    braileblock: "점자블록",
    stroller: "유모차",
    lactationroom: "수유실"
  };
  const ACCESSIBILITY_CATEGORY_LABELS = {
    physical: "이동·시설",
    visual: "시각 편의",
    infantFamily: "영유아 동반 편의"
  };
  const accessibilityCategoryOrder = ["physical", "visual", "infantFamily"];
  const menu = document.getElementById("district-menu");
  const homeView = document.getElementById("home-view");
  const tourView = document.getElementById("tour-view");
  const pageStatus = document.getElementById("page-status");
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menu-toggle");
  const drawerBackdrop = document.getElementById("drawer-backdrop");
  let tours = [];
  let playerControllers = [];
  let renderVersion = 0;
  const barrierFreeCache = new Map();
  const festivalCache = new Map();
  const relatedTourCache = new Map();
  const audioGuideCache = new Map();

  function selectedDistrictFromUrl() {
    const district = new URLSearchParams(window.location.search).get("district") || "home";
    return Object.hasOwn(districtLabels, district) ? district : "home";
  }

  function setPageStatus(message, isError = false) {
    if (!pageStatus) return;

    pageStatus.textContent = message;
    pageStatus.classList.toggle("is-error", isError);
    pageStatus.hidden = !message;
  }

  function closeDrawer() {
    sidebar.classList.remove("is-open");
    drawerBackdrop.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
  }

  function updateMenu(district) {
    menu.querySelectorAll("button[data-district]").forEach((button) => {
      const active = button.dataset.district === district;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function removePlayers() {
    playerControllers.forEach((controller) => controller.destroy());
    playerControllers = [];
  }

  function addBarrierFreeSource(card) {
    const source = document.createElement("p");
    source.className = "barrier-free-source";
    source.textContent = "한국관광공사 무장애 여행정보 제공";
    card.appendChild(source);
  }

  function addInfoSource(card, text) {
    const source = document.createElement("p");
    source.className = "tour-info-source";
    source.textContent = text;
    card.appendChild(source);
  }

  function setInfoMessage(card, headingText, message, state, sourceText) {
    card.replaceChildren();
    card.dataset.state = state;

    const heading = document.createElement("h2");
    heading.className = "tour-info-heading";
    heading.textContent = headingText;
    const status = document.createElement("p");
    status.className = "tour-info-message";
    status.textContent = message;
    card.append(heading, status);
    addInfoSource(card, sourceText);
  }

  async function getJsonFromApi(url, cache, cacheKey) {
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const request = fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Tour API request failed");
        const data = await response.json();
        if (!data?.ok) throw new Error("Tour API response failed");
        return data;
      });
    cache.set(cacheKey, request);

    try {
      return await request;
    } catch (error) {
      cache.delete(cacheKey);
      throw error;
    }
  }

  function setBarrierFreeMessage(card, message, state) {
    card.replaceChildren();
    card.dataset.state = state;

    const heading = document.createElement("h2");
    heading.className = "barrier-free-heading";
    heading.textContent = "무장애 관광 정보";
    card.appendChild(heading);

    const status = document.createElement("p");
    status.className = "barrier-free-message";
    status.textContent = message;
    card.appendChild(status);
    addBarrierFreeSource(card);
  }

  function appendBarrierFreeDetails(card, accessibility) {
    card.replaceChildren();
    card.dataset.state = "ready";

    const heading = document.createElement("h2");
    heading.className = "barrier-free-heading";
    heading.textContent = "무장애 관광 정보";
    card.appendChild(heading);

    let visibleFieldCount = 0;
    for (const category of accessibilityCategoryOrder) {
      const fields = accessibility?.[category];
      if (!fields || typeof fields !== "object") continue;

      const entries = Object.entries(fields).filter(([field, value]) => (
        Object.hasOwn(ACCESSIBILITY_LABELS, field) && typeof value === "string" && value.trim()
      ));
      if (entries.length === 0) continue;

      const section = document.createElement("section");
      section.className = "barrier-free-category";
      const categoryHeading = document.createElement("h3");
      categoryHeading.textContent = ACCESSIBILITY_CATEGORY_LABELS[category];
      section.appendChild(categoryHeading);

      const list = document.createElement("dl");
      list.className = "barrier-free-list";
      for (const [field, value] of entries) {
        const label = document.createElement("dt");
        label.textContent = ACCESSIBILITY_LABELS[field];
        const description = document.createElement("dd");
        description.textContent = value;
        list.append(label, description);
        visibleFieldCount += 1;
      }
      section.appendChild(list);
      card.appendChild(section);
    }

    if (visibleFieldCount === 0) {
      const message = document.createElement("p");
      message.className = "barrier-free-message";
      message.textContent = "한국관광공사에서 제공하는 무장애 관광정보가 없습니다.";
      card.appendChild(message);
    }
    addBarrierFreeSource(card);
  }

  async function getBarrierFreeInfo(contentId) {
    if (barrierFreeCache.has(contentId)) return barrierFreeCache.get(contentId);

    const request = fetch(`/api/tour/barrier-free?contentId=${encodeURIComponent(contentId)}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Barrier-free API request failed");
        const data = await response.json();
        if (!data?.ok) throw new Error("Barrier-free API response failed");
        return data;
      });
    barrierFreeCache.set(contentId, request);

    try {
      return await request;
    } catch (error) {
      barrierFreeCache.delete(contentId);
      throw error;
    }
  }

  async function getFestivals(district) {
    return getJsonFromApi(`/api/tour/festivals?district=${encodeURIComponent(district)}`, festivalCache, district);
  }

  async function getRelatedTours(district) {
    return getJsonFromApi(`/api/tour/related?district=${encodeURIComponent(district)}`, relatedTourCache, district);
  }

  async function getAudioGuide(keyword) {
    return getJsonFromApi(`/api/tour/audio?keyword=${encodeURIComponent(keyword)}`, audioGuideCache, keyword);
  }

  async function renderBarrierFreeCard(tour, mountId, version) {
    const card = document.getElementById(mountId);
    if (!card) return;

    const contentId = tour.tourApi?.contentId;
    if (!contentId) {
      setBarrierFreeMessage(card, "한국관광공사에서 제공하는 무장애 관광정보가 없습니다.", "empty");
      return;
    }

    setBarrierFreeMessage(card, "무장애 관광정보를 불러오는 중...", "loading");
    try {
      const data = await getBarrierFreeInfo(contentId);
      if (version !== renderVersion || !card.isConnected) return;
      appendBarrierFreeDetails(card, data.accessibility);
    } catch (_) {
      if (version !== renderVersion || !card.isConnected) return;
      setBarrierFreeMessage(card, "무장애 관광정보를 불러오지 못했습니다.", "error");
    }
  }

  function appendFestivalDetails(card, items) {
    card.replaceChildren();
    card.dataset.state = "ready";
    const heading = document.createElement("h2");
    heading.className = "tour-info-heading";
    heading.textContent = "부산 축제·행사";
    card.appendChild(heading);

    if (!Array.isArray(items) || items.length === 0) {
      const message = document.createElement("p");
      message.className = "tour-info-message";
      message.textContent = "현재 확인되는 축제·행사 정보가 없습니다.";
      card.appendChild(message);
    } else {
      const list = document.createElement("ul");
      list.className = "tour-info-list";
      for (const festival of items.slice(0, 6)) {
        const item = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = festival.title || "제목 정보 없음";
        const details = [festival.startDate, festival.endDate].filter(Boolean).join(" ~ ");
        const meta = document.createElement("span");
        meta.textContent = [details, festival.address].filter(Boolean).join(" · ");
        item.append(title, meta);
        list.appendChild(item);
      }
      card.appendChild(list);
    }
    addInfoSource(card, "한국관광공사 관광정보 제공");
  }

  async function renderFestivalCard(district, mountId, version) {
    const card = document.getElementById(mountId);
    if (!card) return;
    setInfoMessage(card, "부산 축제·행사", "축제·행사 정보를 불러오는 중...", "loading", "한국관광공사 관광정보 제공");
    try {
      const data = await getFestivals(district);
      if (version !== renderVersion || !card.isConnected) return;
      appendFestivalDetails(card, data.items);
    } catch (_) {
      if (version !== renderVersion || !card.isConnected) return;
      setInfoMessage(card, "부산 축제·행사", "축제·행사 정보를 불러오지 못했습니다.", "error", "한국관광공사 관광정보 제공");
    }
  }

  function appendRelatedTourDetails(card, items, baseYm) {
    card.replaceChildren();
    card.dataset.state = "ready";
    const heading = document.createElement("h2");
    heading.className = "tour-info-heading";
    heading.textContent = "함께 둘러보기 좋은 장소";
    card.appendChild(heading);

    if (!Array.isArray(items) || items.length === 0) {
      const message = document.createElement("p");
      message.className = "tour-info-message";
      message.textContent = "한국관광공사에서 제공하는 연관 관광지 정보가 없습니다.";
      card.appendChild(message);
    } else {
      const list = document.createElement("ul");
      list.className = "tour-info-list";
      for (const related of items.slice(0, 6)) {
        const item = document.createElement("li");
        const name = document.createElement("strong");
        name.textContent = related.name;
        const meta = document.createElement("span");
        meta.textContent = [related.sourceName ? `${related.sourceName} 연관 장소` : null, related.category, related.areaName, related.sigunguName].filter(Boolean).join(" · ");
        item.append(name, meta);
        list.appendChild(item);
      }
      card.appendChild(list);
    }
    const period = /^\d{6}$/.test(baseYm ?? "") ? `${baseYm.slice(0, 4)}년 ${Number(baseYm.slice(4))}월` : null;
    addInfoSource(card, period
      ? `한국관광공사 관광지별 연관 관광지 정보 제공 · 최신 조회 가능 자료: ${period} (월별 집계)`
      : "한국관광공사 관광지별 연관 관광지 정보 제공 · 최근 12개월 조회 결과 없음");
  }

  async function renderRelatedTourCard(district, mountId, version) {
    const card = document.getElementById(mountId);
    if (!card) return;
    setInfoMessage(card, "함께 둘러보기 좋은 장소", "연관 관광지 정보를 불러오는 중...", "loading", "한국관광공사 관광지별 연관 관광지 정보 제공");
    try {
      const data = await getRelatedTours(district);
      if (version !== renderVersion || !card.isConnected) return;
      appendRelatedTourDetails(card, data.items, data.baseYm);
    } catch (_) {
      if (version !== renderVersion || !card.isConnected) return;
      setInfoMessage(card, "함께 둘러보기 좋은 장소", "연관 관광지 정보를 불러오지 못했습니다.", "error", "한국관광공사 관광지별 연관 관광지 정보 제공");
    }
  }

  function appendAudioGuideDetails(card, items) {
    card.replaceChildren();
    card.dataset.state = "ready";
    const heading = document.createElement("h2");
    heading.className = "tour-info-heading";
    heading.textContent = "관광지 오디오 가이드";
    card.appendChild(heading);

    if (!Array.isArray(items) || items.length === 0) {
      const message = document.createElement("p");
      message.className = "tour-info-message";
      message.textContent = "한국관광공사에서 제공하는 오디오 가이드 정보가 없습니다.";
      card.appendChild(message);
    } else {
      const list = document.createElement("div");
      list.className = "audio-guide-list";
      for (const story of items) {
        const item = document.createElement("section");
        item.className = "audio-guide-item";
        const title = document.createElement("h3");
        title.textContent = story.audioTitle || story.title || "오디오 가이드";
        item.appendChild(title);

        try {
          const audioUrl = new URL(story.audioUrl);
          if (audioUrl.protocol === "https:") {
            const audio = document.createElement("audio");
            audio.controls = true;
            audio.preload = "metadata";
            audio.src = audioUrl.href;
            item.appendChild(audio);
          }
        } catch (_) {
          // Audio is optional. The script remains available if no safe HTTPS URL is supplied.
        }

        if (story.script) {
          const script = document.createElement("p");
          script.className = "audio-guide-script";
          script.textContent = story.script;
          item.appendChild(script);
        }
        list.appendChild(item);
      }
      card.appendChild(list);
    }
    addInfoSource(card, "한국관광공사 오디(Odii) 관광지 오디오 가이드정보 제공");
  }

  async function renderAudioGuideCard(tour, mountId, version) {
    const card = document.getElementById(mountId);
    if (!card) return;
    setInfoMessage(card, "관광지 오디오 가이드", "오디오 가이드 정보를 불러오는 중...", "loading", "한국관광공사 오디(Odii) 관광지 오디오 가이드정보 제공");
    try {
      const data = await getAudioGuide(tour.audioKeyword || tour.name);
      if (version !== renderVersion || !card.isConnected) return;
      const stories = tour.audioStoryTitle
        ? data.items.filter((story) => (story.audioTitle || story.title || "").trim() === tour.audioStoryTitle)
        : data.items;
      appendAudioGuideDetails(card, stories);
    } catch (_) {
      if (version !== renderVersion || !card.isConnected) return;
      setInfoMessage(card, "관광지 오디오 가이드", "오디오 가이드 정보를 불러오지 못했습니다.", "error", "한국관광공사 오디(Odii) 관광지 오디오 가이드정보 제공");
    }
  }

  function playerMarkup(tour, index) {
    const playerId = `player-${tour.districtId}-${index}`;
    const statusId = `${playerId}-status`;
    const barrierFreeId = `${playerId}-barrier-free`;
    const audioGuideId = `${playerId}-audio-guide`;
    const youtubeLink = `https://www.youtube.com/watch?v=${encodeURIComponent(tour.youtubeId)}`;
    return `
      <article class="tour-card">
        <h1 class="sr-only">${tour.district} ${tour.name}</h1>
        <img class="tour-title-image" src="${tour.titleImage}" alt="${tour.name}">
        <div class="tour-content">
          <section class="video-column" aria-label="${tour.name} 360도 영상">
            <div class="pravel-player-wrapper player-shell">
              <div id="${playerId}" class="youtube-player"></div>
              <p id="${statusId}" class="player-status" role="status">360° 영상을 불러오는 중...</p>
            </div>
            <section id="${barrierFreeId}" class="barrier-free-card" aria-live="polite"></section>
            <section id="${audioGuideId}" class="tour-info-card" aria-live="polite"></section>
            <a href="${youtubeLink}" target="_blank" rel="noopener noreferrer" class="youtube-link-button">YouTube에서 고화질로 보기 ↗</a>
          </section>
          <section class="detail-column">
            <img src="${tour.detailImage}" alt="${tour.name} 상세 안내">
          </section>
        </div>
      </article>`;
  }

  async function renderTourView(district, version) {
    const selectedTours = tours.filter((tour) => tour.districtId === district);
    homeView.hidden = true;
    tourView.hidden = false;
    if (selectedTours.length === 0) {
      tourView.innerHTML = "<p class=\"error-message\">정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>";
      setPageStatus("", false);
      return;
    }
    const festivalId = `festival-${district}`;
    const relatedTourId = `related-${district}`;
    tourView.innerHTML = `
      <section id="${festivalId}" class="tour-info-card tour-info-card--district" aria-live="polite"></section>
      <section id="${relatedTourId}" class="tour-info-card tour-info-card--district" aria-live="polite"></section>
    ${selectedTours.map(playerMarkup).join("")}`;
  //  setPageStatus(`${districtLabels[district]} 관광지 ${selectedTours.length}곳`);

    void renderFestivalCard(district, festivalId, version);
    void renderRelatedTourCard(district, relatedTourId, version);
    selectedTours.forEach((tour, index) => {
      void renderBarrierFreeCard(tour, `player-${tour.districtId}-${index}-barrier-free`, version);
      void renderAudioGuideCard(tour, `player-${tour.districtId}-${index}-audio-guide`, version);
    });

    const results = await Promise.allSettled(selectedTours.map((tour, index) => window.create360Player({
      elementId: `player-${tour.districtId}-${index}`,
      videoId: tour.youtubeId,
      statusElementId: `player-${tour.districtId}-${index}-status`
    })));
    const createdControllers = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
    if (version !== renderVersion) {
      createdControllers.forEach((controller) => controller.destroy());
      return;
    }
    playerControllers = createdControllers;
    playerControllers.forEach((controller) => controller.enablePointerGestures());
  }

  async function render() {
    const version = ++renderVersion;
    const district = selectedDistrictFromUrl();
    removePlayers();
    updateMenu(district);
    if (district === "home") {
      // `hidden` alone is not enough when component CSS declares display:grid.
      // Clear the destroyed iframe mounts so the home screen contains only its map.
      tourView.hidden = true;
      tourView.innerHTML = "";
      homeView.hidden = false;
      setPageStatus("");
      window.dispatchEvent(new Event("pravel:show-map"));
      return;
    } else {
      await renderTourView(district, version);
    }
  }

  function navigate(district) {
    const nextUrl = district === "home" ? "/?district=home" : `/?district=${encodeURIComponent(district)}`;
    history.pushState({}, "", nextUrl);
    closeDrawer();
    render();

    window.scrollTo(0, 0);
  }

  window.pravelNavigate = navigate; // window 객체에 navigate 함수 등록

  menu.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-district]");
    if (button) navigate(button.dataset.district);
  });
  menuToggle.addEventListener("click", () => {
    const opening = !sidebar.classList.contains("is-open");
    sidebar.classList.toggle("is-open", opening);
    drawerBackdrop.hidden = !opening;
    menuToggle.setAttribute("aria-expanded", String(opening));
  });
  drawerBackdrop.addEventListener("click", closeDrawer);
  window.addEventListener("popstate", render);

  try {
    const [tourData, districtData, placeData, geoJson] = await Promise.all([
      fetch("/data/tours.json").then((response) => response.ok ? response.json() : Promise.reject()),
      fetch("/data/districts.json").then((response) => response.ok ? response.json() : Promise.reject()),
      fetch("/data/places.json").then((response) => response.ok ? response.json() : Promise.reject()),
      fetch("/data/busan_gu.json").then((response) => response.ok ? response.json() : Promise.reject())
    ]);
    tours = tourData;
    window.addEventListener("pravel:show-map", () => window.initializeBusanMap({
      geoJson,
      districts: districtData,
      places: placeData,
      mapElementId: "map",
      statusElementId: "map-status"
    }));
    await render();
  } catch (_) {
    setPageStatus("정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.", true);
  }
})();
