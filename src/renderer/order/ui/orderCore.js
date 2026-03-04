// orderCore.js - lightweight order state manager and payment bridge
(function(){
  if(window.orderCore) return; // already registered

  const state = { items: [], status: idle };

  function computeTotal(){
    return state.items.reduce((s,i)=> s + (Number(i.price||0) * Number(i.qty||1)), 0);
  }

  function createOrder(initialItems){
    state.items = Array.isArray(initialItems)? initialItems.slice():[];
    state.status = idle;
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
    state.items = []; state.status=idle; emitChange(); return getOrder();
  }

  function getOrder(){
    return { items: state.items.map(i=>Object.assign({},i)), total: computeTotal(), status: state.status }
  }

  function onChange(cb){
    window.addEventListener(order-core-change, cb);
    return ()=>window.removeEventListener(order-core-change, cb);
  }

  function emitChange(){
    const detail = getOrder();
    try{ window.dispatchEvent(new CustomEvent(order-core-change,{ detail })); }catch(e){ console.warn(orderCore:
