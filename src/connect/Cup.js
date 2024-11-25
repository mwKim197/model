const log = require('../logger')
const express = require('express');
const Cup = express.Router();

Cup.use((req, res, next) => {
    if (!req.serialCommCom4) {
        log.error('Cup: serialComm is not');
        return res.status(500).send('Serial communication is unavailable.');
    }
    next();
});

Cup.get('/serial-cup', async (req, res) => {
    try {
        const { grinder1, grinder2, extraction, hotwater } = req.params;

        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        const command = `SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D`;
        log.info('command :' + command);
        const data = await req.serialCommCom4.writeCommand(`SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D`);
        log.info('Serial command response:', data); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

module.exports = Cup;