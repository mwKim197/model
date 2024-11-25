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
        const command = `(02)(01)(06)(01)(06)(03)\x0D`;
        log.info('command :' + command);
        const data = await req.serialCommCom3.writeCommand(command);
        log.info('Serial command response:', data); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

module.exports = Ice;