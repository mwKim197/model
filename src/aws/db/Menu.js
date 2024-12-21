const express = require('express');
const Menu = express.Router();
const {checkProduct, addProduct, allProduct, deleteProduct} = require('./utils/getMenu');
const getUser = require('../../util/getUser');
const log = require("../../logger");
const {uploadImageToS3andLocal} = require("../s3/utils/image");
const {incrementCounter} = require("./utils/getCount");
const multer = require("multer");
const {memoryStorage} = require("multer");
const upload = multer({ storage: memoryStorage() }); // 메모리 저장소 사용

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
        const uploadResult = await uploadImageToS3andLocal(bucketName,file.buffer, file.originalname, getMenuId);
        // 로컬이미지 경로
        menuData.image = uploadResult.localPath;
        log.info(menuData);
        // 순번
        menuData.no = getMenuId;
        // 2. 데이터 저장
        log.info('Saving menu data...');
        const savedData = await addProduct(menuData); // 데이터 저장
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

module.exports = Menu;