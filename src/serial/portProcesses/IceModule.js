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
            const data = 0x06;          // data
            const etx = 0x03;         // End Byte

            // 패킷 조립
            const packet = Buffer.from([stx, id, len, cmd, data, etx]);

            log.info('info: Sending Packet:', packet);

            // 시리얼 응답 받기
            const response = await this.serialCommCom3.writeCommand(packet);
            log.info('info command response:', response); // 시리얼 응답 로그

            const statusData = response.field2; // 전체 버퍼
            log.info('Parsed Status Data:', statusData);

            return await this.parseStatusData(statusData);

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

        if (responseData && responseData.data) {
            responseData = Buffer.from(responseData.data);
        }

        if (!responseData || responseData.length < 7) {
            throw new Error('Invalid response data');
        }

        try {

            const cmd = responseData[3]; // CMD 필드
            const wasTrue = cmd === 0x0B ? 0 : 1;
            // 데이터 필드만 추출 (STX, ID, LEN, CMD, CRC, ETX 제외)
            const statusData = responseData.slice(4, responseData.length - 2);

            // 상태 플래그 추출
            const genBuf2 = statusData[1]; // DATA2
            const genBuf3 = statusData[2]; // DATA3
            const genBuf4 = statusData[3]; // DATA4

            log.debug(`statusData: ${statusData.toString('hex')}`);
            log.debug(`genBuf4: ${statusData[3]} (binary: ${statusData[3].toString(2).padStart(8, '0')})`);

            // DATA2 해석
            const data2Status = {
                b_ad_avr_end: (genBuf2 >> 0) & 0x01, // bit0
                b_drink_sw_on_st: (genBuf2 >> 1) & 0x01, // bit1
                b_float_sw_on_st: (genBuf2 >> 2) & 0x01, // bit2 물없음 ERROR : 표시 CLEAN LED 점멸 (물보충 시 복구)
                b_bin_sw_on_st: (genBuf2 >> 3) & 0x01, // bit3
                b_init_bin_on_st: (genBuf2 >> 4) & 0x01, // bit4
                b_eva_on_st: (genBuf2 >> 5) & 0x01, // bit5
                b_err_on_st: (genBuf2 >> 6) & 0x01, // bit6 서미스터 OPEN/Short:표시 WATER/WATER+ICE /ICE LED 점멸 (부품교환)
                b_drink_en: (genBuf2 >> 7) & 0x01 // bit7
            };

            // DATA3 해석
            const data3Status = {
                b_comp_on_st: (genBuf3 >> 0) & 0x01, // bit0
                b_mt_on_st: (genBuf3 >> 1) & 0x01, // bit1
                b_ac_wt_on_st: (genBuf3 >> 2) & 0x01, // bit2
                b_elec_gt_on_st: (genBuf3 >> 3) & 0x01, // bit3
                b_fan_mot_on_st: (genBuf3 >> 4) & 0x01, // bit4
                b_dc_wt_on_st: (genBuf3 >> 5) & 0x01, // bit5
                b_eva_175_on_st: (genBuf3 >> 6) & 0x01, // bit6 서미스터 과냉각 : 표시 FULL+CLEAN LED 점멸 (5초후 재가동)
                b_eva_service_st: (genBuf3 >> 7) & 0x01 // bit7 서미스터 약냉각 : 표시 CLEAN LED 점등 (청소 및 서비스)
            };

            // DATA4 해석
            const data4Status = {
                b_drink_init_st: (genBuf4 >> 0) & 0x01, // bit0
                b_wt_drink_rt: (genBuf4 >> 1) & 0x01, // bit1 얼음투출 1: ON 2: OFF
                b_ice_cont_on_st: (genBuf4 >> 2) & 0x01 // bit2
            };

            // 결과 반환
            return {
                wasTrue: wasTrue,
                data2: data2Status,
                data3: data3Status,
                data4: data4Status
            };
        } catch (err) {
            console.error('Error parsing status data:', err.message);
            throw err;
        }
    }
}

module.exports = IceModule;