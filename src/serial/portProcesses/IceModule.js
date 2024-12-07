const log = require('../../logger');

class IceModule {
    constructor(serialCommCom3) {
        if (!serialCommCom3) {
            log.error('Cup: serialCommCom4 is not available');
            throw new Error('Serial communication is unavailable.');
        }
        this.serialCommCom3 = serialCommCom3;
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
            const data = 0x04;         // data  0x02, 0x03, 0x04
            const etx = 0x03;         // End Byte

            // 패킷 조립
            const packet = Buffer.from([stx, id, len, cmd, data, etx]);

            log.info('info: Sending Packet:', packet);

            // 시리얼 응답 받기
            const response = await this.serialCommCom3.writeCommand(packet);

            return await this.parseStatusData(response);
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

    async parseStatusData(responseData) {

        console.log("Response Data (full):", responseData);
        console.log("Response Data (length):", responseData.length);

        // 데이터 길이 확인
        if (!responseData || responseData.length < 7) {
            throw new Error("Invalid response data length");
        }

        try {

            const cmd = responseData[3]; // CMD 필드
            const wasTrue = cmd === 0x0B ? 0 : 1;
            // 데이터 필드만 추출 (STX, ID, LEN, CMD, CRC, ETX 제외)
            const statusData = responseData.slice(4, 5);
            // 2. 데이터 값 가져오기
            const data = statusData[0]; // 0x0a

            // 3. 비트별 상태 해석
            const dataStatus = {
                b_drink_init_st: (data >> 0) & 0x01,        // bit0 bit0: 음료 초기화 상태 (OFF)
                b_wt_drink_rt: (data >> 1) & 0x01,          // bit1 bit1: 음료 배출 상태 (ON)
                b_ice_cont_on_st: (data >> 2) & 0x01,       // bit2 bit2: 얼음 컨테이너 동작 상태 (OFF)
                b_mode_sw_chk: (data >> 3) & 0x01,          // bit3 bit3: 모드 스위치 상태 확인 (ON)
                mode_ice_wat_st: (data >> 4) & 0x01,        // bit4 bit4: 얼음과 물 모드 상태 (OFF)
                b_time_set_mode_sw_st: (data >> 5) & 0x01,  // bit5 bit5: 시간 설정 모드 스위치 (OFF)
                b_time_set_mode_sw_chk: (data >> 6) & 0x01, // bit6 bit6: 시간 설정 모드 스위치 확인 (OFF)
                b_time_set_mode_on_st: (data >> 7) & 0x01,  // bit7 bit7: 시간 설정 모드 활성 상태 (OFF)
            };

            // 결과 반환
            return {
                wasTrue: wasTrue,
                data: dataStatus
            };
        } catch (err) {
            console.error('Error parsing status data:', err.message);
            throw err;
        }
    }
}

module.exports = IceModule;