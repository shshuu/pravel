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

  function playerMarkup(tour, index) {
    const playerId = `player-${tour.districtId}-${index}`;
    const statusId = `${playerId}-status`;
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
    tourView.innerHTML = selectedTours.map(playerMarkup).join("");
  //  setPageStatus(`${districtLabels[district]} 관광지 ${selectedTours.length}곳`);

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
