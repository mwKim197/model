// Utilities: safe DOM creation and helpers
(function(global){
  function createText(tag, text, className) {
    const el = document.createElement(tag || 'div');
    if (className) el.className = className;
    el.textContent = text == null ? '' : String(text);
    return el;
  }

  function createImg(src, alt, className) {
    const img = document.createElement('img');
    if (src) img.src = src;
    if (alt) img.alt = alt;
    if (className) img.className = className;
    return img;
  }

  function safeSetText(el, text) {
    if (!el) return;
    el.textContent = text == null ? '' : String(text);
  }

  // expose
  global.orderDom = global.orderDom || {};
  global.orderDom.createText = createText;
  global.orderDom.createImg = createImg;
  global.orderDom.safeSetText = safeSetText;
})(window);
