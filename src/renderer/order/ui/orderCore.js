// orderCore.js - lightweight order state manager and payment bridge
(function(){
  if(window.orderCore) return; // already registered

  const IDLE = 'idle';
  const state = { items: [], status: IDLE };
  const EVENT_NAME = 'order-core-change';

  function computeTotal(){
    return state.items.reduce((s,i)=> s + (Number(i.price||0) * Number(i.qty||1)), 0);
  }

  function createOrder(initialItems){
    state.items = Array.isArray(initialItems)? initialItems.slice():[];
    state.status = IDLE;
    emitChange();
    return getOrder();
  }

  function addItem(item, qty=1){
    const existing = state.items.find(i=>i.id===item.id || i.menuId===item.menuId || i.menuId===item.id);
    if(existing){
      existing.qty = Number(existing.qty||0) + Number(qty);
    } else {
      state.items.push(Object.assign({}, item, { qty }));
    }
    emitChange();
    return getOrder();
  }

  function removeItem(id, qty=0){
    const idx = state.items.findIndex(i=>i.id===id || i.menuId===id);
    if(idx===-1) return getOrder();
    if(qty<=0) { state.items.splice(idx,1); } else {
      state.items[idx].qty = Math.max(0, Number(state.items[idx].qty||0) - Number(qty));
      if(Number(state.items[idx].qty)===0) state.items.splice(idx,1);
    }
    emitChange();
    return getOrder();
  }

  function clearOrder(){
    state.items = []; state.status=IDLE; emitChange(); return getOrder();
  }

  function getOrder(){
    return { items: state.items.map(i=>Object.assign({},i)), total: computeTotal(), status: state.status }
  }

  function onChange(cb){
    window.addEventListener(EVENT_NAME, cb);
    return ()=>window.removeEventListener(EVENT_NAME, cb);
  }

  function emitChange(){
    const detail = getOrder();
    try{
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    }catch(e){
      console.warn('orderCore: emitChange failed', e);
    }
  }

  // payment bridge: attempts to call available payment adapters and returns a Promise
  function startPayment(method, opts){
    // method: string like 'card' | 'cash'
    // opts: { order, amount, metadata }
    return new Promise(async (resolve, reject)=>{
      try{
        const payload = Object.assign({}, opts || {}, { order: getOrder() });
        if(window.cardPayment && typeof window.cardPayment.process === 'function'){
          const res = await Promise.resolve(window.cardPayment.process(method, payload));
          resolve(res);
          return;
        }
        if(window.electronAPI && typeof window.electronAPI.reqVcatHttp === 'function'){
          const res = await window.electronAPI.reqVcatHttp('/payments/process', payload);
          resolve(res);
          return;
        }
        reject(new Error('No payment adapter available'));
      }catch(err){
        reject(err);
      }
    });
  }

  // expose API
  window.orderCore = {
    createOrder,
    addItem,
    removeItem,
    clearOrder,
    getOrder,
    onChange,
    startPayment
  };

})();
