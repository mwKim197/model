const log = require('../../logger');

class IceModule {
    constructor(serialCommCom3) {
        if (!serialCommCom3) {
            log.error('Cup: serialCommCom4 is not available');
            throw new Error('Serial communication is unavailable.');
        }
        this.serialCommCom3 = serialCommCom3;

        this.dataFields = [
            { name: "GEN_BUF0", bits: ["B_MS10", "B_INIT_ST", "B_PWR_SW_CHK", "B_PWR_SW_ON_ST", "B_ICE_SW_CHK", "B_CONT_ON_SW_ST", "B_ICE_READY_SW_ON_ST", "B_ICE_SW_ON_ST"] },
            { name: "GEN_BUF1", bits: ["B_OUT_SW_ON_ST", "B_ICE_WT_SW_CHK", "B_ICE_WT_SW_ON_ST", "B_WT_SW_CHK", "B_WT_SW_ON_ST", "B_TIME_DOWN_SW_CHK", "B_TIME_UP_SW_CHK", ""] },
            { name: "GEN_BUF2", bits: ["B_AD_AVR_END", "B_DRINK_SW_ON_ST", "B_FLOAT_SW_ON_ST", "B_INIT_BIN_ON_ST", "B_EVA_ON_ST", "B_ERR_ON_ST", "B_DRINK_EN", ""] },
            { name: "GEN_BUF3", bits: ["B_COMP_ON_ST", "B_MT_ON_ST", "B_AC_WT_ON_ST", "B_ELEC_GT_ON_ST", "B_FAN_MOT_ON_ST", "B_DC_WT_ON_ST", "B_EVA_175_ON_ST", "B_EVA_SERVICE_ST"] },
            { name: "GEN_BUF4", bits: ["B_DRINK_INIT_ST", "B_WT_DRINK_RT", "B_ICE_CONT_ON_ST", "MODE_ICE_WAT_ST", "B_TIME_SET_MODE_SW_ST", "B_TIME_SET_MODE_SW_CHK", "B_TIME_SET_MODE_ON_ST", ""] },
        ];
    }

