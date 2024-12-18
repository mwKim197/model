const express = require('express');
const serialDataManager  = require('../../services/serialDataManager');
const Connect = express.Router();
const log = require('../../logger');
let { startOrder, useWash }= require('../../services/serialOrderManager.js');
const {serialCommCom1} = require("../../serial/serialCommManager")
const {signupUser, loginUser} = require("../../login");
const {initializeCounter} = require("../../aws/db/utils/getCount");
// MC 머신 Data - SerialPolling 인스턴스 생성
const polling = new serialDataManager(serialCommCom1);


// 주문 요청 처리 엔드포인트
Connect.post('/start-order', async (req, res) => {
    try {
        log.info("Order process started, polling stopped");

        await polling.stopPolling(); // 주문 작업을 시작하기 전에 조회 정지
        const reqBody = req.body;
        await startOrder(reqBody);
        await polling.startPolling(serialCommCom1, 10000).then(); // 주문 작업이 끝난 후 조회 재개
        // list 받음 -> 메뉴판에 있는 데이터 불러서 조합 시작!
        res.json({ success: true, message: '주문 완료' });
    } catch (err) {
        res.status(500).json({ success: false});
    }
});

// 회원 가입
Connect.post('/set-user-info', async(req, res) => {
    try {
        const userInfo = req.body;

        const result = await signupUser(userInfo.userId, userInfo.password, userInfo.ipAddress, userInfo.storeName, userInfo.tel).then();

        res.json({ success: true, message: '회원 가입 완료.', data:result });
        return result;
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 회원 로그인
Connect.post('/set-user-login', async(req, res) => {
    try {
        const userInfo = req.body;
        console.log("set-user-login", userInfo);
        const result = await loginUser(userInfo.userId, userInfo.userId).then();
        console.log(result);
        res.json({ success: true, message: '로그인 완료.' });
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

// 주문 완료 후 조회 재개 엔드포인트
Connect.post('/wash',  async (req, res) => {
    try {

        log.info("워시 시작");
        const reqBody = req.body;
        await useWash(reqBody);
        log.info("워시 끝");
        res.json({ success: true, message: '조회 재개 완료' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = Connect;