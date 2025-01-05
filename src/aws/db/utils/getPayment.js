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

/**
* 주문 DB 저장
*  */
const saveOrdersToDynamoDB = async (orderData) => {
    try {
        // 현재 시간 (KST 기준)
        const now = new Date();
        const kstTimestamp = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC + 9시간 추가

        // orderId 생성 (YYYYMMDDHHmm 형태)
        const orderId = `${kstTimestamp.toISOString().slice(0, 16).replace(/[-T:]/g, '')}-${orderData[0].userId}`;

        // 메뉴 ID, 이름, 수량을 그룹화하여 생성
        const menuSummary = orderData.map(order => ({
            menuId: order.menuId,
            name: order.name,
            count: order.count,
            price: order.price * order.count, // 총 금액 계산
        }));

        // DynamoDB 저장 데이터 생성
        const params = {
            TableName: 'model_payment', // DynamoDB 테이블 이름
            Item: {
                userId: orderData[0].userId, // Partition Key
                orderId: orderId, // Sort Key
                menuSummary: menuSummary, // 메뉴 정보 (ID, 이름, 수량 포함)
                totalPrice: menuSummary.reduce((sum, item) => sum + item.price, 0), // 주문 총 금액
                timestamp: kstTimestamp.toISOString() // 저장 시각
            }
        };

        // 데이터 저장
        await dynamoDB.put(params).promise();
        log.info(`주문 저장 성공: ${orderId}`);

        // 메뉴 통계 업데이트
        for (const item of menuSummary) {
            await updateMenuStatistics({
                userId: user.userId,
                ...item, // menuId, name, count, price 포함
                timestamp: kstTimestamp.toISOString()
            });
        }

    } catch (error) {
        log.error('DynamoDB 저장 중 오류 발생:', error);
    }
};


/**
 * 메뉴별 통계 업데이트
* */
const updateMenuStatistics = async (menuItem) => {
    try {
        const params = {
            TableName: 'model_menu_statistics',
            Key: {
                userId: menuItem.userId, // Partition Key
                menuId: menuItem.menuId  // Sort Key
            },
            UpdateExpression: `
                SET 
                    totalSales = if_not_exists(totalSales, :zero) + :price,
                    totalCount = if_not_exists(totalCount, :zero) + :count,
                    #nm = :name, 
                    lastOrderTimestamp = :timestamp
            `,
            ExpressionAttributeNames: {
                '#nm': 'name' // 예약어 'name' 대신 사용할 대체 이름 정의
            },
            ExpressionAttributeValues: {
                ':price': menuItem.price, // 총 금액
                ':count': menuItem.count, // 판매 수량
                ':zero': 0, // 초기값
                ':name': menuItem.name, // 메뉴 이름
                ':timestamp': menuItem.timestamp // 마지막 주문 시간
            }
        };

        await dynamoDB.update(params).promise();
        log.info(`메뉴 통계 업데이트 성공: ${menuItem.menuId}`);
    } catch (error) {
        log.error('메뉴 통계 업데이트 중 오류 발생:', error);
    }
};

/**
 * 기간별 주문 데이터를 DynamoDB에서 조회하는 함수
 * @param {string} startDate - 조회 시작 시간 (ISO 8601 형식, 예: "2025-01-01T00:00")
 * @param {string} endDate - 조회 종료 시간 (ISO 8601 형식, 예: "2025-01-02T00:00")
 * @param {boolean} ascending - 정렬 방향 (true: 오름차순, false: 내림차순)
 * @returns {Promise<Array>} - 조회된 주문 데이터
 */
