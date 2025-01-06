const express = require('express');
const { app } = require('electron');
const serialDataManager  = require('../../services/serialDataManager');
const Connect = express.Router();
const log = require('../../logger');
let { startOrder, useWash, adminUseWash}= require('../../services/serialOrderManager.js');
const {serialCommCom1} = require("../../serial/serialCommManager")
const {signupUser, loginUser, getAllUserIds} = require("../../login");
const {duplicateMenuData} = require("../../aws/db/utils/getMenu");
const {getSerialData} = require("../../services/serialPolling");
const {saveOrdersToDynamoDB} = require("../../aws/db/utils/getPayment");
// MC 머신 Data - SerialPolling 인스턴스 생성
const polling = new serialDataManager(serialCommCom1);


// 주문 요청 처리 엔드포인트
Connect.post('/start-order', async (req, res) => {
    try {
        log.info("Order process started, polling stopped");

        await polling.stopPolling(); // 주문 작업을 시작하기 전에 조회 정지
        const reqBody = req.body;
        log.info("주문 데이터 확인: ", JSON.stringify(reqBody));
        await saveOrdersToDynamoDB(reqBody);
        // [TODO] 잔여량 계산 로직 추가 예정.
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

// 전체 회원 조회
Connect.post('/get-all-users-ids', async(req, res) => {
    try {
        const result = await getAllUserIds().then();
        res.json({ success: true, message: '유저정보 조회완료.', data: result});
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 조회된 회원 메뉴 데이터 받아서 신규 업데이트
Connect.post('/set-menu-all-update', async (req, res) => {
    try {
        const { sourceUserId, targetUserId } = req.body
        console.log('Menu.post(set-menu-all-update', sourceUserId + " : " + targetUserId);
        // 입력값 유효성 검사
        if (!sourceUserId || !targetUserId) {
            return res.status(400).json({
                success: false,
                message: 'sourceUserId와 targetUserId를 모두 제공해야 합니다.',
            });
        }

        await duplicateMenuData(sourceUserId, targetUserId);

        res.json({
            success: true,
            message: `${sourceUserId}의 데이터를 ${targetUserId}로 복사했습니다.`,
        });
    } catch (err) {
        log.error(err.message);
        res.status(500).json({
            success: false,
            message: err.message,
        });
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

Connect.post('/restart-app', (req, res) => {
    try {
        log.info('재부팅 명령 수신');
        app.relaunch();
        app.exit(0);
        res.json({ success: true, message: '앱이 재부팅됩니다.' });
    } catch (err) {
        log.error('재부팅 중 오류 발생:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

Connect.post('/shutdown-app', (req, res) => {
    try {
        log.info('프로그램 종료 명령 수신');
        app.quit(); // Electron 앱 종료
        res.json({ success: true, message: '앱이 종료됩니다.' });
    } catch (err) {
        log.error('프로그램 종료 중 오류 발생:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 어드민 세척
Connect.post('/admin-use-wash',  async (req, res) => {
    try {

        log.info("워시 시작");
        const reqBody = req.body;
        log.info("reqBody", reqBody);
        await adminUseWash(reqBody);
        log.info("워시 끝");
        res.json({ success: true, message: '조회 재개 완료' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


module.exports = Connect;