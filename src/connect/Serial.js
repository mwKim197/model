const { SerialPort } = require('serialport');
const log = require('../logger'); // log 모듈 사용

class Serial {
    constructor(portPath, baudRate = 9600, maxRetries = 5, retryDelay = 1000) {
        this.hexBuffer = '';
        this.asciiBuffer = '';
        this.maxRetries = maxRetries; // 최대 재시도 횟수
        this.retryDelay = retryDelay; // 재시도 간격 (밀리초)
        this.retryCount = 0; // 현재 재시도 횟수
        this._openPort(portPath, baudRate); // 포트 열기 시도
    }

    // 포트를 여는 함수
    _openPort(portPath, baudRate) {
        this.port = new SerialPort({
            path: portPath,
            baudRate,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
        });

        this.port.on('open', () => {
            log.info(`Serial port opened successfully on path: ${portPath}`);
            this.retryCount = 0; // 포트가 성공적으로 열리면 재시도 횟수 초기화
        });

        this.port.on('error', (err) => {
            log.error(`serial port error: ${err.message}`);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                log.info(`Retrying to open the port... Attempt ${this.retryCount}`);
                setTimeout(() => {
                    this._openPort(portPath, baudRate); // 재시도
                }, this.retryDelay);
            } else {
                log.error('Max retry attempts reached. Could not open the serial port.');
            }
        });

        this.port.on('data', (data) => {
            console.log('Received Raw Data:', data.toString('hex')); // 데이터 로그
            console.log('Received ASCII Data:', data.toString('ascii')); // ASCII로 출력
        });

        // 데이터 수신 이벤트 처리
        this.port.on('data', (data) => this._onDataReceived(data));
    }

    // Hex 데이터 여부 판별