const getOrdersByDateRange = async (startDate, endDate, ascending) =>{
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

// 통계용 최소 데이터 조회
const getSalesStatistics = async (startDate, endDate) => {
    if (!user || !user.userId) {
        log.error('유효하지 않은 userId:', user);
        return [];
    }

    const params = {
        TableName: 'model_payment',
        KeyConditionExpression: 'userId = :userId AND #ts BETWEEN :startDate AND :endDate',
        ExpressionAttributeValues: {
            ':userId': user.userId,
            ':startDate': startDate,
            ':endDate': endDate
        },
        ExpressionAttributeNames: {
            '#ts': 'timestamp', // 예약어 충돌 방지
            '#tp': 'totalPrice' // 필요한 다른 필드도 별칭으로 지정
        },
        ProjectionExpression: '#ts, #tp' // 별칭으로 변경
    };

    try {
        const result = await dynamoDB.query(params).promise();
        log.info('쿼리 성공: 조회된 데이터 수:', result.Items.length);
        return result.Items || [];
    } catch (error) {
        log.error('기간별 매출 통계 조회 중 오류 발생:', error.message);
        log.error('에러 스택:', error.stack);
        return [];
    }
};

// 기간별 금액 통계
const calculateSalesStatistics = async () => {
    // 현재 시간 (KST 기준)
    const now = new Date();
    const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC + 9시간

    // 전체 기간 시작과 끝 (필요에 따라 수정 가능)
    const startOfPeriod = '2024-12-01T00:00:00.000Z'; // 조회 시작 (최초 데이터 입력 시점)
    const endOfPeriod = kstNow.toISOString(); // 현재 시간

    // 전체 데이터 조회
    const salesData = await getSalesStatistics(startOfPeriod, endOfPeriod);

    // 통계 초기화
    let totalSales = 0;
    let todaySales = 0;
    let yesterdaySales = 0;
    let currentMonthSales = 0;
    let previousMonthSales = 0;

    // 오늘 시작과 끝
    const todayStart = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate(), 0, 0, 0).toISOString();
    const todayEnd = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate(), 23, 59, 59, 999).toISOString();

    // 전일 시작과 끝
    const yesterdayStart = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate() - 1, 0, 0, 0).toISOString();
    const yesterdayEnd = new Date(kstNow.getFullYear(), kstNow.getMonth(), kstNow.getDate() - 1, 23, 59, 59, 999).toISOString();

    // 당월 시작
    const currentMonthStart = new Date(kstNow.getFullYear(), kstNow.getMonth(), 1, 0, 0, 0).toISOString();

    // 전월 시작과 끝
    const previousMonthStart = new Date(kstNow.getFullYear(), kstNow.getMonth() - 1, 1, 0, 0, 0).toISOString();
    const previousMonthEnd = new Date(kstNow.getFullYear(), kstNow.getMonth(), 0, 23, 59, 59).toISOString();

    // 매출 데이터 순회
    salesData.forEach(sale => {
        const saleDate = new Date(sale.timestamp); // 문자열을 Date 객체로 변환
        const saleAmount = sale.totalPrice || 0;

        totalSales += saleAmount;

        // 오늘 매출
        if (saleDate >= new Date(todayStart) && saleDate <= new Date(todayEnd)) {
            todaySales += saleAmount;
        }

        // 전일 매출
        if (saleDate >= new Date(yesterdayStart) && saleDate <= new Date(yesterdayEnd)) {
            yesterdaySales += saleAmount;
        }

        // 당월 매출
        if (saleDate >= new Date(currentMonthStart)) {
            currentMonthSales += saleAmount;
        }

        // 전월 매출
        if (saleDate >= new Date(previousMonthStart) && saleDate <= new Date(previousMonthEnd)) {
            previousMonthSales += saleAmount;
        }
    });

    return {
        totalSales,
        todaySales,
        yesterdaySales,
        currentMonthSales,
        previousMonthSales,
    };
};

const generateSortKey = (kstTimestamp, order) => {
    const timestamp = kstTimestamp.toISOString().slice(0, 19); // 초 단위 시간
    return `${timestamp}-${order.orderId}`;
}

module.exports = {
    saveOrdersToDynamoDB,
    getOrdersByDateRange,
    calculateSalesStatistics,
};