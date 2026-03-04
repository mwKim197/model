// Product UI module: displayProducts, adjustTextSize, generateMenu, activateTab
(function(global){
  const { createText, createImg, safeSetText } = global.orderDom || {};

  function adjustTextSize(textElement, fixedWidth = 200) {
    if (!textElement) return;
    let fontSize = 20;
    textElement.style.fontSize = fontSize + "px";
    textElement.style.display = 'inline-block';
    textElement.style.transformOrigin = 'left center';
    const textWidth = textElement.scrollWidth;
    if (textWidth > fixedWidth) {
      const scale = fixedWidth / textWidth;
      textElement.style.transform = `scale(${scale})`;
    } else {
      textElement.style.transform = '';
    }
  }

  function createBadgeImage(name, className) {
    if (!name) return '';
    return `<img src="../../assets/basicImage/${name}.png" alt="badge" class="${className}"/>`;
  }

  // Normalize image src values to handle Windows paths, S3 cache, and relative paths
  function normalizeImageSrc(src, product) {
    if (!src) return '';
    // already a URL
    if (/^https?:\/\//i.test(src) || /^file:\/\//i.test(src)) return src;

    // Helper: extract filename from path
    function filenameFromPath(p) {
      try {
        const parts = p.replace(/\\\\/g, '/').replace(/\\/g, '/').split('/');
        return parts.pop();
      } catch (e) { return p; }
    }

    // Windows absolute path e.g. C:\path\to\file.png
    const winDriveMatch = src.match(/^([A-Za-z]):\\\\|^([A-Za-z]):\\/);
    if (winDriveMatch) {
      const drive = (winDriveMatch[1] || winDriveMatch[2]).toUpperCase();
      const filename = filenameFromPath(src);

      // 1) If running on Windows and winDriveMap exists, preserve old behavior
      if (navigator.platform && /win/i.test(navigator.platform) && window.winDriveMap && window.winDriveMap[drive]) {
        const base = window.winDriveMap[drive].replace(/\\\\/g, '/').replace(/\\/g, '/').replace(/\/$/, '');
        return 'file:///' + (base + '/' + filename).replace(/\/\//g, '/');
      }

      // 2) Try S3 cache path (common for mac): consult preload helper if available
      const tryS3Cache = async () => {
        // prefer explicit preload API if present
        if (window.electronAPI && typeof window.electronAPI.getS3CachePath === 'function') {
          try {
            const p = await window.electronAPI.getS3CachePath();
            if (p) return 'file://' + (p.replace(/\/$/, '') + '/' + filename);
          } catch (e) {
            console.warn('getS3CachePath failed', e);
          }
        }
        // fallback to window.s3CachePath or appBasePath/out/s3cache
        if (window.s3CachePath) return 'file://' + (window.s3CachePath.replace(/\/$/, '') + '/' + filename);
        if (window.appBasePath) return 'file://' + (window.appBasePath.replace(/\/$/, '') + '/out/s3cache/' + filename);
        // last fallback: file:/// with normalized path
        const fixed = src.replace(/\\\\/g, '/').replace(/\\/g, '/');
        return 'file:///' + fixed;
      };

      // Note: normalizeImageSrc is synchronous in many callers; attempt best-effort synchronous decisions
      // If navigator indicates mac/darwin, return s3Cache heuristics synchronously using globals
      if (navigator.platform && /mac|darwin|linux|x86_64/i.test(navigator.platform)) {
        if (window.s3CachePath) return 'file://' + (window.s3CachePath.replace(/\/$/, '') + '/' + filename);
        if (window.appBasePath) return 'file://' + (window.appBasePath.replace(/\/$/, '') + '/out/s3cache/' + filename);
        // synchronous fallback to file:///C:/... (will likely not exist on mac, but preserves behavior)
        const fixed = src.replace(/\\\\/g, '/').replace(/\\/g, '/');
        return 'file:///' + fixed;
      }

      // default fallback
      const fixed = src.replace(/\\\\/g, '/').replace(/\\/g, '/');
      return 'file:///' + fixed;
    }

    // if contains backslashes, normalize them
    if (src.indexOf('\\') !== -1) {
      src = src.replace(/\\\\/g, '/').replace(/\\/g, '/');
    }

    // if app provides base path, use it
    if (window.appBasePath) {
      const base = window.appBasePath.endsWith('/') ? window.appBasePath : (window.appBasePath + '/');
      return base + src;
    }
    // fallback: return as-is (relative path)
    return src;
  }

  // Safe synchronous normalizer that avoids embedding Windows absolute paths into mac paths
  function normalizeImageSrcSafe(src, product) {
    if (!src) return '';
    // if already a http or file URL, leave as-is
    if (/^https?:\/\//i.test(src) || /^file:\/\//i.test(src)) return src;
    // extract filename
    const filename = (src || '').replace(/\\\\/g, '/').replace(/\\/g, '/').split('/').pop();
    if (!filename) return src;

    // If running on Windows, preserve original behavior (C:\... may be correct)
    try {
      if (navigator && /win/i.test(navigator.platform)) {
        // If src was already an absolute windows path, normalize slashes and return file:///C:/...
        const fixedWin = src.replace(/\\\\/g, '/').replace(/\\/g, '/');
        return fixedWin.startsWith('file:') ? fixedWin : 'file:///' + encodeURI(fixedWin);
      }
    } catch (e) {
      // ignore navigator errors and continue with mac/linux logic
    }

    // For mac/linux: prefer s3CachePath or appBasePath/out/s3cache
    if (window.s3CachePath) return 'file://' + encodeURI(window.s3CachePath.replace(/\/$/, '') + '/' + filename);
    if (window.appBasePath) return 'file://' + encodeURI(window.appBasePath.replace(/\/$/, '') + '/out/s3cache/' + filename);

    // Final fallback: use project out/s3cache path if available (local default for mac)
    try {
      // Use a sensible default for this environment (development mac path)
      const defaultCache = '/Users/minwookim/workspace/model/out/s3cache';
      return 'file://' + encodeURI(defaultCache.replace(/\/$/, '') + '/' + filename);
    } catch (e) {
      // As last resort, return normalized original path
      const fixed = src.replace(/\\\\/g, '/').replace(/\\/g, '/');
      return 'file:///' + encodeURI(fixed);
    }
  }

  function displayProducts(products) {
    const productGrid = document.getElementById('productGrid');
    if (!productGrid) {
      console.warn('productGrid not found');
      return;
    }
    productGrid.innerHTML = '';

    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'product-card rounded-lg text-center cursor-pointer';

      const isEmpty = product.empty === 'yes';

      const container = document.createElement('div');
      container.className = 'relative bg-black bg-opacity-10 w-[200px] aspect-square overflow-hidden rounded-2xl';

      console.log("???: ", normalizeImageSrc(product.image || ''));
      const img = document.createElement('img');
      // use safe synchronous normalizer to avoid embedding Windows absolute paths on mac
      img.src = normalizeImageSrcSafe(product.image || '');
      img.alt = product.name || '';
      img.className = 'w-full h-full object-cover rounded-2xl';
      container.appendChild(img);

      // badges using innerHTML for small badge fragments
      if (product.state?.new) container.insertAdjacentHTML('beforeend', createBadgeImage(product.state.new, 'absolute top-0 left-0 w-full h-full object-cover'));
      if (product.state?.best) container.insertAdjacentHTML('beforeend', createBadgeImage(product.state.best, 'absolute bottom-0 left-0 w-full h-full object-cover'));
      if (product.state?.event) container.insertAdjacentHTML('beforeend', createBadgeImage(product.state.event, 'absolute bottom-0 left-0 w-full h-full object-cover'));

      const rightBadge = product.iceYn === 'yes' ? 'ice' : 'hot';
      if (rightBadge && (!product.cupYn || product.cupYn === 'no')) {
        container.insertAdjacentHTML('beforeend', createBadgeImage(rightBadge, 'absolute top-0 right-0 w-8 h-8 object-cover mt-1.5 mr-1.5'));
      }

      if (isEmpty) container.insertAdjacentHTML('beforeend', `<img src="../../assets/basicImage/품절.png" alt="Sold Out" class="absolute top-0 left-0 w-full h-full object-cover opacity-70 z-10"/>`);

      card.appendChild(container);

      const info = document.createElement('div');
      info.className = 'mt-1';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'auto-shrink-text whitespace-nowrap block mx-auto';
      nameSpan.textContent = product.name || '';
      info.appendChild(nameSpan);
      const priceSpan = document.createElement('span');
      priceSpan.className = 'block text-gray-600 text-[1rem] text-right pr-4';
      priceSpan.textContent = '₩ ' + (Number(product.price) || 0).toLocaleString();
      info.appendChild(priceSpan);
      card.appendChild(info);

      const btn = document.createElement('button');
      btn.id = product.menuId || '';
      btn.className = `prevent-double-click ${isEmpty ? 'disabled:opacity-50' : ''}`;
      if (isEmpty) btn.disabled = true;
      else btn.addEventListener('click', () => { window.orderProductOnClick && window.orderProductOnClick(product.menuId); });

      card.appendChild(btn);
      productGrid.appendChild(card);

      // adjust text size
      adjustTextSize(nameSpan, 200);

      if (!isEmpty) {
        card.addEventListener('click', () => {
          window.orderProductOnClick && window.orderProductOnClick(product.menuId);
        });
      } else {
        card.classList.add('cursor-not-allowed');
      }
    });
  }

  function generateMenu(categories) {
    const nav = document.getElementById('menu-nav');
    if (!nav) return;
    nav.innerHTML = '';
    categories.forEach((category, index) => {
      const menuTab = document.createElement('div');
      menuTab.className = `menu-tab flex-1 text-center py-2 hover:bg-gray-200 transition-colors whitespace-nowrap duration-200  ${index === 0 ? 'active' : ''}`;
      menuTab.setAttribute('data-category', category.item || category.item4);
      menuTab.textContent = category.name;
      nav.appendChild(menuTab);
    });
  }

  function activateTab(tab) {
    document.querySelector('.menu-tab.active')?.classList.remove('active');
    tab.classList.add('active');
    const category = tab.getAttribute('data-category');
    const filteredProducts = category === 'all'
      ? window.allProducts
      : (window.allProducts || []).filter(product => product.category === category);
    displayProducts(filteredProducts);
  }

  global.orderProduct = global.orderProduct || {};
  global.orderProduct.displayProducts = displayProducts;
  global.orderProduct.adjustTextSize = adjustTextSize;
  global.orderProduct.generateMenu = generateMenu;
  global.orderProduct.activateTab = activateTab;
  // expose normalization helpers for order.js and external callers
  global.orderProduct.normalizeImageSrc = normalizeImageSrc;
  global.orderProduct.normalizeImageSrcSafe = normalizeImageSrcSafe;

  // Hotfix: scan existing <img> elements and normalize any Windows-style paths that may have been rendered
  // This helps when server-side/template injected img[src="C:\\..."] remains in DOM before our displayProducts runs.
  function normalizeExistingImgElements() {
    try {
      const imgs = Array.from(document.querySelectorAll('img'));
      imgs.forEach(img => {
        const attr = img.getAttribute('src') || '';
        if (!attr) return;
        // detect Windows-style path or legacy model path
        if (/^[A-Za-z]:\\\\|^[A-Za-z]:\\/.test(attr) || /model\\images/i.test(attr) ) {
          try {
            const newSrc = normalizeImageSrc(attr);
            if (newSrc && newSrc !== attr) {
              img.src = newSrc;
              // also update attribute for consistency
              img.setAttribute('src', newSrc);
            }
          } catch (e) {
            console.warn('normalizeExistingImgElements: normalizeImageSrc failed', e);
          }
        }
      });
    } catch (e) {
      console.warn('normalizeExistingImgElements error', e);
    }
  }

  // Run once after a short delay to allow initial server-rendered DOM to settle
  setTimeout(normalizeExistingImgElements, 300);

  // Observe mutations to catch late-inserted img elements and normalize them
  const imgObserver = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      if (m.type === 'childList' && m.addedNodes.length) {
        m.addedNodes.forEach(node => {
          if (node && node.querySelectorAll) {
            const addedImgs = node.querySelectorAll('img');
            addedImgs.forEach(img => {
              const attr = img.getAttribute('src') || '';
              if (!attr) return;
              if (/^[A-Za-z]:\\\\|^[A-Za-z]:\\/.test(attr) || /model\\images/i.test(attr)) {
                try {
                  const newSrc = normalizeImageSrc(attr);
                  if (newSrc && newSrc !== attr) {
                    img.src = newSrc;
                    img.setAttribute('src', newSrc);
                  }
                } catch (e) {
                  console.warn('imgObserver normalize failed', e);
                }
              }
            });
          }
        });
      }
    });
  });
  imgObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });


