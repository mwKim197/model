const { dynamoDB } = require('../../aws');
const log = require('../../../logger');
const getUser = require('../../../util/getUser');  // 유틸 함수 가져오기
let user;

const processUserAndProduct = async () => {
    // 사용자 정보 가져오기
    user = await getUser();

    if (user) {
        log.info('[STORE]User Info:', user);
    } else {
        log.error('[STORE]No user found in store.');

    }
}

processUserAndProduct().then();

const saveOrdersToDynamoDB = async (orderData) => {
    try {
        for (const order of orderData) {
            const now = new Date();
            const kstTimestamp = new Date(now.getTime() + 9 * 60 * 60 * 1000) // UTC + 9 시간 추가

            const params = {
                TableName: 'model_payment', // DynamoDB 테이블 이름
                Item: {
                    userId: user.userId, // Partition Key
                    orderId: generateSortKey(kstTimestamp, order), // 고유 주문 ID (Sort Key로 저장 가능)
                    menuId: order.menuId,
                    price: order.price,
                    name: order.name,
                    count: order.count,
                    items: order.item, // 상세 데이터
                    timestamp: kstTimestamp.toISOString(), // 저장 시각
                }
            };

            // 데이터 저장
            await dynamoDB.put(params).promise();
            log.info(`주문 저장 성공: ${order.orderId}`);
        }
    } catch (error) {
        log.error('DynamoDB 저장 중 오류 발생:', error);
    }
}

/**
 * 기간별 주문 데이터를 DynamoDB에서 조회하는 함수
 * @param {string} startDate - 조회 시작 시간 (ISO 8601 형식, 예: "2025-01-01T00:00")
 * @param {string} endDate - 조회 종료 시간 (ISO 8601 형식, 예: "2025-01-02T00:00")
 * @param {boolean} ascending - 정렬 방향 (true: 오름차순, false: 내림차순)
 * @returns {Promise<Array>} - 조회된 주문 데이터
 */
const getOrdersByDateRange = async (startDate, endDate, ascending) =>{
    log.info("startDate", startDate);
    log.info("endDate", endDate);
    log.info("ascending", ascending);
    const params = {
        TableName: 'model_payment',
        KeyConditionExpression: 'userId = :userId AND #ts BETWEEN :startDate AND :endDate',
        ExpressionAttributeValues: {
            ':userId': user.userId,
            ':startDate': startDate,
            ':endDate': endDate
        },
        ExpressionAttributeNames: {
            '#ts': 'timestamp' // 예약어 충돌 방지
        },
        ScanIndexForward: ascending // true: 오름차순, false: 내림차순
    };

    try {
        const result = await dynamoDB.query(params).promise();
        return result.Items; // 조회된 주문 데이터
    } catch (error) {
        log.error('기간별 주문 조회 중 오류 발생:', error);
        return [];
    }
}

const generateSortKey = (kstTimestamp, order) => {
    const timestamp = kstTimestamp.toISOString().slice(0, 19); // 초 단위 시간
    return `${timestamp}-${order.orderId}`;
}

module.exports = {
    saveOrdersToDynamoDB,
    getOrdersByDateRange,
};