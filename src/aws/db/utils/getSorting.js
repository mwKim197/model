const { dynamoDB } = require('../../aws');
const log = require('../../../logger');

const initializeMenuOrder = async (menuItems) => {
    const BATCH_SIZE = 25;

    // 1. 메뉴 데이터에 `userId` 추가 및 정렬
    const updatedItems = menuItems.map((item, index) => ({
        ...item,
        no: index + 1, // 순번 재정렬
    }));

    // 2. BatchWriteItem 요청 처리
    for (let i = 0; i < updatedItems.length; i += BATCH_SIZE) {
        const batch = updatedItems.slice(i, i + BATCH_SIZE);

        const params = {
            RequestItems: {
                model_menu: batch.map((item) => ({
                    PutRequest: {
                        Item: item,
                    },
                })),
            },
        };

        try {
            await dynamoDB.batchWrite(params).promise();
            console.log(`[DEBUG] Batch ${i / BATCH_SIZE + 1} updated successfully.`);
        } catch (error) {
            console.error(`[ERROR] Failed to update batch ${i / BATCH_SIZE + 1}:`, error.message);
            throw error;
        }
    }

    console.log('Menu items updated with new order.');
};

/*// 사용 예시
const menuItems = [
    { menuId: 320, name: '아이스아메리카노', price: 120 },
    { menuId: 322, name: '아이스', price: 10 },
    { menuId: 324, name: '핫아메리카노', price: 15 },
    // 추가 데이터...
];

initializeMenuOrder(menuItems).catch((error) => {
    console.error('Failed to initialize menu order:', error.message);
});*/


const updateMenuOrder = async (menuItems, targetNo, newNo) => {
    // 1. 대상 항목을 찾기
    const targetItem = menuItems.find((item) => item.no === targetNo);
    if (!targetItem) {
        throw new Error(`Item with no=${targetNo} not found.`);
    }

    // 2. 대상 항목의 no 값을 새로 지정
    targetItem.no = newNo;

    // 3. 나머지 항목 재정렬
    const updatedItems = menuItems
        .filter((item) => item.no !== targetNo) // 대상 항목 제외
        .concat(targetItem) // 수정된 항목 추가
        .sort((a, b) => a.no - b.no) // 기존 no 기준으로 정렬
        .map((item, index) => ({
            ...item,
            no: index + 1, // 순번 재정렬
        }));

    // 4. DynamoDB에 업데이트 (BatchWrite 사용)
    const BATCH_SIZE = 25;
    for (let i = 0; i < updatedItems.length; i += BATCH_SIZE) {
        const batch = updatedItems.slice(i, i + BATCH_SIZE);

        const params = {
            RequestItems: {
                MenuTable: batch.map((item) => ({
                    PutRequest: {
                        Item: item,
                    },
                })),
            },
        };

        try {
            await dynamoDB.batchWrite(params).promise();
            log.info(`[DEBUG] Batch updated: ${i / BATCH_SIZE + 1}`);
        } catch (error) {
            log.error(`[ERROR] Failed to update batch ${i / BATCH_SIZE + 1}:`, error.message);
            throw error;
        }
    }

    log.info('Menu items updated with new order.');
};

/*
// 사용 예시
const menuItems = [
    { no: 1, menuId: 320, name: '아이스아메리카노', price: 120 },
    { no: 2, menuId: 322, name: '아이스', price: 10 },
    { no: 99, menuId: 324, name: '핫아메리카노', price: 15 },
    // 추가 데이터...
];

updateMenuOrder(menuItems, 99, 1).catch((error) => {
    console.error('Failed to update menu order:', error.message);
});
*/

module.exports = {
    initializeMenuOrder,
    updateMenuOrder
};