// One-time remote diagnostic: force-normalize Windows-style img src -> s3Cache file:// and log results
(function(){
  try {
    const filenameFromPath = p => p ? p.replace(/\\\\/g,'/').replace(/\\/g,'/').split('/').pop() : '';
    const s3Base = (window.s3CachePath || (window.appBasePath && (window.appBasePath.replace(/\/$/,'') + '/out/s3cache'))) || '';
    const updated = [];
    [...document.querySelectorAll('img')].forEach(i=>{
      const attr = i.getAttribute('src') || '';
      if (!attr) return;
      if (/^[A-Za-z]:\\\\|^[A-Za-z]:\\/.test(attr) || /model\\\\images/i.test(attr) || /model\\\\/i.test(attr) || /model\\/i.test(attr)) {
        const filename = filenameFromPath(attr);
        if (!filename) return;
        const raw = s3Base ? (s3Base.replace(/\/$/,'') + '/' + filename) : filename;
        const newSrc = raw.startsWith('file://') ? encodeURI(raw) : 'file://' + encodeURI(raw);
        i.src = newSrc;
        i.setAttribute('src', newSrc);
        updated.push({old: attr, new: newSrc});
        console.log('[product.js:diag] updated img', attr, '=>', newSrc);
      }
    });
    console.log('[product.js:diag] updated count:', updated.length);
    setTimeout(()=>{
      updated.forEach((u, idx)=>{
        const el = [...document.querySelectorAll('img')].find(i => i.getAttribute('src') === u.new);
        console.log('[product.js:diag] check', idx, u.new, 'naturalWidth=', el ? el.naturalWidth : 'NOT_FOUND');
      });
    }, 800);
  } catch(e){ console.error('[product.js:diag] error', e); }
})();

