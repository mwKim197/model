const { SerialPort } = require('serialport');
const log = require('../../logger'); // log 모듈 사용

class Serial {
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
            let data = {};
            if (response.startsWith('RD1')) {
                data = this.parseSerialDataRd1(response);
            } else if (response.startsWith('RD2')) {
                data = this.parseSerialDataRd2(response);
            } else if (response.startsWith('RD3')) {
                data = this.parseSerialDataRd3(response);
            } else if (response.startsWith('RD4')) {
                data = this.parseSerialDataRd4(response);
            }

            log.info('success data:', { data });
            this.latestData = data ;
        } catch (err) {
            log.error(`응답 처리 실패: ${err.message}`);
        }
    }

    // 응답 데이터 분석
    parseSerialDataRd1(response) {
        return {
            boilerTemperature: parseInt(response.slice(3, 6), 10),      // 보일러 온도
            boilerHeaterStatus: response[6] === '1' ? 'ON' : 'OFF',          // 히터 상태
            boilerFlowRate: parseInt(response.slice(7, 10), 10),        // 플로우미터1 유량
            boilerPumpStatus: response[10] === '1' ? 'ON' : 'OFF',           // 펌프 상태
            hotWaterSolValve1: response[11] === '1' ? 'ON' : 'OFF',          // 핫워터1 솔 밸브 상태
            hotWaterSolValve2: response[12] === '1' ? 'ON' : 'OFF',          // 핫워터2 솔 밸브 상태
            coffeeSolValve: response[13] === '1' ? 'ON' : 'OFF',             // 커피 솔 밸브 상태
            carbonationPressureSensor: response[14] === '1' ? 'ON' : 'OFF',  // 탄산수 압력센서
            carbonationFlowRate: parseInt(response.slice(17, 20), 10),  // 탄산수 플로우미터 유량
            extractionHeight: parseInt(response.slice(20, 23), 10),     // 추출기 상하 높이
            grinderMotor1: response[26] === '1' ? 'ON' : 'OFF',               // 그라인더 모터1
            grinderMotor2: response[27] === '1' ? 'ON' : 'OFF',               // 그라인더 모터2
            coffeeMode: this.getCoffeeMode(response[35]),                     // 커피 동작 상태
            cupSensor: response[37] === '1' ? '있음' : '없음',                  // 컵 센서
            waterAlarm: response[38] === '1' ? '물없음' : '정상',                // 물 없음 알람
            ledStatus: response[41] === '1' ? 'ON' : response[41] === '2' ? 'BLINK' : 'OFF' // LED 상태
        };
    }

    // 응답 데이터 분석
    parseSerialDataRd2(response) {
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

    // RD3 응답 데이터 분석
    parseSerialDataRd3(response) {
        return {
            // 핫워터 플로우 센서 카운터
            hotWaterFlowSensorCounter: parseInt(response.slice(3, 7), 10), // 1234 -> 13

            // CO2 플로우 센서 카운터
            co2FlowSensorCounter: parseInt(response.slice(7, 11), 10), // 5678 -> 43

            // 추출기 상하모터 엔코더 값
            extractorEncoderValue: parseInt(response.slice(11, 17), 10), // 9abcde -> 100

            // 보일러 온도 센서 상태
            boilerTemperatureSensor: response[17] === '1' ? '정상' : '센서 없음 알람',

            // CO2 온도 값
            co2Temperature: parseInt(response.slice(18, 22), 10), // ghij -> 3도

            // CO2 온도 센서 상태
            co2TemperatureSensor: response[22] === '1' ? '정상' : '센서 없음 알람',

            // 추출기 레버모터 동작 상태
            extractorLeverMotorStatus: response[23] === '1' ? 'ON' : 'OFF',

            // 추출기 상하모터 동작 상태
            extractorMotorStatus: response[24] === '1' ? 'ON' : 'OFF',

            // 슈트 상하모터 동작 상태
            chuteMotorStatus: response[25] === '1' ? 'ON' : 'OFF',

            // 추출기 자동운전 스텝번호
            extractionAutoStep: response.slice(26, 30),

            // 추출기 수동운전 스텝번호
            extractionManualStep: response.slice(30, 34),

            // 그라인더 자동운전 스텝번호
            grinderAutoStep: response.slice(34, 38),

            // 슈트 수동운전 스텝번호
            chuteManualStep: response.slice(38, 42),

            // 스팀 자동운전 스텝번호
            steamAutoStep: response.slice(42, 46),

            // 커피 자동운전 스텝번호
            coffeeAutoStep: response.slice(46, 50),

            // 가루차 자동운전 스텝번호
            powderTeaAutoStep: response.slice(50, 54),

            // 시럽 자동운전 스텝번호
            syrupAutoStep: response.slice(54, 58),

            // 세척 자동운전 스텝번호
            cleaningAutoStep: response.slice(58, 62),
        };
    }

    parseSerialDataRd4(response) {
        return {
            heaterStatus: response[2] === '1' ? 'ON' : 'OFF',  // 히터(보일러) S/W 동작상태
            chuteSensorStatus: response[3] === '1' ? 'ON' : 'OFF',  // 슈트 상승센서 동작상태
            spare1: response.slice(4, 6),  // spare 34
            spare2: response.slice(6, 9),  // spare 567
            spare3: response.slice(9, 12),  // spare 89a
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
                    log.error(`writeCommand error: ${err.message}`);
                    return reject(err);
                }
                log.info(`writeCommand success: ${command}`);

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

module.exports = Serial;
