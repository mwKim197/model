const express = require('express');
const Menu = express.Router();
const {checkProduct, addProduct, allProduct, deleteProduct, swapNoAndAddProduct, updateMenuAndAdjustNo, duplicateMenuData,
    getMenuById
} = require('./utils/getMenu');
const { getUser, setUser } = require('../../util/store');
const log = require("../../logger");
const {uploadImageToS3andLocal, deleteImageFromS3andLocal} = require("../s3/utils/image");
const {incrementCounter} = require("./utils/getCount");
const multer = require("multer");
const {memoryStorage} = require("multer");
const { dispenseCup, adminIceOrder, adminDrinkOrder} = require("../../services/serialOrderManager");
const serialDataManager = require("../../services/serialDataManager");
const {serialCommCom1} = require("../../serial/serialCommManager");
const {getOrdersByDateRange, calculateSalesStatistics} = require("./utils/getPayment");
const {updateUserInfo, getUserById} = require("./utils/getUser");
const {saveMileageToDynamoDB, getMileage, updateMileageInDynamoDB, deleteMileageFromDynamoDB,
    getMileageHistory, checkMileageExists, verifyMileageAndReturnPoints, updateMileageAndLogHistory
} = require("./utils/getMileage");
const upload = multer({ storage: memoryStorage() }); // 메모리 저장소 사용
const polling = new serialDataManager(serialCommCom1);

