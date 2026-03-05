// payment.js - compatibility bridge for extracting payment logic
// This module exposes window.orderPayment with helper methods.
// Initially proxy to existing functions in order.js if present.
(function(){
  const ensure = () => {
    if (!window.orderPayment) window.orderPayment = {};
  };

  ensure();

  window.orderPayment.startTotalPayment = async (data) => {
    if (typeof window.totalPayment === 'function') {
      return await window.totalPayment(data);
    }
    throw new Error('totalPayment not available');
  };

  window.orderPayment.cardPayment = async (orderAmount, discountAmount) => {
    if (typeof window.cardPayment === 'function') {
      return await window.cardPayment(orderAmount, discountAmount);
    }
    throw new Error('cardPayment not available');
  };

  window.orderPayment.barcodePayment = async (orderAmount, discountAmount) => {
    if (typeof window.barcodePayment === 'function') {
      return await window.barcodePayment(orderAmount, discountAmount);
    }
    throw new Error('barcodePayment not available');
  };

  window.orderPayment.pointPayment = async (orderAmount) => {
    if (typeof window.pointPayment === 'function') {
      return await window.pointPayment(orderAmount);
    }
    throw new Error('pointPayment not available');
  };

  // expose paymentSession if present
  Object.defineProperty(window.orderPayment, 'session', {
    get() { return window.paymentSession; },
    enumerable: true,
  });

})();
