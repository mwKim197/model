const { dynamoDB } = require('../../aws');
const log = require('../../../logger');
const { getCounterValue } = require('./getCount');
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

// 단건 아이템 등록
const addProduct = async (data) => {
    const params = {
        TableName: 'model_menu',
        Item: {
            userId: user.userId,
            menuId: await getCounterValue(user.userId), // 이미지에서 카운터 추가하고 현재 값으로 조회
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


// 전체 아이템 조회
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

// 최근 아이템 조회
const checkProduct = async () => {
    const menuId = await getCounterValue(user.userId);

    const params = {
        TableName: 'model_menu',
        Key: {
            userId: user.userId,
            menuId: menuId,
        },
    };

    try {
        // DynamoDB에서 데이터 조회
        return await dynamoDB.get(params).promise();

    } catch (error) {
        log.info('[DB] 최근메뉴 조회실패:', error.message);
    }
};

// 아이템 삭제
const deleteProduct = async (userId, menuId) => {
    const params = {
        TableName: 'model_menu',
        Key: {
            userId: userId, // 파티션 키
            menuId: menuId, // 정렬 키 (필요한 경우)
        },
    };

    try {
        // DynamoDB에서 항목 삭제
        const result = await dynamoDB.delete(params).promise();
        console.log('[DB] 삭제 성공:', result);
        return {state: true , data: result}
    } catch (error) {

        console.error('[DB] 삭제 실패:', error.message); // 오류 메시지 출력
        return {state: false , messase: error.message}
    }
};

// 아이템 수정
const replaceProduct = async (userId, menuId, newData) => {
    const params = {
        TableName: 'model_menu',
        Item: {
            userId: userId, // 기존 항목의 파티션 키
            menuId: menuId, // 기존 항목의 정렬 키
            ...newData, // 새 데이터
        },
    };

    try {
        // 기존 항목 삭제 없이 새 항목 삽입 (동일한 키로 덮어쓰기)
        await dynamoDB.put(params).promise();
        console.log('[DB] 항목 대체 성공:', menuId);
    } catch (error) {
        console.error('[DB] 항목 대체 실패:', error.message); // 오류 메시지 출력
    }
};


module.exports = {
    addProduct,
    allProduct,
    checkProduct,
    deleteProduct,
    replaceProduct,
};