const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const http = require('http');
const { SerialPort } = require('serialport');
const logger = require('./logger');

const appServer = express();
const server = http.createServer(appServer);

// 랜더러에서 발생한 오류 로그 저장 -- 시작
const { ipcMain } = require('electron');
const log = require('electron-log');

ipcMain.on('log-to-main', (event, { level, message }) => {
    log[level](message); // 전달받은 레벨과 메시지로 로그 기록
});
// 랜더러에서 발생한 오류 로그 저장 -- 종료


// 시리얼 포트 설정
const port = new SerialPort({
    path: 'COM1',  // 포트 이름
    baudRate: 9600,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
   /* flowControl: false*/
});

// 명령을 전송하고 응답 데이터를 처리
function getSerialData() {
    return new Promise((resolve, reject) => {
        const command = 'RD1\x0d'; // RD1 명령과 CR 전송
        port.write(command, (err) => {

            if (err) {
                logger.error(`명령전송 오류: ${err.message}`);
                return reject(`명령 전송 오류: ${err.message}`);
            }

            // 포트에서 데이터가 들어오면 처리 (버퍼링)
            let serialBuffer = ''; // 데이터를 누적할 버퍼

            port.on('error', (err) => {

                logger.error(`시리얼 포트 에러: ${err.message}`);
            });

            port.on('data', (data) => {
                console.log('data : ' + data);
                serialBuffer += data.toString('ascii'); // 데이터 누적
                console.log('serialBuffer : ', serialBuffer);
                logger.info(`serialBuffer: ${serialBuffer}`);
                // 응답이 끝났는지 확인 (LF로 끝남)
                if (serialBuffer.endsWith('\x0a')) {
                    // 응답 데이터 분석
                    try {
                        const response = serialBuffer.trim(); // 불필요한 공백 제거
                        console.log('total response:', response);

                        // 형식 검증
                        if (response.length < 10 || !response.startsWith('RD')) {
                            throw new Error('error response');
                        }

                        // 데이터 추출
                        const data = response;
                        const 보일러온도 = parseInt(response[2] + response[3] + response[4], 10); // 보일러 온도
                        const 히터상태 = response[5] === '1' ? 'ON' : 'OFF'; // 히터 상태
                        const 유랑1 = parseInt(response[6] + response[7] + response[8], 10); // 유량1

                        console.log('success data:', { 보일러온도, 히터상태, 유랑1, data });

                        // 클라이언트로 데이터 전송 (REST API 요청에서 사용)
                        appServer.set('serialData', { 보일러온도, 히터상태, 유랑1, data});

                    } catch (error) {
                        console.error('error.message :', error.message);
                    } finally {
                        // 처리 후 버퍼 초기화
                        serialBuffer = '';
                    }
                }
            });
        });
    });
}

// 시리얼 데이터 요청용 HTTP 엔드포인트
appServer.get('/serial-data', async (req, res) => {
    try {
        const data = await getSerialData();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');  // UTF-8로 응답 설정
        res.json(data); // JSON 데이터 반환
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
