const log = require('../logger');

class serialDataManager {
    constructor(serialComm, interval = 10000) {
        if (serialDataManager.instance) {
            return serialDataManager.instance;
        }
        this.serialComm = serialComm;
        this.interval = interval;
        this.serialData = {};
        this.pollingTimer = null;
        this.isPollingActive = false;

        serialDataManager.instance = this;
    }

    // 데이터 갱신 함수
    async updateSerialData(command, key) {
        try {
            this.serialData[key] = await this.serialComm.writeCommand(`${command}\x0d`); // 데이터 저장
        } catch (err) {
            log.error(`Error updating ${key}: ${err.message}`);
        }
    }

    // 데이터 조회 시작 함수 (수정된 async/await 방식)
    async startPolling() {
        if (this.pollingTimer) {
            log.warn('폴링이 이미 동작중입니다.');
            return;
        }

        this.isPollingActive = true;
        this.pollingTimer = setInterval(async () => {
            try {
                if (!this.isPollingActive) {
                    log.info('폴링 일시 중지.');
                    return;
                }

                await this.updateSerialData('RD1', 'RD1');
                await this.updateSerialData('RD2', 'RD2');
                await this.updateSerialData('RD3', 'RD3');
                await this.updateSerialData('RD4', 'RD4');
            } catch (error) {
                log.error('폴링 실행 중 오류 발생:', error);
                clearInterval(this.pollingTimer); // 에러 발생 시 타이머 정지
                this.pollingTimer = null;
                this.isPollingActive = false;
            }
        }, this.interval);
    }
    // 데이터 조회 정지 함수
    async stopPolling() {
        log.info(`폴링 정지... Timer: ${this.pollingTimer}, Active: ${this.isPollingActive}`);

        if (this.isPollingActive) {
            this.isPollingActive = false;
            if (this.pollingTimer) {
                clearInterval(this.pollingTimer);
                this.pollingTimer = null;
            }
            log.info('폴링조회 정지완료.');
        } else {
            log.warn('폴링조회 중이 아님.');
        }

        log.info(`폴링 중지 : Timer: ${this.pollingTimer}, Active: ${this.isPollingActive}`);
    }

    // 데이터 반환 함수
    getSerialData(key) {
        return key ? this.serialData[key] : this.serialData;
    }
}

// 클래스 내보내기 (default export)
module.exports = serialDataManager;
