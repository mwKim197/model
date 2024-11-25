const { app, BrowserWindow} = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const log = require('./logger');
const appServer = express();
const server = http.createServer(appServer);
const Connect = require('./connect/Connect');
const Order = require('./connect/Order');
const Serial = require('./connect/Serial'); // 새로 작성한 모듈 가져오기

// COM1 START
const serialCommCom1 = new Serial('COM1');

appServer.use((req, res, next) => {
    req.serialComm = serialCommCom1;  // serialComm을 모든 요청에 주입
    next();
});

// 시리얼 통신 부
const cors = require('cors');
appServer.use(cors());

// 정적 파일 제공
appServer.use(express.static('renderer'));
appServer.use(Connect);
appServer.use(Order);
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
