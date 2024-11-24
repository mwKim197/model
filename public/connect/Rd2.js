const { SerialPort } = require('serialport');
const log = require('../../logger'); // log 모듈 사용

class Rd2 {
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
            powderTeaFeedingMotor1: response[1] === '1' ? 'ON' : 'OFF', // 가루차1 피딩모터
            hotWaterSolValve1_1: response[2] === '1' ? 'ON' : 'OFF',  // 핫워터1 솔1 밸브
            powderTeaMixingMotor1: response[3] === '1' ? 'ON' : 'OFF', // 가루차1 믹싱모터
            hotWaterSolValve1_2: response[4] === '1' ? 'ON' : 'OFF',  // 핫워터1 솔2 밸브
            syrupPumpMotor1: response[5] === '1' ? 'ON' : 'OFF', // 시럽1 펌프모터

            powderTeaFeedingMotor2: response[6] === '1' ? 'ON' : 'OFF', // 가루차2 피딩모터
            hotWaterSolValve2_1: response[7] === '1' ? 'ON' : 'OFF',  // 핫워터2 솔1 밸브
            powderTeaMixingMotor2: response[8] === '1' ? 'ON' : 'OFF', // 가루차2 믹싱모터
            hotWaterSolValve2_2: response[9] === '1' ? 'ON' : 'OFF',  // 핫워터2 솔2 밸브
            syrupPumpMotor2: response[10] === '1' ? 'ON' : 'OFF', // 시럽2 펌프모터

            powderTeaFeedingMotor3: response[11] === '1' ? 'ON' : 'OFF', // 가루차3 피딩모터
            hotWaterSolValve3_1: response[12] === '1' ? 'ON' : 'OFF',  // 핫워터3 솔1 밸브
            powderTeaMixingMotor3: response[13] === '1' ? 'ON' : 'OFF', // 가루차3 믹싱모터
            hotWaterSolValve3_2: response[14] === '1' ? 'ON' : 'OFF',  // 핫워터3 솔2 밸브
            syrupPumpMotor3: response[15] === '1' ? 'ON' : 'OFF', // 시럽3 펌프모터

            powderTeaFeedingMotor4: response[16] === '1' ? 'ON' : 'OFF', // 가루차4 피딩모터
            hotWaterSolValve4_1: response[17] === '1' ? 'ON' : 'OFF',  // 핫워터4 솔1 밸브
            powderTeaMixingMotor4: response[18] === '1' ? 'ON' : 'OFF', // 가루차4 믹싱모터
            hotWaterSolValve4_2: response[19] === '1' ? 'ON' : 'OFF',  // 핫워터4 솔2 밸브
            syrupPumpMotor4: response[20] === '1' ? 'ON' : 'OFF', // 시럽4 펌프모터

            powderTeaFeedingMotor5: response[21] === '1' ? 'ON' : 'OFF', // 가루차5 피딩모터
            hotWaterSolValve5_1: response[22] === '1' ? 'ON' : 'OFF',  // 핫워터5 솔1 밸브
            powderTeaMixingMotor5: response[23] === '1' ? 'ON' : 'OFF', // 가루차5 믹싱모터
            hotWaterSolValve5_2: response[24] === '1' ? 'ON' : 'OFF',  // 핫워터5 솔2 밸브
            syrupPumpMotor5: response[25] === '1' ? 'ON' : 'OFF', // 시럽5 펌프모터

            powderTeaFeedingMotor6: response[26] === '1' ? 'ON' : 'OFF', // 가루차6 피딩모터
            hotWaterSolValve6_1: response[27] === '1' ? 'ON' : 'OFF',  // 핫워터6 솔1 밸브
            powderTeaMixingMotor6: response[28] === '1' ? 'ON' : 'OFF', // 가루차6 믹싱모터
            hotWaterSolValve6_2: response[29] === '1' ? 'ON' : 'OFF',  // 핫워터6 솔2 밸브
            syrupPumpMotor6: response[30] === '1' ? 'ON' : 'OFF', // 시럽6 펌프모터

            acOutputSpareStatus: response[31] === '1' ? 'ON' : 'OFF', // AC 출력 스페어
        };
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

module.exports = Rd2;
