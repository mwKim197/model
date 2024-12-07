const log = require('../logger');

class serialDataManager {
    constructor(serialComm, interval = 10000) {
        this.serialComm = serialComm;
        this.interval = interval;
        this.serialData = {};
        this.pollingTimer = null;
        this.isPollingActive = false;
    }

    // 데이터 갱신 함수
    async updateSerialData(command, key) {
        try {
            this.serialData[key] = await this.serialComm.writeCommand(`${command}\x0d`); // 데이터 저장
            log.info(`Data updated for ${key}:`, this.serialData[key]);
        } catch (err) {
            log.error(`Error updating ${key}: ${err.message}`);
        }
    }

    // 데이터 조회 시작 함수 (수정된 async/await 방식)
    async startPolling() {
        if (this.pollingTimer) {
            log.warn('Polling is already running.');
            return;
        }

        this.isPollingActive = true;
        this.pollingTimer = setInterval(async () => {
            if (!this.isPollingActive) {
                log.info('Polling paused.');
                return;
            }

            // 비동기 처리를 순차적으로 실행
            await this.updateSerialData('RD1', 'RD1');
            await this.updateSerialData('RD2', 'RD2');
            await this.updateSerialData('RD3', 'RD3');
            await this.updateSerialData('RD4', 'RD4');
        }, this.interval);

        log.info('Started polling for serial data.');
    }
    // 데이터 조회 정지 함수
    stopPolling() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
            this.isPollingActive = false;
            log.info('Stopped polling for serial data.');
        } else {
            log.warn('Polling is not running.');
        }
    }

    // 데이터 반환 함수
    getSerialData(key) {
        return key ? this.serialData[key] : this.serialData;
    }
}

// 클래스 내보내기 (default export)
module.exports = serialDataManager;
