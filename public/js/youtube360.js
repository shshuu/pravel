(function () {
  "use strict";

  let apiPromise;

  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;

    apiPromise = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => reject(new Error("YouTube Player API timed out")), 15000);
      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        if (typeof previousReady === "function") previousReady();
        resolve(window.YT);
      };

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("YouTube Player API could not be loaded"));
      };
      document.head.appendChild(script);
    });
    return apiPromise;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function toDegrees(value) {
    return Math.round(Number(value || 0) * 10) / 10;
  }

  /** Creates an official YouTube IFrame Player API instance with pointer 360° controls. */
  window.create360Player = async function create360Player({ elementId, videoId, statusElementId }) {
    const mount = document.getElementById(elementId);
    const status = statusElementId ? document.getElementById(statusElementId) : null;
    if (!mount) throw new Error(`Player element not found: ${elementId}`);
    // YT.Player replaces the mount div with an iframe, so retain the parent
    // wrapper before constructing the player for the pointer interaction layer.
    const shell = mount.closest(".player-shell");

    const setStatus = (message, isError = false) => {
      if (!status) return;
      status.textContent = message;
      status.classList.toggle("is-error", isError);
    };
    setStatus("360° 영상을 불러오는 중...");

    try {
      const YT = await loadYouTubeApi();
      const player = await new Promise((resolve, reject) => {
        const playerInstance = new YT.Player(elementId, {
          videoId,
          host: "https://www.youtube.com",
          playerVars: {
            autoplay: 0,
            controls: 1,
            fs: 0,
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0
          },
          events: {
            onReady: () => resolve(playerInstance),
            onError: (event) => reject(new Error(`YouTube player error: ${event.data}`))
          }
        });
      });

      let overlay = null;
      let fullscreenButton = null;
      let fullscreenChangeHandler = null;
      const controller = {
        player,
        videoId,
        state: "ready",
        sphericalSupported: false,
        pointerGesturesEnabled: false,
        readSphericalProperties() {
          if (typeof player.getSphericalProperties !== "function") return null;
          try {
            const values = player.getSphericalProperties();
            this.sphericalSupported = Boolean(values && typeof values.yaw === "number");
            return values || null;
          } catch (_) {
            this.sphericalSupported = false;
            return null;
          }
        },
        setSphericalProperties(properties) {
          if (typeof player.setSphericalProperties !== "function") return false;
          try {
            player.setSphericalProperties(properties);
            return true;
          } catch (_) {
            return false;
          }
        },
        togglePlayback() {
          try {
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
              player.pauseVideo();
              return true;
            }
            if (state === YT.PlayerState.ENDED) player.seekTo(0, true);
            player.playVideo();
            return true;
          } catch (_) {
            return false;
          }
        },
        getPlaybackState() {
          try {
            return player.getPlayerState();
          } catch (_) {
            return null;
          }
        },
        async toggleFullscreen() {
          if (!shell || !document.fullscreenEnabled) return false;
          try {
            if (document.fullscreenElement === shell) {
              await document.exitFullscreen();
            } else if (!document.fullscreenElement) {
              await shell.requestFullscreen();
            }
            return true;
          } catch (_) {
            return false;
          }
        },
        enablePointerGestures() {
          if (this.pointerGesturesEnabled) return true;
          if (!shell) return false;
          overlay = document.createElement("div");
          overlay.className = "drag-overlay";
          overlay.setAttribute("aria-hidden", "true");
          shell.appendChild(overlay);

          let pointerId = null;
          let startX = 0;
          let startY = 0;
          let previousX = 0;
          let previousY = 0;
          let dragging = false;
          const dragThreshold = 6;
          const sensitivity = 0.18;
          overlay.addEventListener("pointerdown", (event) => {
            if (event.button !== 0) return;
            pointerId = event.pointerId;
            startX = event.clientX;
            startY = event.clientY;
            previousX = event.clientX;
            previousY = event.clientY;
            dragging = false;
            overlay.setPointerCapture(pointerId);
          });
          overlay.addEventListener("pointermove", (event) => {
            if (event.pointerId !== pointerId) return;
            const totalDistance = Math.hypot(event.clientX - startX, event.clientY - startY);
            if (!dragging && totalDistance >= dragThreshold) dragging = true;
            if (!dragging) return;
            const current = this.readSphericalProperties();
            if (!current) return;
            const dx = event.clientX - previousX;
            const dy = event.clientY - previousY;
            previousX = event.clientX;
            previousY = event.clientY;
            this.setSphericalProperties({
              yaw: toDegrees(current.yaw - dx * sensitivity),
              pitch: clamp(toDegrees(current.pitch + dy * sensitivity), -90, 90),
              roll: current.roll,
              fov: current.fov
            });
          });
          const resetPointer = (event, shouldTogglePlayback) => {
            if (event.pointerId !== pointerId) return;
            if (overlay.hasPointerCapture(pointerId)) overlay.releasePointerCapture(pointerId);
            if (shouldTogglePlayback && !dragging) this.togglePlayback();
            pointerId = null;
            dragging = false;
          };
          overlay.addEventListener("pointerup", (event) => resetPointer(event, true));
          overlay.addEventListener("pointercancel", (event) => resetPointer(event, false));
          this.pointerGesturesEnabled = true;
          return true;
        },
        // Retained for the development test page and older callers.
        enablePointerDrag() {
          return this.enablePointerGestures();
        },
        destroy() {
          if (document.fullscreenElement === shell) document.exitFullscreen().catch(() => {});
          if (fullscreenChangeHandler) document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
          overlay?.remove();
          fullscreenButton?.remove();
          if (typeof player.destroy === "function") player.destroy();
        }
      };

      if (shell) {
        fullscreenButton = document.createElement("button");
        fullscreenButton.type = "button";
        fullscreenButton.className = "pravel-fullscreen-button";
        fullscreenButton.textContent = "전체화면";
        fullscreenButton.setAttribute("aria-label", "전체화면으로 보기");
        fullscreenButton.addEventListener("click", () => controller.toggleFullscreen());
        shell.appendChild(fullscreenButton);
        fullscreenChangeHandler = () => {
          const isFullscreen = document.fullscreenElement === shell;
          fullscreenButton.textContent = isFullscreen ? "전체화면 종료" : "전체화면";
          fullscreenButton.setAttribute("aria-label", isFullscreen ? "전체화면 종료" : "전체화면으로 보기");
        };
        document.addEventListener("fullscreenchange", fullscreenChangeHandler);
      }

      const spherical = controller.readSphericalProperties();
      if (spherical) {
        // A no-op API call verifies that the setter is callable without changing the view.
        controller.setSphericalProperties(spherical);
        setStatus("준비됨 — 중앙 클릭은 재생/일시정지, 드래그는 360° 이동입니다.");
      } else {
        setStatus("360° 조작을 확인하지 못했습니다. YouTube에서 직접 열어보세요.", true);
      }
      return controller;
    } catch (error) {
      setStatus("360° 조작을 사용할 수 없는 환경입니다. YouTube에서 360°로 보기를 이용하세요.", true);
      if (!shell) throw error;
      shell.querySelector(".youtube-player")?.remove();
      const fallback = document.createElement("a");
      fallback.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
      fallback.target = "_blank";
      fallback.rel = "noopener noreferrer";
      fallback.textContent = "YouTube에서 360°로 보기";
      shell.appendChild(fallback);
      throw error;
    }
  };
})();
