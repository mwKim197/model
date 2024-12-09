const express = require('express');
const Menu = express.Router();
const {checkProduct, addProduct, allProduct} = require('./utils/getMenu');
const log = require("../../logger");

Menu.get('/get-menu-info', async (req, res) => {
    try {
        const data = await checkProduct();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Menu.get('/get-menu-info-all', async (req, res) => {
    try {
        const data = await allProduct();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

Menu.post('/set-menu-info', async (req, res) => {
    try {
        const selectedOptions = req.body; // 클라이언트에서 전송한 JSON 데이터

        // 받은 데이터를 콘솔에 출력
        console.log('Received menu info:', selectedOptions);

        const data = await addProduct(selectedOptions);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        // 응답을 클라이언트로 보냄
        res.json({
            message: 'Menu info received successfully',
            data: data,
        });
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});


module.exports = Menu;