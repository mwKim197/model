const express = require('express');
const Serial = require('../connect/Serial'); // 새로 작성한 모듈 가져오기
const log = require('../../logger')
const appServer = express();
const http = require('http');
const server = http.createServer(appServer);
const { ipcRenderer } = require('electron');

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', { level, message });
}

sendLogToMain('info', '렌더러에서 보내는 정보 로그');
sendLogToMain('error', '렌더러 에러 발생');

// 페이지 이동 버튼
document.getElementById('goToIndex').addEventListener('click', () => {
    ipcRenderer.send('navigate-to-page', 'index'); // 'admin' 페이지로 이동
});
// 시리얼 통신 부
const cors = require('cors');
appServer.use(cors());

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

// 서버 시작
server.listen(3000, () => {
    log.info('server: http://localhost:3001');
});



async function fetchSerialDataRd1() {
    try {
        const response = await fetch('http://localhost:3001/serial-data-rd1');
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();
        console.log('server data:', data);

        // 화면에 데이터 업데이트
        document.getElementById('data').textContent                         = data;
        document.getElementById('boilerTemperature').textContent            = data.boilerTemperature; // 보일러 온도
        document.getElementById('boilerHeaterStatus').textContent           = data.boilerHeaterStatus; // 히터 상태
        document.getElementById('boilerFlowRate').textContent               = data.boilerFlowRate; // 플로우미터1 유량;
        document.getElementById('boilerPumpStatus').textContent             = data.boilerPumpStatus; // 펌프 상태
        document.getElementById('hotWaterSolValve1').textContent            = data.hotWaterSolValve1;
        document.getElementById('hotWaterSolValve2').textContent            = data.hotWaterSolValve2;
        document.getElementById('coffeeSolValve').textContent               = data.coffeeSolValve;
        document.getElementById('carbonationPressureSensor').textContent    = data.carbonationPressureSensor;
        document.getElementById('carbonationFlowRate').textContent          = data.carbonationFlowRate; // 탄산수 플로우미터 유량
        document.getElementById('extractionHeight').textContent             = data.extractionHeight; // 추출기 상하높이
        document.getElementById('grinderMotor1').textContent                = data.grinderMotor1; // 그라인더 모터1
        document.getElementById('grinderMotor2').textContent                = data.grinderMotor2;
        document.getElementById('coffeeMode').textContent                   = data.coffeeMode; // 커피 동작 상태
        document.getElementById('cupSensor').textContent                    = data.cupSensor; // 컵 센서
        document.getElementById('waterAlarm').textContent                   = data.waterAlarm; // 물 없음 알람
        document.getElementById('ledStatus').textContent                    = data.ledStatus; // LED 상태


    } catch (error) {
        console.error('데이터 가져오기 실패:', error);
    }
}

async function fetchSerialDataRd2() {
    try {
        const response = await fetch('http://localhost:3001/serial-data-rd2');
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();
        console.log('server data rd2:', data);

    } catch (error) {
        console.error('데이터 가져오기 실패:', error);
    }
}

async function fetchSerialDataRd3() {
    try {
        const response = await fetch('http://localhost:3001/serial-data-rd3');
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();
        console.log('server data rd3:', data);

    } catch (error) {
        console.error('데이터 가져오기 실패:', error);
    }
}

async function fetchSerialDataRd4() {
    try {
        const response = await fetch('http://localhost:3001/serial-data-rd4');
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();
        console.log('server data rd4:', data);

    } catch (error) {
        console.error('데이터 가져오기 실패:', error);
    }
}

async function fetchSerialRdData() {
    await fetchSerialDataRd1();
    await fetchSerialDataRd2();
    await fetchSerialDataRd3();
    await fetchSerialDataRd4();
}

// 1초마다 폴링
setInterval(fetchSerialRdData, 10000);
