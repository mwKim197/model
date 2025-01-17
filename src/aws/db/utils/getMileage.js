const { dynamoDB } = require('../../aws');
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

// 등록
const saveMileageToDynamoDB = async (mileageData) => {
    try {
        const now = new Date();
        const kstTimestamp = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC + 9시간 추가

        // DynamoDB 저장 데이터 생성
        const params = {
            TableName: 'model_mileage', // DynamoDB 테이블 이름
            Item: {
                userId: user.userId, // Partition Key
                mileageNo: mileageData.mileageNo, // Sort Key
                amount: mileageData.amount, // 마일리지 포인트
                password: mileageData.password, // 비밀번호
                timestamp: kstTimestamp.toISOString(), // 저장 시각
            },
        };

        // 데이터 저장
        await dynamoDB.put(params).promise();
        log.info(`마일리지 저장 성공: ${mileageData.mileageNo}`);
    } catch (error) {
        log.error('DynamoDB 마일리지 저장 중 오류 발생:', error);
        throw new Error('마일리지 데이터 저장 실패');
    }
};

// 조회
/**
 * DynamoDB에서 마일리지 데이터를 조회하는 함수
 * @param {string} user.userId - 사용자 ID (Partition Key)
 * @param searchKey - 조회키 0000, 01011112222
 * @param {number} limit - 한 페이지에서 조회할 데이터 개수
 * @param {Object} lastEvaluatedKey - DynamoDB 페이징용 시작 키 (null일 경우 첫 페이지)
 * @returns {Object} - 조회된 데이터와 다음 페이지 키
 */
const getMileageFromDynamoDB = async (searchKey, limit = 20, lastEvaluatedKey = null) => {
    try {
        // 기본 Query 파라미터
        const params = {
            TableName: 'model_mileage',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': user.userId,
            },
            Limit: limit,
        };

        // searchKey가 존재하면 mileageNo로 필터 추가
        if (searchKey) {
            params.KeyConditionExpression += ' AND begins_with(mileageNo, :searchKey)';
            params.ExpressionAttributeValues[':searchKey'] = searchKey;
        }

        // 페이징을 위한 시작 키 설정
        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }

        // Query 실행
        const result = await dynamoDB.query(params).promise();

        // 전체 데이터 개수 계산
        const totalParams = {
            TableName: 'model_mileage',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': user.userId,
            },
            Select: 'COUNT',
        };

        if (searchKey) {
            totalParams.KeyConditionExpression += ' AND begins_with(mileageNo, :searchKey)';
            totalParams.ExpressionAttributeValues[':searchKey'] = searchKey;
        }

        const totalResult = await dynamoDB.query(totalParams).promise();

        return {
            items: result.Items,
            lastEvaluatedKey: result.LastEvaluatedKey || null,
            total: totalResult.Count, // 전체 데이터 개수
        };
    } catch (error) {
        log.error(`DynamoDB 마일리지 조회 중 오류 발생. userId: ${user.userId}`, error);
        throw new Error('마일리지 데이터 조회 실패');
    }
};

// 수정
const updateMileageInDynamoDB = async (mileageNo, updateData) => {
    try {
        // UpdateExpression 및 ExpressionAttributeValues 초기화
        let updateExpression = 'SET #points = :points, #note = :note';
        const expressionAttributeNames = {
            '#points': 'amount', // 포인트
            '#note': 'note',    // 메모
        };
        const expressionAttributeValues = {
            ':points': updateData.points,
            ':note': updateData.note || '',
        };

        // 패스워드가 존재할 경우 업데이트 표현식에 추가
        if (updateData.password) {
            updateExpression += ', #password = :password';
            expressionAttributeNames['#password'] = 'password'; // 패스워드
            expressionAttributeValues[':password'] = updateData.password;
        }

        const params = {
            TableName: 'model_mileage',
            Key: {
                userId: user.userId, // Partition Key
                mileageNo: mileageNo, // Sort Key
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW', // 업데이트된 데이터 반환
        };

        const result = await dynamoDB.update(params).promise();
        return result.Attributes; // 업데이트된 데이터 반환
    } catch (error) {
        log.error('DynamoDB 마일리지 수정 중 오류 발생:', error);
        throw new Error('마일리지 수정 실패');
    }
};

// 삭제
const deleteMileageFromDynamoDB = async (mileageNo) => {
    try {
        const params = {
            TableName: 'model_mileage',
            Key: {
                userId: user.userId, // Partition Key
                mileageNo: mileageNo, // Sort Key
            },
        };

        await dynamoDB.delete(params).promise();
        log.info(`마일리지 삭제 성공: ${mileageNo}`);
    } catch (error) {
        log.error('DynamoDB 마일리지 삭제 중 오류 발생:', error);
        throw new Error('마일리지 데이터 삭제 실패');
    }
};

// 마일리지 이용내역 조회
const getMileageHistoryFromDynamoDB = async (mileageNo) => {
    try {
        // Query 파라미터 설정
        const params = {
            TableName: 'model_mileage_history', // 테이블 이름
            KeyConditionExpression: 'userId = :userId AND mileageNo = :mileageNo', // Partition Key와 Sort Key 조건
            ExpressionAttributeValues: {
                ':userId': user.userId,       // Partition Key 값
                ':mileageNo': mileageNo, // Sort Key 값
            },
        };

        // DynamoDB Query 실행
        const result = await dynamoDB.query(params).promise();
        return result.Items || []; // 조회된 데이터 반환
    } catch (error) {
        log.error(`DynamoDB 이용 내역 조회 중 오류 발생. mileageNo: ${mileageNo}`, error);
        throw new Error('이용 내역 조회 실패');
    }
};


module.exports = {
    saveMileageToDynamoDB,
    getMileageFromDynamoDB,
    updateMileageInDynamoDB,
    deleteMileageFromDynamoDB,
    getMileageHistoryFromDynamoDB
}