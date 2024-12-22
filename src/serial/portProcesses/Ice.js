const log = require('../../logger')
const express = require('express');
const Ice = express.Router();
const  IceModule = require("./IceModule");
const {serialCommCom3} = require("../serialCommManager");
const IceCall = new IceModule(serialCommCom3);

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

module.exports = Ice;