const path = require('path');
const log = require('../../logger');

const { ipcRenderer } = require('electron');

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', { level, message });
}

sendLogToMain('info', '렌더러에서 보내는 정보 로그');
sendLogToMain('error', '렌더러 에러 발생');

// 페이지 이동 버튼
document.getElementById('goToAdmin').addEventListener('click', () => {
    ipcRenderer.send('navigate-to-page', 'admin'); // 'admin' 페이지로 이동
});

document.getElementById('sendCoffeeSetting').addEventListener('click', () => {
    fetchCoffeeInfo("045","045","100","0");
});


const fetchCoffeeInfo = async (grinder1, grinder2, extraction, hotwater) => {
    const response = await fetch(`http://localhost:3000/serial-order-coffee-info/${grinder1}/${grinder2}/${extraction}/${hotwater}`);
    const data = await response.json();
    log.info(data);
}


