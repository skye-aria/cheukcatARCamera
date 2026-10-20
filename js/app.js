/* 主程式：把相機、貼圖、文字與匯出按鈕接起來。 */
(() => {
  const video = document.getElementById("cameraVideo");
  const photo = document.getElementById("capturedPhoto");
  const emptyState = document.getElementById("emptyState");
  const workspace = document.getElementById("workspace");
  const flipBtn = document.getElementById("flipCameraBtn");
  const exportBtn = document.getElementById("exportBtn");
  const hint = document.getElementById("workspaceHint");
  let toastTimer;
  window.showToast = message => {
    const toast = document.getElementById("toast");
    toast.textContent = message; toast.classList.add("is-visible");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  };
  function updateState() {
    const hasPhoto = photo.classList.contains("is-visible") && photo.naturalWidth;
    const hasCamera = window.CameraManager.isOn();
    emptyState.hidden = !!(hasPhoto || hasCamera);
    flipBtn.disabled = !hasCamera;
    exportBtn.disabled = !(hasPhoto || hasCamera);
    workspace.classList.toggle("has-content", !!(hasPhoto || hasCamera));
    hint.textContent = hasCamera ? "即時相機畫面｜貼圖和文字可拖曳調整" : hasPhoto ? "照片編輯中｜介面按鈕不會出現在匯出照片裡" : "先開啟相機或選擇照片 ✨";
  }
  async function startCamera() {
    try {
      await window.CameraManager.start();
      photo.classList.remove("is-visible");
      updateState();
      window.showToast("相機已開啟，可以拍照了！");
    } catch (e) {
      window.showToast(e.message || "無法開啟相機，請檢查瀏覽器權限。");
    }
  }
  function stopCamera() {
    window.CameraManager.stop(); updateState();
    window.showToast("相機已關閉。");
  }
  document.getElementById("startCameraBtn").addEventListener("click", startCamera);
  document.getElementById("cameraToggleBtn").addEventListener("click", () => window.CameraManager.isOn() ? stopCamera() : startCamera());
  flipBtn.addEventListener("click", async () => {
    try { await window.CameraManager.flip(); updateState(); }
    catch (e) { window.showToast("切換鏡頭失敗：" + (e.message || "請再試一次")); }
  });
  document.getElementById("shutterBtn").addEventListener("click", () => {
    if (!window.CameraManager.isOn() || !video.videoWidth) {
      window.showToast("請先開啟相機，或載入照片。"); return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    // 自拍鏡頭畫面會鏡像顯示；拍下來時也保持畫面一致。
    if (video.classList.contains("mirrored")) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    photo.src = canvas.toDataURL("image/jpeg", .94);
    photo.onload = () => {
      photo.classList.add("is-visible");
      // 拍照後關閉鏡頭，減少手機耗電與發熱。
      window.CameraManager.stop();
      updateState(); window.showToast("拍好了！可以加入貼圖、文字或儲存照片。");
    };
  });
  document.getElementById("photoInput").addEventListener("change", e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { window.showToast("請選擇圖片檔案。"); return; }
    const url = URL.createObjectURL(file);
    photo.onload = () => {
      photo.classList.add("is-visible"); window.CameraManager.stop(); updateState();
      window.showToast("照片已載入，可以開始裝飾。");
      URL.revokeObjectURL(url);
    };
    photo.src = url; e.target.value = "";
  });
  document.getElementById("stickerBtn").addEventListener("click", () => window.StickerEditor.openPanel());
  document.getElementById("mascotToggleBtn").addEventListener("click", e => {
    const mascot = document.getElementById("cheukcatMascot");
    mascot.classList.toggle("is-hidden");
    e.currentTarget.textContent = mascot.classList.contains("is-hidden") ? "顯示綽貓" : "隱藏綽貓";
  });
  exportBtn.addEventListener("click", async () => {
    try { await window.PhotoExport.download(); window.StickerEditor.deselect(); window.showToast("已儲存 PNG 照片！"); }
    catch (e) { window.showToast(e.message || "儲存失敗，請再試一次。"); }
  });
  document.getElementById("powerBtn").addEventListener("click", () => {
    window.CameraManager.stop();
    photo.classList.remove("is-visible"); photo.removeAttribute("src");
    window.StickerEditor.getItems().forEach(item => item.remove());
    updateState(); window.showToast("已回到開始畫面。");
  });
  document.addEventListener("visibilitychange", () => {
    // 切到其他 App／背景時停止相機，避免相機長時間運作。
    if (document.hidden && window.CameraManager.isOn()) { window.CameraManager.stop(); updateState(); }
  });
  updateState();
})();
