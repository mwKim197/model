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
         //   log.info(`Serial port opened successfully on path: ${portPath}`);
            this.retryCount = 0; // 포트가 성공적으로 열리면 재시도 횟수 초기화
        });

        this.port.on('error', (err) => {
            log.error(`serial port error: ${err.message}`);
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
              //  log.info(`Retrying to open the port... Attempt ${this.retryCount}`);
                setTimeout(() => {
                    this._openPort(portPath, baudRate); // 재시도
                }, this.retryDelay);
            } else {
                log.error('Max retry attempts reached. Could not open the serial port.');
            }
        });

        // 데이터 수신 이벤트 처리
        this.port.on('data', (data) => this._onDataReceived(data));
    }

    // 데이터 리시브
    _onDataReceived(data) {
        // 수신된 데이터를 HEX 문자열로 누적
        const hexData = data.toString('hex');
        const asciiData = data.toString('ascii');

        // HEX 데이터 처리
        if (this._isHexData(hexData)) { // HEX 데이터 여부 확인
            this.hexBuffer += hexData;

            // HEX 패킷 처리 (7자리 또는 그 이상)
            while (this._isHexComplete(this.hexBuffer)) {
                const packetLength = this._getHexPacketLength(this.hexBuffer); // 패킷 길이를 동적으로 계산
                const hexPacket = this.hexBuffer.slice(0, packetLength * 2); // 패킷 길이(문자열 기준)에 맞게 추출

                this._processHexData(hexPacket); // 패킷 처리
                this.hexBuffer = this.hexBuffer.slice(packetLength * 2); // 처리한 패킷을 hexBuffer에서 제거
            }
        }

        // ASCII 데이터 처리
        if (this._isAsciiData(asciiData)) { // ASCII 데이터 여부 확인
            this.asciiBuffer += asciiData;

            // ASCII 데이터 처리
            while (this.asciiBuffer.includes('\n')) {
                const newlineIndex = this.asciiBuffer.indexOf('\n');
                const asciiPacket = this.asciiBuffer.slice(0, newlineIndex + 1).trim(); // 줄 단위로 추출
                this._processAsciiData(asciiPacket); // ASCII 처리
                this.asciiBuffer = ''; // 사용한 데이터 제거
            }
        }
    }

    // HEX 데이터 여부 확인
    _isHexData(hexData) {
        return /^[0-9a-f]+$/i.test(hexData); // HEX 형식 확인
    }

    // ASCII 데이터 여부 확인
    _isAsciiData(asciiData) {
        return /^[a-zA-Z0-9+\s]*$/.test(asciiData); // ASCII 형식 확인
    }
    
    // Hex 데이터 검증
    _isHexComplete(hexString) {
        // 최소 패킷 길이 확인 (STX + ID + Length + Command + Data + CRC + ETX)
        if (hexString.length < 14) {
            return false; // 최소 길이를 충족하지 않으면 패킷이 불완전
        }

        // STX와 ETX 확인
        const stx = hexString.slice(0, 2); // 첫 두 글자 (STX)
        const etx = hexString.slice(-2); // 마지막 두 글자 (ETX)
        if (stx !== '02' || etx !== '03') {
            return false; // STX와 ETX가 유효하지 않으면 패킷이 불완전
        }

        // Length 필드 확인 (3번째 바이트, HEX로 문자열의 4~6번째)
        const length = parseInt(hexString.slice(4, 6), 16); // Length 필드는 16진수로 변환
        return hexString.length >= length * 2;

         // 모든 조건 충족 시 패킷 완전
    }

    _getHexPacketLength(hexString) {
        // Length 필드 확인 (3번째 바이트, HEX로 문자열의 4~6번째)
        return parseInt(hexString.slice(4, 6), 16); // 패킷 길이를 반환
    }

    // Hex 데이터 처리
    _processHexData(data) {
        try {
            // 데이터 검증 (선택 사항)
            if (typeof data !== 'string') {
                throw new Error('Received data is not a valid string');
            }

            // 최신 데이터로 문자열 저장
            this.latestData = data; // 문자열로 저장
            console.log(`Processed HEX Data: ${data}`); // 로그 출력 (원하는 방식으로 대체 가능)
        } catch (err) {
            console.error(`Hex 데이터 처리 실패: ${err.message}`);
        }
    }

    // ascii 응답데이터 처리
    _processAsciiData(asciiPacket) {
        // ASCII 데이터 추가 처리 로직
        if (asciiPacket.match(/^[a-zA-Z0-9+\s]*$/)) {

            const asciiPacket = this.asciiBuffer.trim();
            try {
                // response data 사이즈가 다를수있다.
                if (asciiPacket.length < 1) {
                    throw new Error('error response');
                }
                let data;
                if (asciiPacket.startsWith('RD1') && asciiPacket.length >= 20) {
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
            log.info(`Unexpected ASCII data: ${asciiPacket}`);
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
