const log = require('../../logger')
const express = require('express');
const Order = express.Router();


Order.use((req, res, next) => {
    if (!req.serialCommCom1) {
        log.error('serialCommCom1 is not initialized or unavailable');
        return res.status(500).send('Serial communication is unavailable.');
    }
    next();
});

Order.get('/serial-order-coffee-setting/:grinder1/:grinder2/:extraction/:hotwater', async (req, res) => {
    try {
        const { grinder1, grinder2, extraction, hotwater } = req.params;

        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        const command = `SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D`;
        log.info('command :' + command);
        const data = await req.serialCommCom1.writeCommand(`SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D`);
        log.info('Serial command response:', data); // 시리얼 응답 로그
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            status: 200,
            result: "success",
            message: "Command executed successfully",
            data: data
        });

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-coffee-use', async (req, res) => {
    try {
        const data = await req.serialCommCom1.writeCommand('COFFEE\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            status: 200,
            result: "success",
            message: "Command executed successfully",
            data: data
        });

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-coffee-use1', async (req, res) => {
    try {

        const command = 'COFFEE1';
        log.info('command :' + command);
        const data = await req.serialCommCom1.writeCommand('COFFEE\x0d');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            status: 200,
            result: "success",
            message: "Command executed successfully",
            data: data
        });

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
        const data = await req.serialCommCom1.writeCommand(command);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            status: 200,
            result: "success",
            message: "Command executed successfully",
            data: data
        });

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-tea-use', async (req, res) => {
    try {
        const data = await req.serialCommCom1.writeCommand('POWDER\x0D');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            status: 200,
            result: "success",
            message: "Command executed successfully",
            data: data
        });

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
        const data = await req.serialCommCom1.writeCommand('SSR1045120130\x0D\x0A');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            status: 200,
            result: "success",
            message: "Command executed successfully",
            data: data
        });

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Order.get('/serial-order-syrup-use', async (req, res) => {
    try {

        const data = await req.serialCommCom1.writeCommand('SYRUP\x0D');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({
            status: 200,
            result: "success",
            message: "Command executed successfully",
            data: data
        });

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});


module.exports = Order;