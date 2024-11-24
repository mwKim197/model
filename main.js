const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const Serial = require('./public/connect/Serial'); // 새로 작성한 모듈 가져오기
const log = require('./logger');

const appServer = express();
const server = http.createServer(appServer);

// 시리얼 통신 인스턴스 생성
const serialComm = new Serial('COM1');
// HTTP 엔드포인트 설정 RD1 호출
appServer.get('/serial-data-rd1', async (req, res) => {
    try {
        const data = await serialComm.writeCommand('RD1\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

// HTTP 엔드포인트 설정 RD2 호출
appServer.get('/serial-data-rd2', async (req, res) => {
    try {
        const data = await serialComm.writeCommand('RD2\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

// HTTP 엔드포인트 설정 RD3 호출
appServer.get('/serial-data-rd3', async (req, res) => {
    try {
        const data = await serialComm.writeCommand('RD3\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

// HTTP 엔드포인트 설정 RD2 호출
appServer.get('/serial-data-rd4', async (req, res) => {
    try {
        const data = await serialComm.writeCommand('RD4\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

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
            contextIsolation: false,
        },
    });

    win.loadFile(path.join(__dirname, 'public', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
