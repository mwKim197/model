const log = require('../../logger')
const express = require('express');
const {dispenseCup, dispenseCoffee, adminDrinkOrder} = require("../../services/serialOrderManager");
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
        await dispenseCoffee(grinder1, grinder2, extraction, hotwater);
        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
       /* const command = `SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D`;
        log.info('command :' + command);
        const data = await req.serialCommCom1.writeCommand(`SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D`);
        log.info('Serial command response:', data); // 시리얼 응답 로그*/
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

Order.post('/serial-admin-drink-order', async (req, res) => {
    try {
        const { recipe } = req.body; // req.body에서 recipe를 가져옵니다.

        if (!recipe) {
            return res.status(400).json({
                status: 400,
                result: "error",
                message: "Recipe is required."
            });
        }

        await adminDrinkOrder(recipe);

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