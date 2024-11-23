const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const SerialComm = require('./public/connect/connect'); // 시리얼 통신 모듈 가져오기

const appServer = express();
const server = http.createServer(appServer);

const serialComm = new SerialComm('COM1'); // COM1 포트에 연결

// 시리얼 데이터 요청용 HTTP 엔드포인트
appServer.get('/serial-data', async (req, res) => {
    try {
        await serialComm.writeCommand('RD1\x0d'); // 명령 전송
        const data = await serialComm.readData();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');  // UTF-8로 응답 설정
        res.json(data); // JSON 데이터 반환
        console.log("res" + JSON.stringify(res));
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
});

// 정적 파일 제공 (HTML, JavaScript 등)
appServer.use(express.static('public'));

// 서버 시작
server.listen(3000, () => {
    console.log('server: http://localhost:3000');
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
