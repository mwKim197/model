(function(){
  try{
    const result = {images:[], modal:{}, orderCore: null, addedTest:false};

    // collect orderGrid imgs
    const imgs = Array.from(document.querySelectorAll('#orderGrid img'));
    imgs.forEach(img=>{
      result.images.push({src: img.getAttribute('src'), naturalWidth: img.naturalWidth || 0, complete: img.complete, alt: img.alt});
      // ensure fallback attached
      img.onerror = function(){ this.onerror=null; this.src='../../assets/basicImage/white.png'; };
    });

    // modal image
    const modalImage = document.getElementById('modalImage');
    if(modalImage){
      result.modal.src = modalImage.getAttribute('src');
      result.modal.naturalWidth = modalImage.naturalWidth || 0;
      modalImage.onerror = function(){ this.onerror=null; this.src='../../assets/basicImage/white.png'; };
    }

    // try simulate close button click
    const closeIds = ['totalPayCloseModalBtn','closeModalBtn','cancelButton','okButton'];
    result.close = {};
    closeIds.forEach(id=>{
      const el = document.getElementById(id);
      result.close[id] = !!el;
      if(el){
        try{
          el.click();
          result.close[id+'_clicked'] = true;
        }catch(e){ result.close[id+'_clicked'] = false; }
      }
    });

    // orderCore snapshot
    try{
      if(window.orderCore && typeof window.orderCore.getOrder === 'function'){
        result.orderCore = window.orderCore.getOrder();
      }
    }catch(e){ result.orderCoreError = String(e); }

    // attempt a test addItem if orderCore exists; also auto-click first product card to trigger click-logger
    (async ()=>{
      try{
        if(window.allProducts && window.allProducts.length){
          // find first clickable card in DOM
          const firstCard = document.querySelector('.product-card');
          if(firstCard){
            try{ firstCard.click(); result.autoClicked = true; }catch(e){ result.autoClicked = false; result.autoClickError = String(e); }
          } else {
            result.autoClicked = false;
            result.autoClickNote = 'no .product-card element found';
          }
        }
      }catch(e){ result.autoClickError = String(e); }

      if(window.orderCore && typeof window.orderCore.addItem === 'function' && window.allProducts && window.allProducts.length){
        try{
          const p = window.allProducts[0];
          await window.orderCore.addItem({ id: p.menuId, menuId: p.menuId, price: p.price, name: p.name, userId: p.userId, image: p.image }, 1);
          result.addedTest = true;
          result.orderCoreAfter = window.orderCore.getOrder();
        }catch(e){ result.addedTestError = String(e); }
      }
      console.log('[SMOKETEST_RESULT]' + JSON.stringify(result));
    })();

  }catch(e){ console.error('[SMOKETEST_RUNTIME_ERROR]', e); }
})();
