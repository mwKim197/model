const {addProduct} = require("../db/utils/getMenu");
const log = require("../../logger");
const express = require("express");
const {uploadImageToS3andLocal} = require("./utils/image");
const {memoryStorage} = require("multer");
const multer = require("multer");
const {getCounterValue} = require("../db/utils/getCount");
const Image = express.Router();
const upload = multer({ storage: memoryStorage() }); // 메모리 저장소 사용

Image.post('/upload-image', upload.single('image'), async (req, res) => {
        try {

            const { userId } = req.body; // 메뉴 ID
            const getMenuId = await getCounterValue(userId);
            const file = req.file; // 업로드된 파일
            const bucketName = 'model-narrow-road';

            if (!file || !getMenuId) {
                return res.status(400).json({ success: false, message: '파일과 메뉴 ID가 필요합니다.' });
            }
            const menuId = getMenuId+1;
            // 이미지 업로드 함수 호출
            const result = await uploadImageToS3andLocal(bucketName, file.buffer, file.originalname, getMenuId);

            return res.json({
                success: true,
                message: '이미지 업로드 성공',
                data: result,
            });
        } catch (error) {
            console.error(`이미지 업로드 실패: ${error.message}`);
            res.status(500).json({ success: false, message: '서버 오류 발생', error: error.message });
        }
    });

module.exports = Image;