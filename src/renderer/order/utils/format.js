// Utilities: date/time formatting helpers
(function(global){
  function formatDate(yyMMddHHmmss) {
    if (!yyMMddHHmmss || yyMMddHHmmss.length !== 12) return "";
    const year = "20" + yyMMddHHmmss.slice(0, 2);
    const month = yyMMddHHmmss.slice(2, 4);
    const day = yyMMddHHmmss.slice(4, 6);
    const hour = yyMMddHHmmss.slice(6, 8);
    const minute = yyMMddHHmmss.slice(8, 10);
    const second = yyMMddHHmmss.slice(10, 12);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  function getCurrentFormattedTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // expose
  global.orderFormat = global.orderFormat || {};
  global.orderFormat.formatDate = formatDate;
  global.orderFormat.getCurrentFormattedTime = getCurrentFormattedTime;
})(window);
