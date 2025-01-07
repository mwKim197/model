const { dynamoDB, s3} = require('../../aws');
const log = require('../../../logger');
const { getUser } = require('../../../util/store');  // 유틸 함수 가져오기

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

// user 정보 업데이트
const updateUserInfo = async (updatedData) => {
    const params = {
        TableName: 'model_user',
        Key: {
            userId: user.userId // Partition Key
        },
        UpdateExpression: 'SET ' + Object.keys(updatedData).map((key, idx) => `#key${idx} = :val${idx}`).join(', '),
        ExpressionAttributeNames: Object.keys(updatedData).reduce((acc, key, idx) => {
            acc[`#key${idx}`] = key; // 필드 이름 매핑
            return acc;
        }, {}),
        ExpressionAttributeValues: Object.keys(updatedData).reduce((acc, key, idx) => {
            acc[`:val${idx}`] = updatedData[key]; // 필드 값 매핑
            return acc;
        }, {}),
        ReturnValues: 'UPDATED_NEW' // 업데이트 후 새로운 값 반환
    };

    try {
        const result = await dynamoDB.update(params).promise();
        log.info('사용자 정보 업데이트 성공:', result);
        return result.Attributes; // 업데이트된 데이터 반환
    } catch (error) {
        log.error('사용자 정보 업데이트 중 오류 발생:', error.message);
        throw error;
    }
};

// user 정보 조회
const getUserById = async () => {
    const params = {
        TableName: 'model_user',
        Key: {
            userId: user.userId // Partition Key
        }
    };

    try {
        const result = await dynamoDB.get(params).promise();

        // 조회된 데이터 반환
        if (result.Item) {
            return result.Item;
        } else {
            throw new Error('사용자를 찾을 수 없습니다.');
        }
    } catch (error) {
        log.error('사용자 정보 조회 중 오류 발생:', error.message);
        throw error;
    }
};

module.exports = {
    updateUserInfo,
    getUserById
}