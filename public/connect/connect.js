const { SerialPort } = require('serialport');

class SerialComm {
    constructor(portName) {
        this.port = new SerialPort({
            path: portName,
            baudRate: 9600,
            dataBits: 8,
            parity: 'none',
            stopBits: 1,
        });

        this.serialBuffer = '';
    }

    writeCommand(command) {
        return new Promise((resolve, reject) => {
            this.port.write(command, (err) => {
                if (err) {
                    return reject(`명령 전송 오류: ${err.message}`);
                }
            });

            // 시리얼 포트가 정상적으로 열렸을 때
            this.port.on('open', () => {
                console.log('시리얼 포트가 정상적으로 열렸습니다.');
            });

            // 시리얼 포트에서 에러가 발생했을 때
            this.port.on('error', (err) => {
                console.error('시리얼 포트 에러:', err.message);
            });
        });
    }

    readData() {
        return new Promise((resolve, reject) => {
            this.port.on('data', (data) => {
                this.serialBuffer += data.toString('ascii'); // 데이터 누적

                // 응답이 끝났는지 확인 (LF로 끝남)
                if (this.serialBuffer.endsWith('\x0a')) {
                    const response = this.serialBuffer.trim(); // 불필요한 공백 제거

                    try {
                        // 응답 처리
                        if (response.length < 10 || !response.startsWith('RD')) {
                            throw new Error('잘못된 응답 형식');
                        }

                        // 데이터 추출
                        const data = response;
                        const boilerTemp = parseInt(response[2] + response[3] + response[4], 10);
                        const heaterStatus = response[5] === '1' ? 'ON' : 'OFF';
                        const flowRate1 = parseInt(response[6] + response[7] + response[8], 10);

                        resolve({ boilerTemp, heaterStatus, flowRate1, data: response });
                    } catch (error) {
                        reject(error.message);
                    } finally {
                        this.serialBuffer = ''; // 버퍼 초기화
                    }
                }
            });

            this.port.on('error', (err) => {
                reject(`시리얼 포트 에러: ${err.message}`);
            });
        });
    }
}

module.exports = SerialComm;
