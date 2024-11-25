const { app, BrowserWindow} = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const log = require('./logger');
const appServer = express();
const server = http.createServer(appServer);
const Connect = require('./connect/Connect');
const Order = require('./connect/Order');
const Ice = require('./connect/Ice');
const Cup = require('./connect/Cup');
const Serial = require('./connect/Serial'); // 새로 작성한 모듈 가져오기

// COM1 START
const serialCommCom1 = new Serial('COM1');
const serialCommCom3 = new Serial('COM3'); // COM3 포트 추가
const serialCommCom4 = new Serial('COM4'); // COM3 포트 추가

// Express 서버에서 serialComm을 각 포트에 맞게 사용하도록 설정
appServer.use((req, res, next) => {
    req.serialCommCom1 = serialCommCom1;  // COM1 포트를 사용하는 시리얼 통신 객체
    req.serialCommCom3 = serialCommCom3;  // COM3 포트를 사용하는 시리얼 통신 객체
    req.serialCommCom4 = serialCommCom4;  // COM4 포트를 사용하는 시리얼 통신 객체
    next();
});

// 시리얼 통신 부
const cors = require('cors');
appServer.use(cors());

// 정적 파일 제공
appServer.use(express.static('renderer'));
appServer.use(Connect); // 연결부
appServer.use(Order);   // 주문부
appServer.use(Ice);   // 주문부
appServer.use(Cup);   // 주문부

// COM1 END

// 서버 시작
server.listen(3000, () => {
    log.info('server: http://localhost:3000');
});

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

    win.loadFile(path.join(__dirname, 'renderer', 'index', 'index.html'));

    const { ipcMain } = require('electron');

// 페이지 변경 핸들러
    ipcMain.on('navigate-to-page', (event, pageName) => {
        const win = BrowserWindow.getFocusedWindow(); // 현재 활성화된 창
        win.loadFile(path.join(__dirname, 'renderer', pageName, `${pageName}.html`));
    });

    // IPC 로그 이벤트 처리
    ipcMain.on('log-to-main', (event, { level, message }) => {
        const timestamp = new Date().toISOString();

        switch (level) {
            case 'info':
                log.info(`[렌더러 프로세스] ${timestamp} - ${message}`);
                break;
            case 'warn':
                log.warn(`[렌더러 프로세스] ${timestamp} - ${message}`);
                break;
            case 'error':
                log.error(`[렌더러 프로세스] ${timestamp} - ${message}`);
                break;
            default:
                log.debug(`[렌더러 프로세스] ${timestamp} - ${message}`);
                break;
        }
    });

}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
