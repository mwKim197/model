const log = require('../../logger')
const express = require('express');
const Ice = express.Router();

Ice.use((req, res, next) => {
    if (!req.serialCommCom3) {
        log.error('Ice: serialComm is not');
        return res.status(500).send('Serial communication is unavailable.');
    }
    next();
});

Ice.get('/serial-water-time', async (req, res) => {
    try {
        const { data } = req.query;
        if (!data) {
            log.error("no parameter " + data);
            return res.status(400).send('Data parameter is required');
        }

        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        // 데이터 패킷 생성
        const stx = 0x02;         // Start Byte
        const id = 0x01;          // Device ID
        const len = 0x07;         // Packet Length
        const cmd = 0x04;         // Command (ICE TIME)
        const crc = id ^ len ^ cmd ^ data; // XOR 계산
        const etx = 0x03;         // End Byte

        // 패킷 조립
        const packet = Buffer.from([stx, id, len, cmd, data, crc, etx]);

        log.info('water-time: Sending Packet:', packet);

        const response = await req.serialCommCom3.writeCommand(packet);
        log.info('water-time command response:', response); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Ice.get('/serial-ice-time', async (req, res) => {

    try {
        const { data } = req.query;
        if (!data) {
            log.error("no parameter " + data);
            return res.status(400).send('Data parameter is required');
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

        const response = await req.serialCommCom3.writeCommand(packet);
        log.info('ice-time command response:', response); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Ice.get('/serial-ice-run', async (req, res) => {
    try {

        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        // 데이터 패킷 생성
        const stx = 0x02;         // Start Byte
        const id = 0x01;          // Device ID
        const len = 0x07;         // Packet Length
        const cmd = 0x06;         // Command (ICE TIME)
        const data = 0x01;        // Data (01 출수 00 정지)
        const crc = id ^ len ^ cmd ^ data; // XOR 계산
        const etx = 0x03;         // End Byte

        // 패킷 조립
        const packet = Buffer.from([stx, id, len, cmd, data, crc, etx]);

        log.info('run: Sending Packet:', packet);

        const response = await req.serialCommCom3.writeCommand(packet);
        log.info('run command response:', response); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Ice.get('/serial-ice-stop', async (req, res) => {
    try {

        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        // 데이터 패킷 생성
        const stx = 0x02;         // Start Byte
        const id = 0x01;          // Device ID
        const len = 0x07;         // Packet Length
        const cmd = 0x06;         // Command (ICE TIME)
        const data = 0x00;        // Data (01 출수 00 정지)
        const crc = id ^ len ^ cmd ^ data; // XOR 계산
        const etx = 0x03;         // End Byte

        // 패킷 조립
        const packet = Buffer.from([stx, id, len, cmd, data, crc, etx]);

        log.info('run: Sending Packet:', packet);

        const response = await req.serialCommCom3.writeCommand(packet);
        log.info('run command response:', response); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

module.exports = Ice;