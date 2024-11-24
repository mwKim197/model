const Serial = require('../connect/Serial'); // 새로 작성한 모듈 가져오기
const log = require('../../logger')
const express = require('express');
const appServer = express();
const Connect = express.Router();


// 시리얼 통신 부
const cors = require('cors');
appServer.use(cors());

// 시리얼 통신 인스턴스 생성
const serialComm = new Serial('COM1');
// HTTP 엔드포인트 설정 RD1 호출
Connect.get('/serial-data-rd1', async (req, res) => {
    try {
        const data = await serialComm.writeCommand('RD1\x0d');
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
        const data = await serialComm.writeCommand('RD2\x0d');
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
        const data = await serialComm.writeCommand('RD3\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

// HTTP 엔드포인트 설정 RD2 호출
Connect.get('/serial-data-rd4', async (req, res) => {
    try {
        const data = await serialComm.writeCommand('RD4\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});


module.exports = Connect;