// serialComm.js
const { SerialPort } = require('serialport');
const log = require('../../logger'); // log 모듈 사용
log.info("log ::::111111");
class Rd1 {
    constructor(portPath, baudRate = 9600) {
        this.serialBuffer = '';
        this.port = new SerialPort({
            path: portPath,
            baudRate,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
        });

        this.port.on('error', (err) => {
            log.error(`serialport error: ${err.message}`);
        });

        this.port.on('data', (data) => this._onDataReceived(data));
    }

    // 내부적으로 데이터를 처리하는 메서드
    _onDataReceived(data) {
        this.serialBuffer += data.toString('ascii'); // 데이터 누적
        log.info(`serialBuffer: ${this.serialBuffer}`);

        if (this.serialBuffer.endsWith('\x0a')) {
            this._processResponse();
            this.serialBuffer = ''; // 버퍼 초기화
        }
    }

    // 응답 데이터 처리
    _processResponse() {
        const response = this.serialBuffer.trim();

        try {
            if (response.length < 10 || !response.startsWith('RD')) {
                throw new Error('error response');
            }

            const data = response;
            const boilerTemp = parseInt(response[2] + response[3] + response[4], 10); // 보일러 온도
            const heaterStatus = response[5] === '1' ? 'ON' : 'OFF'; // 히터 상태
            const flowRate1 = parseInt(response[6] + response[7] + response[8], 10); // 유량1

            log.info('success data:', { boilerTemp, heaterStatus, flowRate1, data });

            this.latestData = { boilerTemp, heaterStatus, flowRate1, data };
        } catch (err) {
            log.error(`응답 처리 실패: ${err.message}`);
        }
    }

    // 명령 전송 및 데이터 반환
    writeCommand(command) {
        return new Promise((resolve, reject) => {
            this.port.write(command, (err) => {
                if (err) {
                    log.error(`명령 전송 오류: ${err.message}`);
                    return reject(err);
                }
                log.info(`명령 전송 성공: ${command}`);

                // 일정 시간 후 데이터를 반환
                setTimeout(() => {
                    if (this.latestData) {
                        resolve(this.latestData);
                    } else {
                        reject(new Error('응답 없음'));
                    }
                }, 1000); // 1초 대기 (환경에 따라 조정 가능)
            });
        });
    }
}

module.exports = Rd1;
