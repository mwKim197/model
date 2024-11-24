const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const log = require('./logger');
const appServer = express();
const server = http.createServer(appServer);


// 정적 파일 제공
appServer.use(express.static('public'));

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

    win.loadFile(path.join(__dirname, 'public', 'index', 'index.html'));

}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