// 유저정보 조회
Menu.get('/get-user-info', async (req, res) => {
    try {
        const data = await getUser();
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json(data);
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

// 특정 메뉴 조회
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

// 메뉴 전체조회
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

// 메뉴저장
Menu.post('/set-menu-info', async (req, res) => {
    try {
        const selectedOptions = req.body; // 클라이언트에서 전송한 JSON 데이터

        // 받은 데이터를 콘솔에 출력
        log.info('Received menu info:', selectedOptions);

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

// 이미지 포함 업데이트
Menu.put('/set-menu-update-info', upload.single('image'), async (req, res) => {

    try {
        let { menuData } = req.body;
        const file = req.file; // 업로드된 파일
        const bucketName = 'model-narrow-road';

        if (typeof menuData === 'string') {
            menuData = JSON.parse(menuData);
        }

        if (!menuData.menuId) {
            return res.status(400).json({ success: false, message: '메뉴 ID가 필요합니다.' });
        }

        // 기존 메뉴 정보 가져오기
        const existingMenu = await getMenuById(menuData.menuId);
        if (!existingMenu) {
            return res.status(404).json({ success: false, message: '해당 메뉴를 찾을 수 없습니다.' });
        }

        // 이미지 처리
        if (file) {
            // 새로운 이미지 업로드
            const uploadResult = await uploadImageToS3andLocal(bucketName, file.buffer, file.originalname, menuData.menuId);
            menuData.image = uploadResult.localPath;

            // 기존 이미지 삭제 (로컬 및 S3)
            if (existingMenu.image) {
                await deleteImageFromS3andLocal(bucketName, existingMenu.image);
            }
        } else {
            // 이미지가 없으면 기존 이미지를 유지
            menuData.image = existingMenu.image;
        }

        // 데이터 업데이트
        log.info('menuData.image : ', menuData.image);
        const updatedData = await updateMenuAndAdjustNo(menuData);
        log.info('Menu data updated successfully.');

        // 성공 응답 반환
        res.json({
            success: true,
            message: '이미지 메뉴 업데이트 완료',
            data: updatedData,
        });
    } catch (err) {
        log.error('Error during update operation:', err.message);

        res.status(500).json({ message: 'Failed to update menu info and image', error: err.message });
    }
});

// 이미지 및 데이터 신규등록
Menu.post('/set-admin-menu-info', upload.single('image'), async (req, res) => {
    try {
        let { menuData } = req.body;
        const data = await getUser();
        const getMenuId = await incrementCounter(data.userId);
        const file = req.file; // 업로드된 파일
        const bucketName = 'model-narrow-road';

        if (typeof menuData === 'string') {
            menuData = JSON.parse(menuData);
        }

        if (!file || !getMenuId) {
            return res.status(400).json({ success: false, message: '파일과 메뉴 ID가 필요합니다.' });
        }
        // 1. 이미지 저장 (로컬 + S3)
        const uploadResult = await uploadImageToS3andLocal(bucketName, file.buffer, file.originalname, getMenuId);
        // 로컬이미지 경로
        menuData.image = uploadResult.localPath;
        // 2. 데이터 저장
        log.info('Saving menu data...');
        const savedData = await swapNoAndAddProduct(menuData); // 데이터 저장
        log.info('Menu data saved successfully.');

        // 3. 성공 응답 반환
        res.json({
            success: true,
            message: '이미지 메뉴 등록 완료',
            data: savedData,
            image: uploadResult.s3Url
        });
    } catch (err) {
        log.error('Error during operation:', err.message);

        // 이미지 롤백 (로컬 파일 삭제)

        // 데이터 롤백 (여기서는 DB에 따라 삭제 처리 필요)
        log.error('Rolling back changes...');
        res.status(500).json({ message: 'Failed to save menu info and image', error: err.message });
    }
});

// 메뉴 삭제
Menu.post('/delete-menu', async (req, res) => {
    try {
        const {userId, menuId} = req.body; // 클라이언트에서 전송한 JSON 데이터

        // 받은 데이터를 콘솔에 출력
        log.info('Received userId:', userId);
        log.info('Received menuId:', menuId);

        // 메뉴 id 숫자로 변환
        const parsedMenuId = parseInt(menuId, 10);
        const data = await deleteProduct(userId, parsedMenuId);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        // 응답을 클라이언트로 보냄
        res.json({
            success: true,
            message: '메뉴 삭제완료',
            data: data,
        });
    } catch (err) {
        log.error(err.message);
        res.status(500).send(err.message);
    }
});

// 어드민 얼음, 물 요청
Menu.post('/serial-admin-ice-order', async (req, res) => {
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

        await adminIceOrder(recipe); // 주문 작업 수행

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

// 어드민 컵 요청
Menu.post('/serial-admin-cup-order', async (req, res) => {
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

        await dispenseCup(recipe); // 주문 작업 수행

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

// 어드민 음료 요청
Menu.post('/serial-admin-drink-order', async (req, res) => {
    try {
        const { recipe } = req.body; // req.body에서 recipe를 가져옵니다.

        if (!recipe) {
            return res.status(400).json({
                status: 400,
                result: "error",
                message: "Recipe is required."
            });
        }

        log.info('serial-admin-drink-order.');
        await polling.stopPolling(); // 주문 작업을 시작하기 전에 조회 정지

        await adminDrinkOrder(recipe); // 주문 작업 수행

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

// 어드민 결제 내역 조회
Menu.get('/get-orders-by-date-range', async (req, res) => {
    const { startDate, endDate, ascending = true } = req.query;

    try {
        // DynamoDB 데이터 조회
        const orders = await getOrdersByDateRange( startDate, endDate, ascending);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({ success: true, data: orders });
    } catch (error) {
        log.error('기간별 주문 데이터 조회 중 오류 발생:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 어드민 기간별 결제 통계 조회
Menu.get('/calculate-sales-statistics', async (req, res) => {
    try {
        // DynamoDB 데이터 조회
        const data = await calculateSalesStatistics();

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.json({ success: true, data: data });
    } catch (error) {
        log.error('기간별 주문 통계 데이터 조회 중 오류 발생:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// user정보 업데이트
Menu.post('/update-user-info', async (req, res) => {
    try {
        const { data } = req.body;
        // 입력 데이터 검증
        if (!data || typeof data !== 'object') {
            return res.status(400).json({
                success: false,
                message: '유효한 updatedData를 제공해야 합니다.',
            });
        }

        log.info('[INFO] 사용자 정보 업데이트 요청:', data);

        // DynamoDB 데이터 업데이트 호출
        const result = await updateUserInfo(data);

        log.info('[INFO] 사용자 정보 업데이트 성공:', result);

        // 성공 응답 반환
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        log.error('[ERROR] 사용자 정보 업데이트 중 오류 발생:', error);

        // 실패 응답 반환
        res.status(500).json({
            success: false,
            message: '사용자 정보 업데이트에 실패했습니다.',
            error: error.message,
        });
    }
});

// 사용자정보 업데이트
Menu.get('/fetch-and-save-user', async (req, res) => {
    try {
        // DynamoDB에서 사용자 정보 조회
        log.info('사용자 정보 조회 요청');
        const userInfo = await getUserById();

        if (!userInfo) {
            return res.status(404).json({
                success: false,
                message: '사용자를 찾을 수 없습니다.',
            });
        }

        // Electron Store에 저장
        await setUser(userInfo);

        log.info('사용자 정보 저장 성공:', userInfo);

        res.status(200).json({
            success: true,
            data: userInfo,
            message: '사용자 정보를 성공적으로 조회하고 저장했습니다.',
        });
    } catch (error) {
        log.error('[ERROR] 사용자 정보 조회 및 저장 중 오류 발생:', error);

        res.status(500).json({
            success: false,
            message: '사용자 정보 조회 및 저장에 실패했습니다.',
            error: error.message,
        });
    }
});

// 마일리지 등록
Menu.post('/mileage-add', async (req, res) => {
    try {
        const mileageData = req.body;
        log.info("마일리지 등록 요청:", JSON.stringify(mileageData));

        // DynamoDB 저장
        await saveMileageToDynamoDB(mileageData);

        res.json({ success: true, message: '마일리지 등록 성공' });
    } catch (err) {
        log.error('마일리지 등록 중 오류 발생:', err);
        res.status(500).json({ success: false, message: '마일리지 등록 실패' });
    }
});



// 마일리지 목록조회
Menu.get('/mileage', async (req, res) => {
    const { limit = "10", searchKey = '', lastEvaluatedKey } = req.query;

    try {
        const parsedKey = lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : null;
        const result = await getMileage(searchKey, parseInt(limit), parsedKey);

        res.json({
            items: result.items,
            total: result.total,
            lastEvaluatedKey: result.lastEvaluatedKey ? JSON.stringify(result.lastEvaluatedKey) : null,
            pageKeys: result.pageKeys
        });
    } catch (error) {
        console.error('마일리지 조회 중 오류 발생:', error);
        res.status(500).json({ message: '마일리지 조회 실패' });
    }
});

// 마일리지 수정
Menu.put('/mileage/:mileageNo', async (req, res) => {
    try {
        const { mileageNo } = req.params;
        const { password, points, note, tel } = req.body;

        // 기존 마일리지 데이터 조회
        const mileageData = await getMileage(mileageNo);
        if (!mileageData) {
            return res.status(404).json({ success: false, message: '마일리지 데이터가 존재하지 않습니다.' });
        }

        // DynamoDB 데이터 업데이트
        const updatedMileage = await updateMileageInDynamoDB(mileageNo, { points, note, password, tel});

        res.json({ success: true, data: updatedMileage });
    } catch (err) {
        log.error('마일리지 수정 중 오류 발생:', err);
        res.status(500).json({ success: false, message: '마일리지 수정 실패' });
    }
});


// 마일리지 삭제
Menu.delete('/mileage/:mileageNo', async (req, res) => {
    try {
        const { mileageNo } = req.params;

        await deleteMileageFromDynamoDB(mileageNo);

        res.json({ success: true, message: '마일리지 삭제 성공' });
    } catch (err) {
        log.error('마일리지 삭제 중 오류 발생:', err);
        res.status(500).json({ success: false, message: '마일리지 삭제 실패' });
    }
});

// 마일리지 이용내역 조회
Menu.get('/mileage-history', async (req, res) => {
    try {
        const { limit = "10", searchKey = '', lastEvaluatedKey } = req.query;

        // 이용 내역 조회 함수 호출
        const parsedKey = lastEvaluatedKey ? JSON.parse(lastEvaluatedKey) : null;
        const usageHistory = await getMileageHistory(searchKey, parseInt(limit), parsedKey);

        res.json({
            items: usageHistory.items,
            total: usageHistory.total,
            lastEvaluatedKey: usageHistory.lastEvaluatedKey ? JSON.stringify(usageHistory.lastEvaluatedKey) : null,
            pageKeys: usageHistory.pageKeys
        });
    } catch (error) {
        log.error('이용 내역 조회 중 오류 발생:', error);
        res.status(500).json({ success: false, message: '이용 내역 조회 실패' });
    }
});

// 마일리지 유저검증
Menu.get('/mileage-user/:mileageNo', async (req, res) => {
    try {
        const { mileageNo } = req.params;

        // 이용 내역 조회 함수 호출
        const userCheck = await checkMileageExists(mileageNo);

        res.json({ success: true, data: userCheck });
    } catch (error) {
        log.error('마일리지 유저 정보 비교 중 오류 발생:', error);
        res.status(500).json({ success: false, message: '마일리지 유저 정보 비교 실패' });
    }
});

// 마일리지 비밀번호 검증
Menu.post('/mileage-user', async (req, res) => {
    try {

        const {mileageNo, password} = req.body;
        log.info("패스워드 검증 :", JSON.stringify(mileageNo, password));

        if (!mileageNo || !password) {
            return res.status(400).json({ error: 'mileageNo와 password를 입력하세요.' });
        }

        // 이용 내역 조회 함수 호출
        const passwordCheck = await verifyMileageAndReturnPoints(mileageNo, password);

        res.json({ success: true, data: passwordCheck });
    } catch (error) {
        log.error('마일리지 유저 패스워드 비교 오류 발생:', error);
        res.status(500).json({ success: false, message: '마일리지 유저 패스워드 비교 실패' });
    }
});

// 마일리지내역 등록
Menu.post('/mileage-transaction', async (req, res) => {
    const { mileageNo, totalAmt, changePoints, type, note } = req.body;

    try {
        // 트랜잭션 처리
        const result = await updateMileageAndLogHistory(mileageNo, totalAmt, changePoints, type, note);
        res.status(200).json({ success: true, message: '트랜잭션 성공', result });
    } catch (error) {
        console.error('트랜잭션 실패:', error.message);
        res.status(500).json({ success: false, message: '트랜잭션 실패', error: error.message });
    }
});

module.exports = Menu;