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

Order.get('/serial-order-coffee-info/:grinder1/:grinder2/:extraction/:hotwater', async (req, res) => {
    try {
        const { grinder1, grinder2, extraction, hotwater } = req.params;

        // SCF 명령어에 URL 파라미터 값을 포함시켜 시리얼 통신
        const command = `SCF${grinder1}${grinder2}${extraction}${hotwater}\x0D\x0A`;
        log.info('command :' + command);
        const data = await serialComm.writeCommand(command);

        let parsedData = data;
        // 시리얼 장치에서 받은 응답을 JSON 형태로 반환
        if (typeof data === "string") {
            parsedData = JSON.parse(data);  // 응답을 파싱하여 반환
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(parsedData);

    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});




module.exports = Order;