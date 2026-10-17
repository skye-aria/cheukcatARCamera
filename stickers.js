/* 貼圖模組：加入內建／自訂 PNG，拖曳移動、拉角落縮放、刪除。 */
window.StickerEditor = (() => {
  const layer = document.getElementById("stickerLayer");
  const panel = document.getElementById("stickerPanel");
  const customInput = document.getElementById("customStickerInput");
  let selected = null;
  let customImages = [];

  // 用 IndexedDB 保存自訂 PNG；不會把圖片寫進網站程式資料夾。
  const DB_NAME = "cheukcat-camera-db";
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("這個瀏覽器不支援本機貼圖儲存。"));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("stickers", { keyPath: "id", autoIncrement: true });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function saveCustom(name, dataUrl) {
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction("stickers", "readwrite");
        tx.objectStore("stickers").add({ name, dataUrl });
        tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) { console.warn("自訂貼圖未能永久保存：", e); }
  }
  async function loadCustom() {
    try {
      const db = await openDB();
      customImages = await new Promise((resolve, reject) => {
        const req = db.transaction("stickers", "readonly").objectStore("stickers").getAll();
        req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error);
      });
      db.close();
      customImages.forEach(item => addCustomOption(item));
    } catch (e) { console.info("尚未載入自訂貼圖。", e); }
  }
  function addCustomOption(item) {
    if (document.querySelector(`[data-custom-id="${item.id}"]`)) return;
    const button = document.createElement("button");
    button.className = "sticker-option"; button.dataset.customId = item.id;
    const img = document.createElement("img"); img.src = item.dataUrl; img.alt = item.name;
    const small = document.createElement("small"); small.textContent = item.name;
    button.append(img, small);
    button.addEventListener("click", () => addSticker(item.dataUrl, item.name));
    document.querySelector(".sticker-grid").appendChild(button);
  }
  function openPanel() { panel.classList.add("is-open"); panel.setAttribute("aria-hidden", "false"); }
  function closePanel() { panel.classList.remove("is-open"); panel.setAttribute("aria-hidden", "true"); }
  function addSticker(src, name = "貼圖") {
    const item = document.createElement("div");
    item.className = "canvas-item"; item.dataset.kind = "sticker"; item.dataset.name = name;
    item.style.left = `${42 + Math.random() * 16}%`;
    item.style.top = `${38 + Math.random() * 22}%`;
    const img = document.createElement("img"); img.src = src; img.alt = name; img.draggable = false;
    img.addEventListener("load", () => {
      // 根據原圖比例限制初始寬度，避免超寬框／裝飾突然遮住整張照片。
      if (img.naturalWidth > img.naturalHeight * 2.3) item.style.width = "55%";
    }, { once: true });
    const resize = document.createElement("span"); resize.className = "resize-handle"; resize.title = "拉動調整大小";
    const del = document.createElement("button"); del.type = "button"; del.className = "delete-item"; del.textContent = "×"; del.title = "刪除貼圖";
    del.addEventListener("pointerdown", e => e.stopPropagation());
    del.addEventListener("click", e => { e.stopPropagation(); item.remove(); if (selected === item) selected = null; });
    item.append(img, resize, del); layer.appendChild(item); bindItem(item, resize); select(item); closePanel();
    return item;
  }
  function bindItem(item, resizeHandle) {
    let mode = null, startX = 0, startY = 0, startLeft = 0, startTop = 0, startWidth = 0;
    item.addEventListener("pointerdown", e => {
      if (e.target === resizeHandle || e.target.closest(".delete-item")) return;
      select(item); mode = "move"; startX = e.clientX; startY = e.clientY;
      const rect = layer.getBoundingClientRect(), box = item.getBoundingClientRect();
      startLeft = ((box.left + box.width / 2 - rect.left) / rect.width) * 100;
      startTop = ((box.top + box.height / 2 - rect.top) / rect.height) * 100;
      item.setPointerCapture(e.pointerId); e.preventDefault();
    });
    resizeHandle.addEventListener("pointerdown", e => {
      select(item); mode = "resize"; startX = e.clientX; startWidth = item.getBoundingClientRect().width;
      item.setPointerCapture(e.pointerId); e.stopPropagation(); e.preventDefault();
    });
    item.addEventListener("pointermove", e => {
      if (!mode) return;
      const rect = layer.getBoundingClientRect();
      if (mode === "move") {
        item.style.left = `${Math.max(0, Math.min(100, startLeft + (e.clientX - startX) / rect.width * 100))}%`;
        item.style.top = `${Math.max(0, Math.min(100, startTop + (e.clientY - startY) / rect.height * 100))}%`;
      } else {
        const newWidth = Math.max(36, Math.min(rect.width * 0.95, startWidth + e.clientX - startX));
        item.style.width = `${newWidth / rect.width * 100}%`;
      }
    });
    const end = () => { mode = null; };
    item.addEventListener("pointerup", end); item.addEventListener("pointercancel", end);
  }
  function select(item) {
    if (selected) selected.classList.remove("is-selected");
    selected = item;
    if (selected) selected.classList.add("is-selected");
  }
  function deselect() { if (selected) selected.classList.remove("is-selected"); selected = null; }
  function getItems() { return [...layer.querySelectorAll(".canvas-item")]; }
  function addText(text, opts) {
    const item = document.createElement("div");
    item.className = "canvas-item text-item"; item.dataset.kind = "text"; item.dataset.text = text;
    item.textContent = text;
    item.style.left = "50%"; item.style.top = "50%";
    item.style.fontFamily = opts.font; item.style.color = opts.color; item.style.fontSize = `${opts.size}px`;
    const resize = document.createElement("span"); resize.className = "resize-handle";
    const del = document.createElement("button"); del.type = "button"; del.className = "delete-item"; del.textContent = "×";
    del.addEventListener("pointerdown", e => e.stopPropagation());
    del.addEventListener("click", e => { e.stopPropagation(); item.remove(); selected = null; });
    item.append(resize, del); layer.appendChild(item); bindItem(item, resize); select(item);
  }
  async function importPNG(file) {
    if (!file || file.type !== "image/png") throw new Error("目前只接受透明 PNG 圖片。");
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file);
    });
    const item = { name: file.name.replace(/\.png$/i, "").slice(0, 32) || "自訂貼圖", dataUrl };
    await saveCustom(item.name, dataUrl);
    addSticker(dataUrl, item.name);
    // 新加入的自訂圖先直接加入畫布，亦補到貼圖清單；下次開啟可由 IndexedDB 還原。
    const db = await openDB().catch(() => null);
    if (db) {
      const all = await new Promise(resolve => { const req = db.transaction("stickers", "readonly").objectStore("stickers").getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => resolve([]); });
      db.close();
      customImages = all;
      const latest = all[all.length - 1];
      if (latest) addCustomOption(latest);
    } else {
      const button = document.createElement("button"); button.className = "sticker-option";
      const img = document.createElement("img"); img.src = dataUrl; img.alt = item.name;
      const small = document.createElement("small"); small.textContent = item.name;
      button.append(img, small); button.addEventListener("click", () => addSticker(dataUrl, item.name));
      document.querySelector(".sticker-grid").append(button);
    }
  }
  document.querySelectorAll("[data-sticker]").forEach(button => button.addEventListener("click", () => addSticker(button.dataset.sticker, button.innerText.trim())));
  document.getElementById("addCustomSticker").addEventListener("click", () => customInput.click());
  customInput.addEventListener("change", async () => {
    try { await importPNG(customInput.files[0]); }
    catch (e) { window.showToast(e.message || "匯入 PNG 失敗。"); }
    customInput.value = "";
  });
  layer.addEventListener("pointerdown", e => { if (e.target === layer) deselect(); });
  document.querySelectorAll("[data-close='stickerPanel']").forEach(b => b.addEventListener("click", closePanel));
  loadCustom();
  return { openPanel, closePanel, addSticker, addText, getItems, deselect, select };
})();