    // 제빙기 상태
    async getKaiserInfo() {
        try {

            // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
            // 데이터 패킷 생성
            const stx = 0x02;         // Start Byte
            const id = 0x01;          // Device ID
            const len = 0x06;         // Packet Length
            const cmd = 0x01;         // Command
            const data = 0x06;         // data  0x06
            const etx = 0x03;         // End Byte

            // 패킷 조립
            const packet = Buffer.from([stx, id, len, cmd, data, etx]);

            // 시리얼 응답 받기
            const response = await this.serialCommCom3.writeCommand(packet);
            log.info("response : ", response);
            return await this.parseResponse(response);
        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    };

    // 얼음 시간 세팅
    async sendModePacket() {
        try {
            // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
            // 데이터 패킷 생성
            const stx = 0x02;         // Start Byte
            const id = 0x01;          // Device ID
            const len = 0x07;         // Packet Length
            const cmd = 0x05;         // Command (ICE TIME)
            const data = 0x01;       // data 0: 얼음 1: 얼음 + 물 2: 물
            const crc = id ^ len ^ cmd ^ data; // XOR 계산
            const etx = 0x03;         // End Byte

            // 패킷 조립
            const packet = Buffer.from([stx, id, len, cmd, data, crc, etx]);

            log.info('mode: Sending Packet:', packet);

            // 시리얼 응답 받기
            const response = await this.serialCommCom3.writeCommand(packet);
            log.info('mode command response:', response); // 시리얼 응답 로그

            return data;

        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    };


    // 얼음 시간 세팅
    async sendIceTimePacket(data) {
        try {
            if (!data) {
                log.error("no parameter " + data);
                throw new Error('Data parameter is required');
            }

            // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
            // 데이터 패킷 생성
            const stx = 0x02;         // Start Byte
            const id = 0x01;          // Device ID
            const len = 0x07;         // Packet Length
            const cmd = 0x05;         // Command (ICE TIME)
            const crc = id ^ len ^ cmd ^ data; // XOR 계산
            const etx = 0x03;         // End Byte

            // 패킷 조립
            const packet = Buffer.from([stx, id, len, cmd, data, crc, etx]);

            log.info('ice-time: Sending Packet:', packet);

            // 시리얼 응답 받기
            const response = await this.serialCommCom3.writeCommand(packet);
            log.info('ice-time command response:', response); // 시리얼 응답 로그

            return data;

        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    };

    // 물 시간 세팅
    async sendWaterTimePacket(data) {
        try {
            if (!data) {
                log.error("no parameter " + data);
                throw new Error('Data parameter is required');
            }

            // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
            // 데이터 패킷 생성
            const stx = 0x02;         // Start Byte
            const id = 0x01;          // Device ID
            const len = 0x07;         // Packet Length
            const cmd = 0x04;         // Command (WATER TIME)
            const crc = id ^ len ^ cmd ^ data; // XOR 계산
            const etx = 0x03;         // End Byte

            // 패킷 조립
            const packet = Buffer.from([stx, id, len, cmd, data, crc, etx]);

            log.info('water-time: Sending Packet:', packet);

            // 시리얼 응답 받기
            const response = await this.serialCommCom3.writeCommand(packet);
            log.info('water-time command response:', response); // 시리얼 응답 로그

            return data;

        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    };

    // 출수
    async sendIceRunPacket() {
        try {
            // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
            // 데이터 패킷 생성
            const stx = 0x02;         // Start Byte
            const id = 0x01;          // Device ID
            const len = 0x07;         // Packet Length
            const cmd = 0x06;         // Command (ICE RUN)
            const data = 0x01;        // Data (01 출수 00 정지)
            const crc = id ^ len ^ cmd ^ data; // XOR 계산
            const etx = 0x03;         // End Byte

            // 패킷 조립
            const packet = Buffer.from([stx, id, len, cmd, data, crc, etx]);

            log.info('run: Sending Packet:', packet);

            // 시리얼 응답 받기
            const response = await this.serialCommCom3.writeCommand(packet);
            log.info('run command response:', response); // 시리얼 응답 로그

            return data;

        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    };

    // 정지
    async sendIceStopPacket() {
        try {
            // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
            // 데이터 패킷 생성
            const stx = 0x02;         // Start Byte
            const id = 0x01;          // Device ID
            const len = 0x07;         // Packet Length
            const cmd = 0x06;         // Command (ICE STOP)
            const data = 0x00;        // Data (00 정지)
            const crc = id ^ len ^ cmd ^ data; // XOR 계산
            const etx = 0x03;         // End Byte

            // 패킷 조립
            const packet = Buffer.from([stx, id, len, cmd, data, crc, etx]);

            log.info('stop: Sending Packet:', packet);

            // 시리얼 응답 받기
            const response = await this.serialCommCom3.writeCommand(packet);
            log.info('stop command response:', response); // 시리얼 응답 로그

            return data;

        } catch (err) {
            log.error(err.message);
            throw new Error(err.message);
        }
    };

    // 비트를 해석하여 상태를 반환
    parseBits(byte, bitDescriptions) {
        const states = [];
        for (let i = 0; i < 8; i++) {
            if (bitDescriptions[i]) {
                states.push({ bit: `bit${i}`, name: bitDescriptions[i], value: (byte >> i) & 1 });
            }
        }
        return states;
    }

    // 응답 데이터를 파싱
    async parseResponse(responseHex) {
        const responseBuffer = Buffer.from(responseHex, "hex");

        if (responseBuffer.length < 5) {
            throw new Error("응답 데이터가 너무 짧습니다.");
        }

        const parsedData = {};
        for (let i = 0; i < this.dataFields.length; i++) {
            const field = this.dataFields[i];
            const byte = responseBuffer[i];
            parsedData[field.name] = this.parseBits(byte, field.bits);
        }
        return parsedData;
    }
}

module.exports = IceModule;