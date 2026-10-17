/* 文字工具：控制加入文字時的字體、顏色與大小。 */
(() => {
  const dialog = document.getElementById("textDialog");
  const form = document.getElementById("textForm");
  const content = document.getElementById("textContent");
  function close() { dialog.hidden = true; }
  document.getElementById("textBtn").addEventListener("click", () => {
    dialog.hidden = false; content.focus();
  });
  document.getElementById("cancelText").addEventListener("click", close);
  document.getElementById("cancelText2").addEventListener("click", close);
  form.addEventListener("submit", e => {
    e.preventDefault();
    const text = content.value.trim();
    if (!text) { window.showToast("先輸入一點文字吧！"); return; }
    window.StickerEditor.addText(text, {
      font: document.getElementById("textFont").value,
      color: document.getElementById("textColor").value,
      size: Number(document.getElementById("textSize").value)
    });
    content.value = ""; close();
  });
})();
