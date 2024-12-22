const log = require('../../logger')
const express = require('express');
const Ice = express.Router();
const  IceModule = require("./IceModule");
const {serialCommCom3, serialCommCom1} = require("../serialCommManager");
const {dispenseIce, adminDrinkOrder} = require("../../services/serialOrderManager");
const serialDataManager = require("../../services/serialDataManager");
const IceCall = new IceModule(serialCommCom3);
const polling = new serialDataManager(serialCommCom1);

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

        const response = await  IceCall.sendWaterTimePacket(data);
        log.info('water-time command response:', response); // 시리얼 응답 로그
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

Ice.get('/serial-ice-time', async (req, res) => {

    try {
        const { data } = req.query;
        if (!data) {
            log.error("no parameter " + data);
            return res.status(400).send('Data parameter is required');
        }
        const response = await  IceCall.sendIceTimePacket(data);
        log.info('ice-time command response:', response); // 시리얼 응답 로그
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

Ice.get('/serial-ice-run', async (req, res) => {
    try {

        const response = await  IceCall.sendIceRunPacket();
        log.info('run command response:', response); // 시리얼 응답 로그
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

Ice.get('/serial-ice-stop', async (req, res) => {
    try {

        const response = await  IceCall.sendIceStopPacket(data);
        log.info('run command response:', response); // 시리얼 응답 로그
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

Ice.get('/serial-ice-info', async (req, res) => {
    try {

        const response = await  IceCall.getKaiserInfo();
        log.info('run command response:', response); // 시리얼 응답 로그
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

Ice.post('/serial-admin-ice-order', async (req, res) => {
    try {
        const { recipe } = req.body; // req.body에서 recipe를 가져옵니다.

        if (!recipe) {
            return res.status(400).json({
                status: 400,
                result: "error",
                message: "Recipe is required."
            });
        }

        log.info('Polling is being stopped for admin order.');
        await polling.stopPolling(); // 주문 작업을 시작하기 전에 조회 정지

        await dispenseIce(recipe); // 주문 작업 수행

        log.info('Polling is being restarted after admin order.');
        await polling.startPolling(); // 주문 작업 이후 폴링 재개

        res.status(200).json({
            status: 200,
            result: "success",
            message: "Command executed successfully",
            data: {
                menuId: recipe.menuId
            }
        });

    } catch (err) {
        log.error(err.message);
        res.status(500).json({
            status: 500,
            result: "error",
            message: "An error occurred during drink order processing.",
            error: {
                message: err.message,
                stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // 개발 환경에서만 스택 표시
            }
        });
    } finally {
        // 예외 발생 시에도 폴링 재개 보장
        if (!polling.isPollingActive) {
            try {
                log.info('Polling is being restarted in finally block.');
                await polling.startPolling();
            } catch (error) {
                log.error('Failed to restart polling in finally block:', error.message);
            }
        }
    }
});
module.exports = Ice;