(function () {
  "use strict";

  const cache = new Map();
  const mountedCards = new WeakSet();

  const style = document.createElement("style");
  style.textContent = `
    .dongbaek-section {
      margin-top: 1rem;
      padding: 1rem;
      border: 1px solid #d6d1c6;
      border-radius: 6px;
      background: rgba(255, 255, 255, .9);
    }
    .dongbaek-section h2 {
      margin: 0;
      min-height: 48px;
      display: flex;
      align-items: center;
      box-sizing: border-box;
      font-size: 1.05rem;
    }
    .dongbaek-status {
      min-height: 1.35rem;
      margin: 0 0 .65rem;
      color: #4e4a44;
      font-size: .92rem;
    }
    .dongbaek-list {
      display: grid;
      gap: .5rem;
    }
    .dongbaek-item {
      display: flex;
      min-height: 58px;
      align-items: flex-start;
      justify-content: space-between;
      gap: .8rem;
      padding: .65rem .75rem;
      border-radius: 5px;
      background: #fff;
    }
    .dongbaek-item strong {
      display: block;
      margin-bottom: .25rem;
    }
    .dongbaek-item p {
      margin: 0;
      color: #4e4a44;
      font-size: .9rem;
      line-height: 1.45;
    }
    .dongbaek-badge {
      flex: 0 0 auto;
      color: #8b1f2d;
      font-weight: 700;
      font-size: .82rem;
      white-space: nowrap;
    }
  `;
  document.head.appendChild(style);

  function selectedDistrict() {
    return new URLSearchParams(window.location.search).get("district") || "home";
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function anchorTokens(anchor) {
    const compact = anchor.replace(/\s+/g, "");
    const words = anchor.split(/[\s_/()-]+/).filter((token) => token.length >= 2);
    const grams = [];

    for (let i = 0; i < compact.length - 1; i += 1) {
      grams.push(compact.slice(i, i + 2));
    }

    return [...new Set([...words, ...grams])].filter((token) => (
      !["부산", "관광", "공원", "야경"].includes(token)
    ));
  }

  function scoreMerchant(merchant, tokens) {
    if (!tokens.length) return 0;
    const haystack = `${merchant.name} ${merchant.address}`;
    return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
  }

  function shouldExcludeMerchant(merchant) {
    const name = merchant.name || "";
    const haystack = `${name} ${merchant.address || ""}`;
    return (
      haystack.includes("택시") ||
      haystack.includes("(부산)개인_") ||
      /개인[_\s-]*\d{2}[가-힣]\d{4}/.test(haystack) ||
      name.startsWith("T_해지")
    );
  }

  function cardAnchor(card) {
    const titleImage = card.querySelector(".tour-title-image");
    if (titleImage?.alt) return titleImage.alt;

    const hiddenHeading = card.querySelector(".sr-only");
    return hiddenHeading?.textContent?.trim() || "";
  }

  async function loadDistrictData(district) {
    if (cache.has(district)) return cache.get(district);

    const request = fetch(`/data/dongbaek-merchants/${encodeURIComponent(district)}.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Dongbaek data request failed");
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      });

    cache.set(district, request);
    return request;
  }

  function merchantMarkup(merchant, isMatched) {
    return `
      <article class="dongbaek-item">
        <div>
          <strong>${escapeHtml(merchant.name)}</strong>
          <p>${escapeHtml(merchant.address)}</p>
        </div>
        ${isMatched ? "<span class=\"dongbaek-badge\">추천</span>" : ""}
      </article>`;
  }

  async function renderSection(section, district, anchor) {
    const status = section.querySelector(".dongbaek-status");
    const list = section.querySelector(".dongbaek-list");

    try {
      const merchants = await loadDistrictData(district);
      const tokens = anchorTokens(anchor);
      const ranked = merchants
        .filter((merchant) => !shouldExcludeMerchant(merchant))
        .map((merchant) => ({ ...merchant, score: scoreMerchant(merchant, tokens) }))
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "ko"))
        .slice(0, 8);

      if (!ranked.length) {
        status.textContent = "표시할 동백전 가맹점을 찾지 못했습니다.";
        list.innerHTML = "";
        return;
      }

      status.textContent = "관광지가 속한 지역의 동백전 가맹점을 추천했어요.";
      list.innerHTML = ranked.map((merchant) => merchantMarkup(merchant, merchant.score > 0)).join("");
    } catch (_) {
      status.textContent = "동백전 가맹점 정보를 불러오지 못했습니다.";
      list.innerHTML = "";
    }
  }

  function mountDongbaekSections() {
    const district = selectedDistrict();
    if (district === "home") return;

    document.querySelectorAll(".tour-card").forEach((card, index) => {
      if (mountedCards.has(card)) return;

      const videoColumn = card.querySelector(".video-column");
      if (!videoColumn) return;

      mountedCards.add(card);

      const section = document.createElement("section");
      section.className = "dongbaek-section";
      section.setAttribute(
        "aria-labelledby",
        `dongbaek-heading-${district}-${index}`
      );

      // 제목
      const heading = document.createElement("h2");
      heading.id = `dongbaek-heading-${district}-${index}`;
      heading.textContent = "주변 동백전 가맹점";

      // 접히는 내용 영역
      const content = document.createElement("div");
      content.className = "dongbaek-content";
      content.hidden = true;

      // 상태 메시지
      const status = document.createElement("p");
      status.className = "dongbaek-status";
      status.setAttribute("role", "status");
      status.textContent = "가맹점 정보를 불러오는 중...";

      // 가맹점 목록
      const list = document.createElement("div");
      list.className = "dongbaek-list";

      content.appendChild(status);
      content.appendChild(list);

      // 토글 화살표
      const arrow = document.createElement("span");
      arrow.textContent = " ▼";
      arrow.className = "dongbaek-toggle-arrow";
      heading.appendChild(arrow);

      // 제목 토글 설정
      heading.style.cursor = "pointer";
      heading.setAttribute("role", "button");
      heading.setAttribute("tabindex", "0");
      heading.setAttribute("aria-expanded", "false");

      const toggle = () => {
        const isOpen = !content.hidden;

        content.hidden = isOpen;
        heading.setAttribute("aria-expanded", String(!isOpen));
        arrow.textContent = isOpen ? " ▼" : " ▲";
      };

      heading.addEventListener("click", toggle);

      heading.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggle();
        }
      });

      section.appendChild(heading);
      section.appendChild(content);

      const youtubeLink = videoColumn.querySelector(".youtube-link-button");

      if (youtubeLink) {
        youtubeLink.insertAdjacentElement("beforebegin", section);
      } else {
        videoColumn.appendChild(section);
      }

      void renderSection(section, district, cardAnchor(card));
    });
  }

  const observer = new MutationObserver(mountDongbaekSections);
  window.addEventListener("DOMContentLoaded", () => {
    observer.observe(document.body, { childList: true, subtree: true });
    mountDongbaekSections();
  });
  window.addEventListener("popstate", () => setTimeout(mountDongbaekSections, 0));
})();
