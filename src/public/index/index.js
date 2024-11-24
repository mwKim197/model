const path = require('path');
const log = require('../../logger');

const { ipcRenderer } = require('electron');

// 페이지 이동 버튼
document.getElementById('goToAdmin').addEventListener('click', () => {
    ipcRenderer.send('navigate-to-page', 'admin'); // 'admin' 페이지로 이동
});