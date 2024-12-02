const express = require('express');
const { stopPolling, startPolling, getSerialData } = require('../../services/serialDataManager');
const Connect = express.Router();

// 주문 요청 처리 엔드포인트
Connect.post('/start-order', (req, res) => {
    try {
        stopPolling(); // 주문 작업을 시작하기 전에 조회 정지
        // 여기서 주문 처리를 수행
        res.json({ success: true, message: 'Order process started, polling stopped.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 주문 완료 후 조회 재개 엔드포인트
Connect.post('/end-order', (req, res) => {
    try {
        const { serialCommCom1 } = req; // 시리얼 통신 객체 가져오기
        startPolling(serialCommCom1, 10000); // 주문 작업이 끝난 후 조회 재개
        res.json({ success: true, message: 'Order process completed, polling resumed.' });
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