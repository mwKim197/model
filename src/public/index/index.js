const path = require('path');
const log = require('../../logger');

// 버튼 클릭 시 admin 페이지로 이동
document.getElementById('goToAdmin').addEventListener('click', () => {
    window.location.href = '../admin/admin.html';  // 상대 경로로 이동
});
