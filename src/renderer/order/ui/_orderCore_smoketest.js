(function(){
  const outPath = '/tmp/orderCore_smoketest.log';
  function log(...args){
    try{ require('fs').appendFileSync(outPath, args.map(a=>typeof a==='object'?JSON.stringify(a):String(a)).join(' ')+'\n'); }catch(e){}
    console.log(...args);
  }

  log('--- orderCore smoketest start ---', new Date().toISOString());
  try{
    log('typeof window.orderCore ->', typeof window.orderCore);
    if(!window.orderCore){ log('orderCore missing'); return; }

    const o1 = window.orderCore.createOrder();
    log('createOrder ->', o1);

    const added = window.orderCore.addItem({ id:'smoke-1', name:'Smoke Test Item', price:2500 }, 2);
    log('after addItem ->', added);

    const orderNow = window.orderCore.getOrder();
    log('getOrder ->', orderNow);

    const unbind = window.orderCore.onChange((e)=>{
      log('onChange fired ->', e && e.detail ? e.detail : e);
    });

    // trigger change
    window.orderCore.addItem({ id:'smoke-2', name:'Smoke2', price:1500 }, 1);
    window.orderCore.removeItem('smoke-1', 1);

    // try payment (expected to fail if adapter missing)
    window.orderCore.startPayment('card', { amount: orderNow.total }).then(r=>{
      log('startPayment ok ->', r);
    }).catch(err=>{
      log('startPayment err ->', err && err.message ? err.message : String(err));
    }).finally(()=>{
      log('--- orderCore smoketest end ---', new Date().toISOString());
      try{ if(typeof unbind==='function') unbind(); }catch(e){}
    });
  }catch(err){
    log('smoketest exception ->', err && err.stack?err.stack:err);
  }
})();
