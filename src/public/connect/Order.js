const Serial = require('../connect/Serial'); // 새로 작성한 모듈 가져오기
const log = require('../../logger')
const express = require('express');
const appServer = express();
const Order = express.Router();

// 시리얼 통신 인스턴스 생성
const serialComm = new Serial('COM1');

// 시리얼 통신 부
const cors = require('cors');
appServer.use(cors());

Order.get('/serial-order-coffee-setting/:grinder1/:grinder2/:extraction/:hotwater', async (req, res) => {
    try {
        const { grinder1, grinder2, extraction, hotwater } = req.params;

        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        const command = `SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D`;
        log.info('command :' + command);
        const data = await serialComm.writeCommand(`SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D`);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-coffee-use', async (req, res) => {
    try {
        const data = await serialComm.writeCommand('COFFEE\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-coffee-use1', async (req, res) => {
    try {

        const command = 'COFFEE1';
        log.info('command :' + command);
        const data = await serialComm.writeCommand('COFFEE1\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-tea-setting/:motor/:extraction/:hotwater', async (req, res) => {
    try {

        const { motor, extraction, hotwater } = req.params;
        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        const command = `SPD${motor}${extraction}${hotwater}\x0D`;
        log.info('command :' + command);
        const data = await serialComm.writeCommand(command);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-tea-use', async (req, res) => {
    try {
        const data = await serialComm.writeCommand('POWDER\x0D');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-syrup-setting/:syrup/:pump/:hotwater/:sparkling', async (req, res) => {
    try {

        const { syrup, pump, hotwater,sparkling } = req.params;
        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        const command = `SSR${syrup}${pump}${hotwater}${sparkling}\x0D`;
        log.info('command :' + command);
        const data = await serialComm.writeCommand(command);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-syrup-use', async (req, res) => {
    try {

        const data = await serialComm.writeCommand('SSR\x0D');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});




module.exports = Order;