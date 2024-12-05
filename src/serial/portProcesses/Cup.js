const log = require('../../logger');
const express = require('express');
const Cup = express.Router();

Cup.use((req, res, next) => {
    if (!req.serialCommCom4) {
        log.error('Cup: serialComm is not');
        return res.status(500).send('Serial communication is unavailable.');
    }
    next();
});

Cup.get('/serial-cup-info', async (req, res) => {
    try {

        const data = await req.serialCommCom4.writeCommand('RD\x0D');
        log.info('Serial command response:', data); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Cup.get('/serial-cup-plastic-use', async (req, res) => {
    try {

        const data = await req.serialCommCom4.writeCommand('PL\x0D');
        log.info('Serial command response:', data); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Cup.get('/serial-cup-paper-use', async (req, res) => {
    try {

        const data = await req.serialCommCom4.writeCommand('PA\x0D');
        log.info('Serial command response:', data); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});


module.exports = Cup;