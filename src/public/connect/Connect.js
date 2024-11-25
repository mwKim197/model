const log = require('../../logger')
const express = require('express');
const Connect = express.Router();

// HTTP 엔드포인트 설정 RD1 호출
Connect.get('/serial-data-rd1', async (req, res) => {
    try {
        const data = await req.serialComm.writeCommand('RD1\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

// HTTP 엔드포인트 설정 RD2 호출
Connect.get('/serial-data-rd2', async (req, res) => {
    try {
        const data = await req.serialComm.writeCommand('RD2\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

// HTTP 엔드포인트 설정 RD3 호출
Connect.get('/serial-data-rd3', async (req, res) => {
    try {
        const data = await req.serialComm.writeCommand('RD3\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

// HTTP 엔드포인트 설정 RD4 호출
Connect.get('/serial-data-rd4', async (req, res) => {
    try {
        const data = await req.serialComm.writeCommand('RD4\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});


module.exports = Connect;