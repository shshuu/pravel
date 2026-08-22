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

        const markers = L.markerClusterGroup();
        places.forEach((place) => {
          L.marker([place.latitude, place.longitude])
            .bindTooltip(place.place)
            .bindPopup(`<strong>${place.place}</strong><br>${place.address}`)
            .addTo(markers);
        });
        map.addLayer(markers);
        setStatus(`지도 준비 완료 — 관광지 마커 ${places.length}개`);
      }
      window.setTimeout(() => map.invalidateSize(), 0);
      return map;
    } catch (_) {
      setStatus("지도를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.", true);
      return null;
    }
  };
})();