// retry a bit later in case images load later
setTimeout(()=>{
  try {
    const filenameFromPath = p => p ? p.replace(/\\/g,'/').replace(/\\/g,'/').split('/').pop() : '';
    const s3Base = (window.s3CachePath || (window.appBasePath && (window.appBasePath.replace(/\/$/,'') + '/out/s3cache'))) || '';
    const updated2 = [];
    [...document.querySelectorAll('img')].forEach(i=>{
      const attr = i.getAttribute('src') || '';
      if (!attr) return;
      if (/^[A-Za-z]:\\\\|^[A-Za-z]:\\/.test(attr) || /model\\\\images/i.test(attr) || /model\\\\/i.test(attr) || /model\\/i.test(attr)) {
        const filename = filenameFromPath(attr);
        if (!filename) return;
        const raw = s3Base ? (s3Base.replace(/\/$/,'') + '/' + filename) : filename;
        const newSrc = raw.startsWith('file://') ? encodeURI(raw) : 'file://' + encodeURI(raw);
        i.src = newSrc;
        i.setAttribute('src', newSrc);
        updated2.push({old: attr, new: newSrc});
        console.log('[product.js:diag2] updated img', attr, '=>', newSrc);
      }
    });
    console.log('[product.js:diag2] updated count:', updated2.length);
    setTimeout(()=>{
      updated2.forEach((u, idx)=>{
        const el = [...document.querySelectorAll('img')].find(i => i.getAttribute('src') === u.new);
        console.log('[product.js:diag2] check', idx, u.new, 'naturalWidth=', el ? el.naturalWidth : 'NOT_FOUND');
      });
    }, 1200);
  } catch(e){ console.error('[product.js:diag2] error', e); }
}, 2000);

})(window);
