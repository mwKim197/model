const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const log = require('./logger');
const appServer = express();
const server = http.createServer(appServer);
const Connect = require('./public/connect/Connect'); // serial 모듈
const Order = require('./public/connect/Order'); // serial 모듈


// 정적 파일 제공
appServer.use(express.static('public'));
appServer.use(Connect);
appServer.use(Order);
// 서버 시작
server.listen(3000, () => {
    log.info('server: http://localhost:3000');
});

async function fetchSerialDataOrderCoffeInfo() {
    try {
        const response = await fetch('http://localhost:3000/serial-order-coffee-info');
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();
        console.log('server data serial-order-coffee-info:', data);

    } catch (error) {
        console.error('데이터 가져오기 실패:', error);
    }
}
setInterval(fetchSerialDataOrderCoffeInfo, 10000);
// Electron 창 설정
function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    win.loadFile(path.join(__dirname, 'public', 'index', 'index.html'));

    const { ipcMain } = require('electron');

// 페이지 변경 핸들러
    ipcMain.on('navigate-to-page', (event, pageName) => {
        const win = BrowserWindow.getFocusedWindow(); // 현재 활성화된 창
        win.loadFile(path.join(__dirname, 'public', pageName, `${pageName}.html`));
    });

}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
