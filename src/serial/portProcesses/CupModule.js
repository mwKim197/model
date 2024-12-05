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
            log.info('Serial command response:', data); // 시리얼 응답 로그
            return data;
        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    }

    // 플라스틱 컵 사용 정보를 가져오는 메서드
    async getPlasticCupUsage() {
        try {
            const data = await this.serialCommCom4.writeCommand('PL\x0D');
            log.info('Serial command response:', data); // 시리얼 응답 로그
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
            log.info('Serial command response:', data); // 시리얼 응답 로그
            return data;
        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    }
}

module.exports = CupModule;
