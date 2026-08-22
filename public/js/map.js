(function () {
  "use strict";

  let map;

  function colorForValue(value) {
    return Number(value) >= 10 ? "#d7301f" : "#fdae6b";
  }

  window.initializeBusanMap = function initializeBusanMap({ geoJson, districts, places, mapElementId, statusElementId }) {
    const mapElement = document.getElementById(mapElementId);
    const statusElement = document.getElementById(statusElementId);
    const setStatus = (message, isError = false) => {
      statusElement.textContent = message;
      statusElement.classList.toggle("is-error", isError);
    };

    if (!window.L) {
      setStatus("지도를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.", true);
      return null;
    }

    try {
      if (!map) {
        map = L.map(mapElementId).setView([35.1866396, 129.0552696], 11);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: "© OpenStreetMap contributors © CARTO",
          subdomains: "abcd",
          maxZoom: 20
        }).addTo(map);

        const valueByDistrict = new Map(districts.map((district) => [district.gu, district.value]));
        L.geoJSON(geoJson, {
          style: (feature) => {
            const value = valueByDistrict.get(feature.id) || 0;
            return { color: "#a94442", weight: 1, fillColor: colorForValue(value), fillOpacity: 0.42 };
          },
          onEachFeature: (feature, layer) => {
            const name = feature.properties && feature.properties.name ? feature.properties.name : feature.id;
            layer.bindTooltip(`${name} (${valueByDistrict.get(feature.id) || 0})`);
          }
        }).addTo(map);

        // 마커 생성
        const markers = L.markerClusterGroup();
        const districtIdByName = {
          "강서구": "gangseo",
          "기장군": "gijang",
          "부산진구": "busanjin",
          "서구": "seo",
          "해운대구": "haeundae"
        };

        places.forEach((place) => {
          const districtName = place.place.split("_")[0];
          const districtId = districtIdByName[districtName];

          const marker = L.marker([place.latitude, place.longitude])
                          .bindTooltip(place.place)
                          .addTo(markers);
          
          marker.on("click", () => {
            if (!districtId) return;

            window.pravelNavigate(districtId);
          });
        });
        map.addLayer(markers);
        // setStatus(`지도 준비 완료 — 관광지 마커 ${places.length}개`);
      }
      window.setTimeout(() => map.invalidateSize(), 0);
      return map;
    } catch (_) {
      setStatus("지도를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.", true);
      return null;
    }
  };
})();
