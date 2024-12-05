const { SerialPort } = require('serialport');
const log = require('../logger'); // log 모듈 사용
const {
    parseSerialDataRd1,
    parseSerialDataRd2,
    parseSerialDataRd3,
    parseSerialDataRd4,
} = require('./serialDataParser');

class SerialPortManager {
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
            log.info('Received Raw Data:', data.toString('hex')); // 데이터 로그
            log.info('Received ASCII Data:', data.toString('ascii')); // ASCII로 출력
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
        if (this._isHexComplete(hexBuffer)) {
            const hexPacket = this.hexBuffer.slice(0, 14); // HEX 패킷 길이에 맞게 추출
            this._processHexData(Buffer.from(hexPacket, 'hex')); // 패킷 처리
            this.hexBuffer =''; // 사용한 패킷 제거
        }

        // ASCII 패킷 처리
        this.asciiBuffer += data.toString('ascii'); // ASCII 형식으로 누적
        log.info(`asciiBuffer: ${this.asciiBuffer}`);

        // ASCII 데이터 처리
        while (this.asciiBuffer.includes('\n')) {
            const newlineIndex = this.asciiBuffer.indexOf('\n');
            const asciiPacket = this.asciiBuffer.slice(0, newlineIndex + 1).trim(); // 줄 단위로 추출
            this._processAsciiData(asciiPacket); // ASCII 처리
            this.asciiBuffer = ''; // 사용한 데이터 제거
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

        // 수신된 데이터(hexBuffer) 출력
        console.log("hexBuffer:", hexBuffer.toString('hex')); // 02 01 07 04 05 00 03
        // Length 필드 확인
        const length = hexBuffer[2]; // 세 번째 바이트가 Length
        console.log("Length field:", length); // Length 필드 값 출력

        // 길이 비교
        if (hexBuffer.length !== length) {
            console.log('Invalid packet: Length mismatch');
            return false; // 실제 길이와 Length 필드 값이 다르면 패킷 불완전
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
            field2: hexString.slice(4, 8),                     // 예: Hex 문자열로 유지
        };
    }

    // ascii 응답데이터 처리
    _processAsciiData(asciiPacket) {
        log.info(`Processing ASCII data: ${asciiPacket}`);

        // ASCII 데이터 추가 처리 로직
        if (asciiPacket.match(/^[a-zA-Z0-9+\s]*$/)) {

            const asciiPacket = this.asciiBuffer.trim();

            try {
                // response data 사이즈가 다를수있다.
                if (asciiPacket.length < 1) {
                    throw new Error('error response');
                }
                let data;
                if (asciiPacket.startsWith('RD1')) {
                    data = parseSerialDataRd1(asciiPacket);
                } else if (asciiPacket.startsWith('RD2')) {
                    data = parseSerialDataRd2(asciiPacket);
                } else if (asciiPacket.startsWith('RD3')) {
                    data = parseSerialDataRd3(asciiPacket);
                } else if (asciiPacket.startsWith('RD4')) {
                    data = parseSerialDataRd4(asciiPacket);
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

module.exports = SerialPortManager;
