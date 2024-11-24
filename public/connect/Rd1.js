const { SerialPort } = require('serialport');
const log = require('../../logger'); // log 모듈 사용

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

            const data = this.parseSerialData(response);
            log.info('success data:', { data });
            this.latestData = data ;
        } catch (err) {
            log.error(`응답 처리 실패: ${err.message}`);
        }
    }

    // 응답 데이터 분석
    parseSerialData(response) {
        return {
            boilerTemperature: parseInt(response.slice(3, 6), 10), // 보일러 온도
            boilerHeaterStatus: response[6] === '1' ? 'ON' : 'OFF', // 히터 상태
            boilerFlowRate: parseInt(response.slice(7, 10), 10), // 플로우미터1 유량
            boilerPumpStatus: response[10] === '1' ? 'ON' : 'OFF', // 펌프 상태
            hotWaterSolValve1: response[11] === '1' ? 'ON' : 'OFF',
            hotWaterSolValve2: response[12] === '1' ? 'ON' : 'OFF',
            coffeeSolValve: response[13] === '1' ? 'ON' : 'OFF',
            carbonationPressureSensor: response[14] === '1' ? 'ON' : 'OFF',
            carbonationFlowRate: parseInt(response.slice(17, 20), 10), // 탄산수 플로우미터 유량
            extractionHeight: parseInt(response.slice(20, 23), 10), // 추출기 상하높이
            grinderMotor1: response[26] === '1' ? 'ON' : 'OFF', // 그라인더 모터1
            grinderMotor2: response[27] === '1' ? 'ON' : 'OFF',
            coffeeMode: this.getCoffeeMode(response[35]), // 커피 동작 상태
            cupSensor: response[37] === '1' ? '있음' : '없음', // 컵 센서
            waterAlarm: response[38] === '1' ? '물없음' : '정상', // 물 없음 알람
            ledStatus: response[41] === '1' ? 'ON' : response[41] === '2' ? 'BLINK' : 'OFF', // LED 상태
        };
    }

// 커피 동작 상태 변환
     getCoffeeMode(value) {
        switch (value) {
            case '1':
                return '커피 동작중';
            case '2':
                return '가루차 동작중';
            case '3':
                return '시럽 동작중';
            case '4':
                return '세척중';
            default:
                return '정지';
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
