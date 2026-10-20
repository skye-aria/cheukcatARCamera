/* 照片匯出：只繪製照片與使用者加上的貼圖／文字，不繪製介面框、按鈕或綽貓 UI。 */
window.PhotoExport = (() => {
  const photo = document.getElementById("capturedPhoto");
  const video = document.getElementById("cameraVideo");
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
    });
  }
  function getSourceSize() {
    if (photo.classList.contains("is-visible") && photo.naturalWidth) return [photo.naturalWidth, photo.naturalHeight];
    if (video.videoWidth) return [video.videoWidth, video.videoHeight];
    return [1080, 1440];
  }
  async function exportPhoto() {
    const hasPhoto = photo.classList.contains("is-visible") && photo.naturalWidth;
    const hasCamera = window.CameraManager.isOn() && video.videoWidth;
    if (!hasPhoto && !hasCamera) throw new Error("請先拍照或載入照片，再儲存。");
    const [width, height] = getSourceSize();
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    // 相機／照片使用 contain 方式顯示，匯出時按相同規則置中，空白部分以柔粉色填滿。
    ctx.fillStyle = "#f9e8ef"; ctx.fillRect(0, 0, width, height);
    const source = hasPhoto ? photo : video;
    const sw = hasPhoto ? photo.naturalWidth : video.videoWidth;
    const sh = hasPhoto ? photo.naturalHeight : video.videoHeight;
    const scale = Math.min(width / sw, height / sh);
    ctx.drawImage(source, (width - sw * scale) / 2, (height - sh * scale) / 2, sw * scale, sh * scale);

    const layer = document.getElementById("stickerLayer");
    const layerRect = layer.getBoundingClientRect();
    const scaleX = width / layerRect.width, scaleY = height / layerRect.height;
    for (const item of window.StickerEditor.getItems()) {
      const rect = item.getBoundingClientRect();
      const x = (rect.left - layerRect.left) * scaleX;
      const y = (rect.top - layerRect.top) * scaleY;
      if (item.dataset.kind === "text") {
        const text = item.dataset.text || item.childNodes[0]?.textContent || "";
        const style = getComputedStyle(item);
        const fontSize = parseFloat(style.fontSize) * scaleY;
        ctx.save(); ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = style.color; ctx.shadowColor = "rgba(50,20,35,.65)"; ctx.shadowBlur = 4 * scaleY;
        const lines = text.split("\n"); const lineHeight = fontSize * 1.25;
        const centerX = x + rect.width * scaleX / 2;
        const centerY = y + rect.height * scaleY / 2;
        lines.forEach((line, i) => ctx.fillText(line, centerX, centerY + (i - (lines.length - 1) / 2) * lineHeight, width * .9));
        ctx.restore();
      } else {
        const img = item.querySelector("img");
        if (!img) continue;
        try {
          const loaded = img.complete && img.naturalWidth ? img : await loadImage(img.src);
          ctx.drawImage(loaded, x, y, rect.width * scaleX, rect.height * scaleY);
        } catch (e) { console.warn("略過未能載入的貼圖", e); }
      }
    }
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("照片匯出失敗，請再試一次。")), "image/png");
    });
  }
  async function download() {
    const blob = await exportPhoto();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `cheukcat-photo-${new Date().toISOString().slice(0,10)}.png`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
  return { exportPhoto, download };
})();
