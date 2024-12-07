const express = require('express');
const serialDataManager  = require('../../services/serialDataManager');
const Connect = express.Router();
const log = require('../../logger');
let { startOrder }= require('../../services/serialOrderManager.js');
const {serialCommCom1} = require("../../serial/serialCommManager")
// MC 머신 Data - SerialPolling 인스턴스 생성
const polling = new serialDataManager(serialCommCom1);


// 주문 요청 처리 엔드포인트
Connect.post('/start-order', async (req, res) => {
    try {
        log.info("Order process started, polling stopped");

        await polling.stopPolling(); // 주문 작업을 시작하기 전에 조회 정지
        const reqBody = req.body;
        await startOrder(reqBody);
        // list 받음 -> 메뉴판에 있는 데이터 불러서 조합 시작!
        res.json({ success: true, message: '주문 완료' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 주문 완료 후 조회 재개 엔드포인트
Connect.post('/end-order', (req, res) => {
    try {
        log.info("Order process stopped, polling started");
        const { serialCommCom1 } = req; // 시리얼 통신 객체 가져오기
        startPolling(serialCommCom1, 10000); // 주문 작업이 끝난 후 조회 재개
        res.json({ success: true, message: '조회 재개 완료' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 폴링데이터 받아오기
Connect.post('/get-data', (req, res) => {
    try {
        res.json({ success: true, data: getSerialData() });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = Connect;