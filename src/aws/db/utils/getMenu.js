const { dynamoDB } = require('../../aws');
const log = require('../../../logger');
const { initializeCounter, incrementCounter, getCounterValue } = require('./getCount');
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

const addProduct = async (data) => {
    log.info(await incrementCounter(user.userId));
    const params = {
        TableName: 'model_menu',
        Item: {
            userId: user.userId,
            menuId: await incrementCounter(user.userId),
            ...data,
        },
    };

    try {
        // DynamoDB에 아이템 삽입
        await dynamoDB.put(params).promise();
    } catch (error) {
        log.error('[DB] 저장실패: ', error.message);  // 상세 오류 메시지 출력
    }
};



const allProduct = async () => {
    let params = {
        TableName: 'model_menu',       // 테이블 이름
        KeyConditionExpression: '#pk = :pk',   // 파티션 키를 기준으로 조건 지정
        ExpressionAttributeNames: {
            '#pk': 'userId',   // 파티션 키 이름
        },
        ExpressionAttributeValues: {
            ':pk': user.userId,  // 조회할 파티션 키 값
        },
        ScanIndexForward: true,           // 정렬 키를 오름차순으로 정렬 (false는 내림차순)
    };
    try {
        return await dynamoDB.query(params).promise();  // 조회된 항목들
    } catch (error) {
        log.error('[DB] 전체메뉴 조회실패: ', error);
    }
}


const checkProduct = async () => {
    const params = {
        TableName: 'model_menu',
        Key: {
            userId: user.userId,
            menuId: await getCounterValue(user.userId),
        },
    };

    try {
        // DynamoDB에서 데이터 조회
        return await dynamoDB.get(params).promise();

    } catch (error) {
        log.info('[DB] 최근메뉴 조회실패:', error.message);
    }
};


module.exports = {
    addProduct,
    allProduct,
    checkProduct,
};