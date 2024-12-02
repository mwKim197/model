/**
 * 기기정보를 주기적으로 조회하는 로직
 * */
const log = require('../logger');

let serialData = {}; // 데이터를 저장할 객체
let pollingTimer = null; // setInterval의 타이머 ID를 저장
let isPollingActive = false; // 조회 활성화 여부

// 데이터 갱신 함수
async function updateSerialData(serialComm, command, key) {
    try {
        const data = await serialComm.writeCommand(`${command}\x0d`);
        serialData[key] = data; // 데이터 저장
        log.info(`Updated ${key}:`, data);
    } catch (err) {
        log.error(`Error updating ${key}: ${err.message}`);
    }
}

// 데이터 조회 시작 함수
function startPolling(serialComm, interval = 10000) {
    if (pollingTimer) {
        log.warn('Polling is already running.');
        return;
    }

    isPollingActive = true;
    pollingTimer = setInterval(() => {
        if (!isPollingActive) {
            log.info('Polling paused.');
            return;
        }

        updateSerialData(serialComm, 'RD1', 'RD1');
        updateSerialData(serialComm, 'RD2', 'RD2');
        updateSerialData(serialComm, 'RD3', 'RD3');
        updateSerialData(serialComm, 'RD4', 'RD4');
    }, interval);

    log.info('Started polling for serial data.');
}

// 데이터 조회 정지 함수
function stopPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
        isPollingActive = false;
        log.info('Stopped polling for serial data.');
    } else {
        log.warn('Polling is not running.');
    }
}

// 데이터 반환 함수
function getSerialData(key) {
    return key ? serialData[key] : serialData;
}

module.exports = {
    startPolling,
    stopPolling,
    getSerialData,
};

