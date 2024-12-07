const log = require('../../logger');

class OrderModule {
    constructor(serialCommCom1) {
        if (!serialCommCom1) {
            log.error('Order: serialCommCom1 is not available');
            throw new Error('Serial communication is unavailable.');
        }
        this.serialCommCom1 = serialCommCom1;
    }

    // 커피시간 세팅
    async sendCoffeeCommand(grinder1, grinder2, extraction, hotwater) {
        const command = `SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D`;
        return this.sendCommand(command);  // 공통 함수 사용
    }

    // 커피 추출
    async extractCoffee() {
        const command = 'COFFEE\x0d';
        return this.sendCommand(command);  // 공통 함수 사용
    }

    // COFFEE1 명령어 전송 함수
    async extractCoffee1() {
        const command = 'COFFEE1';
        return this.sendCommand(command);  // 공통 함수 사용
    }

    // 가루차 세팅
    async sendTeaCommand(motor, extraction, hotwater) {
        const command = `SPD${motor}${extraction}${hotwater}\x0D`;
        return this.sendCommand(command);  // 공통 함수 사용
    }

    // Tea 추출 (Powder) 명령어 전송 함수
    async extractTeaPowder() {
        const command = 'POWDER\x0D';
        return this.sendCommand(command);  // 공통 함수 사용
    }

    // 시럽 설정 명령어 전송 함수
    async setSyrup(syrup, pump, hotwater, sparkling) {
        const command = `SSR${syrup}${pump}${hotwater}${sparkling}\x0D`;
        return this.sendCommand(command);  // 공통 함수 사용
    }

    // 시럽 추출 명령어 전송 함수
    async extractSyrup() {
        const command = 'SYRUP\x0D';
        return this.sendCommand(command);  // 공통 함수 사용
    }

    // 커피 세척
    async purifyingCoffee() {
        const command = 'FLUSH0\x0D';
        return this.sendCommand(command);  // 공통 함수 사용
    }
    // 가루차 세척
    async purifyingTae(number) {
        const command = `FLUSH${number}\x0D`;
        return this.sendCommand(command);  // 공통 함수 사용
    }
    // 시럽 세척
    async purifyingSyrup(number) {
        const command = `SYFLU${number}\x0D`;
        return this.sendCommand(command);  // 공통 함수 사용
    }

    // 공통 명령어 전송 함수
    async sendCommand(command) {
        try {
            log.info(`Sending command: ${command}`);

            // 시리얼 명령어 전송 및 응답 받기
            const data = await this.serialCommCom1.writeCommand(command);
            log.info('Command response:', data);  // 시리얼 응답 로그

            return data;  // 응답 데이터 반환
        } catch (err) {
            log.error(`Error sending command: ${err.message}`);
            throw new Error(`Error sending command: ${err.message}`);
        }
    }
}

module.exports = OrderModule;