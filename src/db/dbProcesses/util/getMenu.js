const dynamoDB = require('../../dynamodb_start');
const log = require('../../../logger');
const { initializeCounter, incrementCounter, getCounterValue } = require('./getCount');
const getUser = require('../../../util/getUser');  // 유틸 함수 가져오기
let user;

const processUserAndProduct = async () => {
    // 사용자 정보 가져오기
    user = await getUser();

    if (user) {
        log.info('User Info:', user);
    } else {
        log.error('No user found in store.');

    }
}
processUserAndProduct().then();

const addProduct = async (data) => {
    const params = {
        TableName: 'model_menu',
        Item: {
            userId: user.userId,
            menuId: await incrementCounter(user.userId),
            data: data,
        },
    };

    try {
        // DynamoDB에 아이템 삽입
        await dynamoDB.put(params).promise();
        log.info('Product added successfully');
    } catch (error) {
        log.error('Error adding product:', error.message);  // 상세 오류 메시지 출력
    }
};

/*

// 예시로 제품 데이터 삽입
const newProduct = {
    menuId: 1,
    userId: 'test_user1',

};

addProduct(newProduct).then(() => {
    log.info("set Menu!");
});
*/


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
        const data = await dynamoDB.query(params).promise();
        return data.Items;  // 조회된 항목들
    } catch (error) {
        log.error('Error querying data:', error);
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

    log.info('Check Product Params:', params);  // params 확인용 로그
    try {
        // DynamoDB에서 데이터 조회
        const result = await dynamoDB.get(params).promise();
        log.info('DynamoDB result:', result);  // 결과 로그 출력
        return result;

    } catch (error) {
        log.info('Error checking product:', error.message);
    }
};

// `menuId`로 저장된 데이터 확인
/*
checkProduct(user.userId).then(() => {
    log.info("get Menu!");
});*/

module.exports = {
    addProduct,
    allProduct,
    checkProduct,
};