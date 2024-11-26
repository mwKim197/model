const log = require('../logger')
const express = require('express');
const Ice = express.Router();

Ice.use((req, res, next) => {
    if (!req.serialCommCom3) {
        log.error('Ice: serialComm is not');
        return res.status(500).send('Serial communication is unavailable.');
    }
    next();
});

Ice.get('/serial-ice-info', async (req, res) => {
    try {

        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        // 데이터 패킷 생성
        const stx = 0x02;         // Start Byte
        const id = 0x01;          // Device ID
        const len = 0x07;         // Packet Length
        const cmd = 0x04;         // Command (ICE TIME)
        const data = 0x05;        // Data (1.5초 → 15)
        const crc = id ^ len ^ cmd ^ data; // XOR 계산
        const etx = 0x03;         // End Byte

        // 패킷 조립
        const packet = Buffer.from([stx, id, len, cmd, data, crc, etx]);

        console.log('Sending Packet:', packet);

        const command = `${packet}`;
        log.info('command :' + command);
        const response = await req.serialCommCom3.writeCommand(command);
        log.info('Serial command response:', data); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

module.exports = Ice;