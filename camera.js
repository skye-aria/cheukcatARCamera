/* 相機模組：只負責開關鏡頭與前後鏡頭切換。 */
window.CameraManager = (() => {
  let stream = null;
  let facingMode = "environment";
  const video = document.getElementById("cameraVideo");

  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("此瀏覽器不支援相機，請用較新的瀏覽器並以 HTTPS 開啟網站。");
    }
    stop();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
    } catch (firstError) {
      // 某些手機不接受 ideal facingMode，退回一般相機請求再試一次。
      stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
    }
    video.srcObject = stream;
    await video.play();
    video.classList.add("is-visible");
    video.classList.toggle("mirrored", facingMode === "user");
    return true;
  }
  function stop() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.pause();
    video.srcObject = null;
    video.classList.remove("is-visible", "mirrored");
  }
  async function flip() {
    facingMode = facingMode === "environment" ? "user" : "environment";
    await start();
  }
  function isOn() { return !!stream; }
  function getVideo() { return video; }
  function getFacingMode() { return facingMode; }
  return { start, stop, flip, isOn, getVideo, getFacingMode };
})();
