(function(){
  try{
    const result = {images:[], modal:{}, orderCore: null, addedTest:false};

    // orderGrid의 이미지 수집
    const imgs = Array.from(document.querySelectorAll('#orderGrid img'));
    imgs.forEach(img=>{
      result.images.push({src: img.getAttribute('src'), naturalWidth: img.naturalWidth || 0, complete: img.complete, alt: img.alt});
      // 폴백(onerror) 핸들러 연결 보장
      img.onerror = function(){ this.onerror=null; this.src='../../assets/basicImage/white.png'; };
    });

    // modal image
    const modalImage = document.getElementById('modalImage');
    if(modalImage){
      result.modal.src = modalImage.getAttribute('src');
      result.modal.naturalWidth = modalImage.naturalWidth || 0;
      modalImage.onerror = function(){ this.onerror=null; this.src='../../assets/basicImage/white.png'; };
    }

    // 닫기 버튼 클릭 시뮬레이션 시도
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

    // orderCore 상태 스냅샷
    try{
      if(window.orderCore && typeof window.orderCore.getOrder === 'function'){
        result.orderCore = window.orderCore.getOrder();
      }
    }catch(e){ result.orderCoreError = String(e); }

    // orderCore가 존재하면 테스트용 addItem 호출 시도
    (async ()=>{
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