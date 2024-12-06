const log = require('../../logger');

// 시리얼 통신 객체를 클래스의 생성자로 전달
class CupModule {
    constructor(serialCommCom4) {
        if (!serialCommCom4) {
            log.error('Cup: serialCommCom4 is not available');
            throw new Error('Serial communication is unavailable.');
        }
        this.serialCommCom4 = serialCommCom4;
    }

    // 시리얼 응답을 가져오는 메서드
    async getCupInfo() {
        try {
            const data = await this.serialCommCom4.writeCommand('RD\x0D');
            log.info('Cup Info:', data); // 시리얼 응답 로그
            return await this.parseReturnCommand(data);
        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    }

    // 플라스틱 컵 사용 정보를 가져오는 메서드
    async getPlasticCupUsage() {
        try {
            const data = await this.serialCommCom4.writeCommand('PL\x0D');
            log.info('PL :', data); // 시리얼 응답 로그
            return data;
        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    }

    // 종이 컵 사용 정보를 가져오는 메서드
    async getPaperCupUsage() {
        try {
            const data = await this.serialCommCom4.writeCommand('PA\x0D');
            log.info('PA :', data); // 시리얼 응답 로그
            return data;
        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    }

    // 시리얼 응답을 가져오는 메서드
    async stopCupMotor() {
        try {
            const data = await this.serialCommCom4.writeCommand('STOP\x0D');
            log.info('Cup Stop :', data); // 시리얼 응답 로그
            return data;
        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    }

    async parseReturnCommand(rawCommand) {
        if (rawCommand.length !== 19) {
            throw new Error('리턴 커맨드의 길이가 올바르지 않습니다.');
        }

        return {
            plasticCup: {
                sensor: parseInt(rawCommand[2], 10), // 컵1 센서
                limitBackward: parseInt(rawCommand[3], 10), // LIMIT1- (후진 센서)
                limitForward: parseInt(rawCommand[4], 10), // LIMIT1+ (전진 센서)
                motorActive: parseInt(rawCommand[5], 10), // 컵1 배출 모터 동작 상태
                counter: parseInt(rawCommand.slice(6, 8), 10), // 컵1 배출 카운터 (2자리)
                rotationSensor: parseInt(rawCommand[8], 10) // 컵1 배출 회전 센서
            },
            paperCup: {
                sensor: parseInt(rawCommand[9], 10), // 컵2 센서
                limitBackward: parseInt(rawCommand[10], 10), // LIMIT2- (후진 센서)
                limitForward: parseInt(rawCommand[11], 10), // LIMIT2+ (전진 센서)
                motorActive: parseInt(rawCommand[12], 10), // 컵2 배출 모터 동작 상태
                counter: parseInt(rawCommand.slice(13, 15), 10), // 컵2 배출 카운터 (2자리)
                rotationSensor: parseInt(rawCommand[15], 10) // 컵2 배출 회전 센서
            },
            cardTerminal: {
                powerStatus: parseInt(rawCommand[16], 10) // 카드 단말기 전원 상태
            }
        };
    }
}

module.exports = CupModule;
