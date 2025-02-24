const express = require('express');
const Excel = express.Router();
const multer = require("multer");
const path = require('path');
const ExcelJS = require('exceljs');
const {dynamoDB} = require("../aws");

function generateUniqueMileageNo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${year}${month}${day}${hours}${minutes}${seconds}${randomPart}`;
}

// multer 스토리지 설정: 파일을 'uploads' 폴더에 저장
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        // 타임스탬프를 이용해 유니크한 파일명 생성
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// 파일 업로드 및 엑셀 데이터 콘솔 출력 엔드포인트
Excel.post('/upload', upload.single('excel'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('파일 업로드 실패');
    }

    try {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(req.file.path);

        // 첫 번째 시트를 선택
        const worksheet = workbook.getWorksheet(1);
        const items = [];

        // 첫 행을 헤더로 가정하고, 두 번째 행부터 데이터를 읽어 객체 배열로 변환
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
            if (rowNumber === 1) return; // 헤더 행은 건너뜁니다.

            const item = {
                tel: row.getCell(1).value,
                amount: row.getCell(2).value,
                password: row.getCell(3).value
            };
            items.push(item);
        });

        // 파싱한 데이터 콘솔에 출력
        console.log('엑셀 데이터:', items);

        res.json({ message: '파일 업로드 및 데이터 추출 완료', data: items });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '파일 처리 중 에러 발생', error: error.message });
    }
});

Excel.get('/api/mileage/all', async (req, res) => {
    try {
        const params = {
            TableName: 'model_mileage',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': 'zero068'
            }
        };
        const data = await dynamoDB.query(params).promise();
        res.json(data.Items);
    } catch (error) {
        console.error('전체 데이터 조회 오류:', error);
        res.status(500).json({ message: '조회 실패', error: error.message });
    }
});

Excel.post('/merge', async (req, res) => {
    try {
        // 클라이언트가 보낸 Excel 데이터 배열
        const excelData = req.body.data;
        if (!excelData || !Array.isArray(excelData)) {
            return res.status(400).json({ message: 'Excel 데이터가 제공되지 않았습니다.' });
        }

        // 1. DB에서 userId 'zero068'에 해당하는 전체 데이터를 조회
        const params = {
            TableName: 'model_mileage',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': 'zero068' }
        };
        const dbResult = await dynamoDB.query(params).promise();
        const dbData = dbResult.Items || [];

        // 2. DB 데이터를 tel 기준으로 매핑
        const dbMapping = {};
        dbData.forEach(item => {
            dbMapping[item.tel] = item;
        });

        // 3. Excel 데이터를 tel 기준으로 amount 합산 (동일 tel이 여러 건 있을 경우 합산)
        const excelMapping = {};
        excelData.forEach(record => {
            const tel = record.tel;
            const amt = Number(record.amount) || 0;
            if (excelMapping[tel]) {
                excelMapping[tel] += amt;
            } else {
                excelMapping[tel] = amt;
            }
        });

        // 4. 전체 tel의 집합 (DB와 Excel 모두 포함)
        const allTels = new Set([...Object.keys(dbMapping), ...Object.keys(excelMapping)]);
        const mergedRecords = [];

        allTels.forEach(tel => {
            if (dbMapping[tel] && excelMapping[tel] !== undefined) {
                // 두 곳 모두에 존재: 기존 DB amount와 Excel amount 합산
                const dbAmount = Number(dbMapping[tel].amount) || 0;
                const combinedAmount = dbAmount + excelMapping[tel];
                mergedRecords.push({
                    ...dbMapping[tel],
                    amount: combinedAmount,
                    timestamp: new Date().toISOString()
                });
            } else if (dbMapping[tel]) {
                // DB에만 존재: 그대로 사용
                mergedRecords.push(dbMapping[tel]);
            } else if (excelMapping[tel] !== undefined) {
                // Excel에만 존재: 새 레코드 생성 (password는 Excel 데이터에서 가져옴)
                const excelRecord = excelData.find(record => record.tel === tel);
                mergedRecords.push({
                    userId: "zero068",
                    uniqueMileageNo: generateUniqueMileageNo(),
                    mileageNo: tel,
                    tel: tel,
                    password: excelRecord.password,
                    amount: excelMapping[tel],
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 5. mergedRecords 배열(약 580건)을 batchWrite로 DynamoDB에 업서트(업데이트 또는 삽입)
        const BATCH_SIZE = 25;
        for (let i = 0; i < mergedRecords.length; i += BATCH_SIZE) {
            const batch = mergedRecords.slice(i, i + BATCH_SIZE);
            const putRequests = batch.map(item => ({
                PutRequest: { Item: item }
            }));

            const batchParams = {
                RequestItems: {
                    'model_mileage': putRequests
                }
            };

            console.log(JSON.stringify(batchParams));

           /* const result = await dynamoDB.batchWrite(batchParams).promise();
            if (Object.keys(result.UnprocessedItems).length > 0) {
                console.warn('처리되지 않은 항목이 있습니다:', result.UnprocessedItems);
                // 필요 시 재시도 로직 구현 가능
            }*/
        }

        res.json({ message: "Merge 및 업데이트 완료", mergedCount: mergedRecords.length });
    } catch (error) {
        console.error("Merge 및 업데이트 중 오류 발생:", error);
        res.status(500).json({ message: "Merge 및 업데이트 오류", error: error.message });
    }
});


module.exports = Excel;