// 데이터 리시브
    _onDataReceived(data) {
        // 수신된 데이터를 hexBuffer에 누적
        // 수신된 데이터를 HEX 문자열로 누적
        this.hexBuffer += data.toString('hex');

        // 문자열이 올바른 HEX 형식일 경우 Buffer로 변환
        const hexBuffer = Buffer.from(this.hexBuffer, 'hex');
        // HEX 패킷 처리
        while (this._isHexComplete(hexBuffer)) {
            const hexPacket = this.hexBuffer.slice(0, 14); // HEX 패킷 길이에 맞게 추출
            this._processHexData(Buffer.from(hexPacket, 'hex')); // 패킷 처리
            this.hexBuffer = this.hexBuffer.slice(14); // 사용한 패킷 제거
        }

        // ASCII 패킷 처리
        this.asciiBuffer += data.toString('ascii'); // ASCII 형식으로 누적
        log.info(`asciiBuffer: ${this.asciiBuffer}`);

        // ASCII 데이터 처리
        while (this.asciiBuffer.includes('\n')) {
            const newlineIndex = this.asciiBuffer.indexOf('\n');
            const asciiPacket = this.asciiBuffer.slice(0, newlineIndex + 1).trim(); // 줄 단위로 추출
            this._processAsciiData(asciiPacket); // ASCII 처리
            this.asciiBuffer = this.asciiBuffer.slice(newlineIndex + 1); // 사용한 데이터 제거
        }
    }
    
    // Hex 데이터 검증
    _isHexComplete(hexBuffer) {
        // 최소 패킷 길이 확인 (STX + ID + Length + Command + Data + CRC + ETX)
        if (hexBuffer.length < 7) {
            console.log('Invalid packet: Length is too short');
            return false; // 최소 길이를 충족하지 않으면 패킷이 완전하지 않음
        }

        // STX와 ETX 확인
        const stx = hexBuffer[0]; // 첫 번째 바이트 (STX)
        const etx = hexBuffer[hexBuffer.length - 1]; // 마지막 바이트 (ETX)
        if (stx !== 0x02 || etx !== 0x03) {
            console.log('Invalid packet: Missing STX or ETX');
            return false; // STX와 ETX가 없으면 패킷이 유효하지 않음
        }

        // Length 필드 확인
        // 수신된 데이터(hexBuffer) 출력
        console.log("hexBuffer:", hexBuffer.toString('hex'));

        // Length 필드 확인
        const length = hexBuffer[2]; // 세 번째 바이트가 Length
        console.log("Length field:", length); // Length 필드 값 출력

        // 패킷 길이 계산
        const expectedLength = length + 2; // Length 필드 값 + STX(1바이트) + ETX(1바이트)
        console.log("Expected packet length:", expectedLength);
        console.log("Actual hexBuffer length:", hexBuffer.length);

        // 길이 비교
        if (hexBuffer.length !== expectedLength) {
            console.log('Invalid packet: Length mismatch');
            return false; // 실제 길이와 Length 필드 값이 다르면 패킷 불완전
        }

        // CRC 확인 (선택 사항)
        const id = hexBuffer[1]; // 두 번째 바이트가 ID
        const cmd = hexBuffer[3]; // 네 번째 바이트가 Command
        const data = hexBuffer[4]; // 다섯 번째 바이트가 Data
        const crc = hexBuffer[5]; // 여섯 번째 바이트가 CRC

        // CRC 계산 (XOR)
        const calculatedCrc = id ^ length ^ cmd ^ data;

        if (crc !== calculatedCrc) {
            console.log('Invalid packet: CRC mismatch');
            return false; // CRC 검증 실패
        }

        return true; // 모든 조건 충족 시 패킷 완전
    }

    // Hex 데이터 처리
    _processHexData(data) {
        try {
            const hexString = data.toString('hex'); // Hex로 변환
            log.info(`Processing Hex Data: ${hexString}`);
            // Hex 데이터 분석 로직 추가
            this.latestData = this.parseHexData(hexString);
        } catch (err) {
            log.error(`Hex 데이터 처리 실패: ${err.message}`);
        }
    }

    // Hex 데이터 분석 메서드
    parseHexData(hexString) {
        // 예: 특정 프로토콜에 따라 데이터 파싱
        return {
            field1: parseInt(hexString.slice(0, 4), 16), // 예: 16진수 -> 정수 변환
            field2: hexString.slice(4, 8),              // 예: Hex 문자열로 유지
        };
    }

    // ascii 응답데이터 처리
    _processAsciiData(asciiPacket) {
        log.info(`Processing ASCII data: ${asciiPacket}`);

        // ASCII 데이터 추가 처리 로직
        if (asciiPacket.match(/^[a-zA-Z0-9\s]*$/)) {

            const asciiPacket = this.asciiBuffer.trim();

            try {
                // response data 사이즈가 다를수있다.
                if (asciiPacket.length < 1) {
                    throw new Error('error response');
                }
                let data;
                if (asciiPacket.startsWith('RD1')) {
                    data = this.parseSerialDataRd1(asciiPacket);
                } else if (asciiPacket.startsWith('RD2')) {
                    data = this.parseSerialDataRd2(asciiPacket);
                } else if (asciiPacket.startsWith('RD3')) {
                    data = this.parseSerialDataRd3(asciiPacket);
                } else if (asciiPacket.startsWith('RD4')) {
                    data = this.parseSerialDataRd4(asciiPacket);
                } else {
                    data= asciiPacket;
                }
                this.latestData = data ;
            } catch (err) {
                log.error(`응답 처리 실패: ${err.message}`);
            }
            
        } else {
            log.warn(`Unexpected ASCII data: ${asciiPacket}`);
        }
    }


    // 응답 데이터 분석
    parseSerialDataRd1(response) {
        return {
            boilerTemperature: parseInt(response.slice(3, 6), 10),       // 보일러 온도
            boilerHeaterStatus: response[6] === '1' ? 'ON' : 'OFF',           // 히터 상태
            boilerFlowRate: parseInt(response.slice(7, 10), 10),         // 플로우미터1 유량
            boilerPumpStatus: response[10] === '1' ? 'ON' : 'OFF',            // 펌프 상태
            hotWaterSolValve1: response[11] === '1' ? 'ON' : 'OFF',           // 핫워터1 솔 밸브 상태
            hotWaterSolValve2: response[12] === '1' ? 'ON' : 'OFF',           // 핫워터2 솔 밸브 상태
            coffeeSolValve: response[13] === '1' ? 'ON' : 'OFF',              // 커피 솔 밸브 상태
            carbonationPressureSensor: response[14] === '1' ? 'ON' : 'OFF',   // 탄산수 압력센서
            carbonationFlowRate: parseInt(response.slice(17, 20), 10),   // 탄산수 플로우미터 유량
            extractionHeight: parseInt(response.slice(20, 23), 10),      // 추출기 상하 높이
            grinderMotor1: response[26] === '1' ? 'ON' : 'OFF',               // 그라인더 모터1
            grinderMotor2: response[27] === '1' ? 'ON' : 'OFF',               // 그라인더 모터2
            coffeeMode: this.getCoffeeMode(response[35]),                     // 커피 동작 상태
            cupSensor: response[37] === '1' ? '있음' : '없음',                  // 컵 센서
            waterAlarm: response[38] === '1' ? '물없음' : '정상',               // 물 없음 알람
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
