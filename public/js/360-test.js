(async function () {
  "use strict";
  const result = document.getElementById("test-result");
  const readButton = document.getElementById("spherical-read");
  const nudgeButton = document.getElementById("spherical-nudge");

  try {
    const controller = await window.create360Player({
      elementId: "test-player",
      videoId: "AFv16Eej3nc",
      statusElementId: "test-player-status"
    });
    controller.enablePointerGestures();
    [readButton, nudgeButton].forEach((button) => { button.disabled = false; });
    result.textContent = controller.sphericalSupported
      ? "IFrame Player API 준비됨. spherical getter/setter가 호출되었습니다."
      : "Player는 준비됐지만 spherical 값을 받지 못했습니다. 영상을 재생한 뒤 다시 확인하세요.";

    readButton.addEventListener("click", () => {
      const properties = controller.readSphericalProperties();
      result.textContent = properties
        ? `spherical: yaw ${properties.yaw}, pitch ${properties.pitch}, roll ${properties.roll}, fov ${properties.fov}`
        : "spherical 값을 사용할 수 없습니다.";
    });
    nudgeButton.addEventListener("click", () => {
      const current = controller.readSphericalProperties();
      if (!current || !controller.setSphericalProperties({ ...current, yaw: current.yaw + 1 })) {
        result.textContent = "yaw 변경 API를 호출하지 못했습니다.";
        return;
      }
      result.textContent = "yaw +1° API 호출 완료. 영상 시점 변화를 확인하세요.";
    });
  } catch (error) {
    result.textContent = "Player 초기화에 실패했습니다. 네트워크 또는 YouTube embed 설정을 확인하세요.";
  }
})();
