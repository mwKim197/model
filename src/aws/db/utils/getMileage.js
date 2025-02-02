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

// 랜덤마일리지 고유키
function generateUniqueMileageNo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 1~12월
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // 랜덤 4자리 추가
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();

    return `${year}${month}${day}${hours}${minutes}${seconds}${randomPart}`;
}

// 등록
const saveMileageToDynamoDB = async (mileageData) => {
    try {
        const now = new Date();
        const kstTimestamp = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC + 9시간 추가

        // 고유한 mileageNo 생성 (Sort Key)
        const uniqueMileageNo = generateUniqueMileageNo();

        // DynamoDB 저장 데이터 생성
        const newItem = {
            userId: user.userId, // Partition Key
            uniqueMileageNo: uniqueMileageNo, // Sort Key
            mileageNo: mileageData.mileageNo, // 마일리지 번호
            amount: mileageData.amount, // 마일리지 포인트
            password: mileageData.password, // 비밀번호
            tel: mileageData.tel, // 연락처
            timestamp: kstTimestamp.toISOString(), // 저장 시각
        };

        // DynamoDB에 데이터 저장
        const params = {
            TableName: 'model_mileage',
            Item: newItem,
        };

        // 데이터 저장
        await dynamoDB.put(params).promise();
        log.info(`마일리지 저장 성공: ${mileageData.mileageNo}`);

        // 등록된 데이터 반환
        return newItem;
    } catch (error) {
        log.error('DynamoDB 마일리지 저장 중 오류 발생:', error);
        throw new Error('마일리지 데이터 저장 실패');
    }
};

// 조회
// 마일리지 조회 변경
/**
 * DynamoDB에서 마일리지 데이터를 조회하는 함수
 * @param searchKey - 조회키 0000, 01011112222
 * @param {number} limit - 한 페이지에서 조회할 데이터 개수
 * @param {Object} lastEvaluatedKey - DynamoDB 페이징용 시작 키 (null일 경우 첫 페이지)
 * @returns {Object} - 조회된 데이터와 다음 페이지 키
 */
const getMileage = async (searchKey, limit, lastEvaluatedKey) => {
    let keyCondition = 'userId = :userId';
    const expressionValues = { ':userId': user.userId };

    if (searchKey) {
        keyCondition += ' AND begins_with(mileageNo, :searchKey)';
        expressionValues[':searchKey'] = searchKey;
    }

    return await queryWithPagination('model_mileage', keyCondition, expressionValues, limit, lastEvaluatedKey);
};

/**
 * DynamoDB에서 마일리지 이용내역을 조회하는 함수
 * @param uniqueMileageNo - 조회할 uniqueMileageNo 값
 * @param {number} limit - 한 페이지에서 조회할 데이터 개수
 * @param {Object} lastEvaluatedKey - DynamoDB 페이징용 시작 키 (null일 경우 첫 페이지)
 * @returns {Object} - 조회된 데이터와 다음 페이지 키
 */
const getMileageHistory = async (uniqueMileageNo, limit, lastEvaluatedKey) => {
    const keyCondition = 'userId = :userId AND begins_with(uniqueMileageNo_timestamp, :uniqueMileageNo)';
    const expressionValues = {
        ':userId': user.userId, // Partition Key 유지
        ':uniqueMileageNo': uniqueMileageNo, //  uniqueMileageNo 기반 조회
    };

    return await queryWithPagination(
        'model_mileage_history',
        keyCondition,
        expressionValues,
        limit,
        lastEvaluatedKey
    );
};


// 페이징 공통
const queryWithPagination = async (tableName, keyConditionExpression, expressionAttributeValues, limit = 20, lastEvaluatedKey = null) => {
    try {
        // 기본 Query 파라미터
        const params = {
            TableName: tableName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            Limit: limit,
        };

        if (lastEvaluatedKey) {
            params.ExclusiveStartKey = lastEvaluatedKey;
        }

        // Query 실행
        const result = await dynamoDB.query(params).promise();

        // 전체 데이터 개수 계산
        const totalParams = {
            TableName: tableName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
            Select: 'COUNT', // 전체 데이터 개수만 반환
        };

        const totalResult = await dynamoDB.query(totalParams).promise();

        // 전체 페이지에 대한 pageKeys 계산
        let pageKeys = null;

        if (!lastEvaluatedKey) {
            pageKeys = [];
            let currentLastEvaluatedKey = null;

            do {
                const pageParams = { ...params };
                if (currentLastEvaluatedKey) {
                    pageParams.ExclusiveStartKey = currentLastEvaluatedKey;
                }

                const pageResult = await dynamoDB.query(pageParams).promise();
                currentLastEvaluatedKey = pageResult.LastEvaluatedKey;

                if (currentLastEvaluatedKey) {
                    pageKeys.push(currentLastEvaluatedKey);
                }
            } while (currentLastEvaluatedKey);
        }

        // 반환 데이터 구성
        return {
            items: result.Items, // 현재 페이지 데이터
            lastEvaluatedKey: result.LastEvaluatedKey || null, // 다음 페이지의 시작 키
            total: totalResult.Count, // 전체 데이터 개수
            pageKeys, // 모든 페이지의 시작 키
        };
    } catch (error) {
        log.error('DynamoDB 페이징 쿼리 중 오류 발생:', error.message);
        throw new Error('DynamoDB 데이터 조회 실패');
    }
};

// 계정확인
const checkMileageExists = async (mileageNo, tel) => {
    try {
        let result;

        if (mileageNo) {
            // mileageNo 인덱스를 사용하여 조회
            const params = {
                TableName: 'model_mileage',
                IndexName: 'mileageNo-index', // 🔥 GSI 사용
                KeyConditionExpression: 'mileageNo = :mileageNo',
                ExpressionAttributeValues: {
                    ':mileageNo': mileageNo
                },
                Limit: 1, // 단건 조회
            };
            log.info("Query params (mileageNo): ", params);
            result = await dynamoDB.query(params).promise();
        }

        if ((!result || result.Items.length === 0) && tel) {
            // tel 인덱스를 사용하여 조회
            const params = {
                TableName: 'model_mileage',
                IndexName: 'tel-index', // 🔥 GSI 사용
                KeyConditionExpression: 'tel = :tel',
                ExpressionAttributeValues: {
                    ':tel': tel
                },
                Limit: 1, // 단건 조회
            };
            log.info("Query params (tel): ", params);
            result = await dynamoDB.query(params).promise();
        }

        log.info("Query result: ", result);

        // 조회된 결과가 있다면 uniqueMileageNo 반환
        if (result && result.Items.length > 0) {
            const item = result.Items[0]; // 첫 번째 결과 아이템
            return {
                exists: true,
                uniqueMileageNo: item.uniqueMileageNo, // uniqueMileageNo 정보 반환
                item, // 추가적으로 필요한 정보 포함
            };
        }

        return { exists: false, uniqueMileageNo: null, item: null }; // 조회된 결과가 없으면 false 반환
    } catch (error) {
        log.error(`DynamoDB 마일리지 단건 조회 중 오류 발생. mileageNo: ${mileageNo}, tel: ${tel}`, error);
        throw new Error('마일리지 단건 조회 실패');
    }
};

// 계정 비밀번호 확인
const verifyMileageAndReturnPoints = async (mileageNo, tel, password) => {
    try {
        let result;

        if (mileageNo) {
            // mileageNo 인덱스를 사용하여 조회
            const params = {
                TableName: 'model_mileage',
                IndexName: 'mileageNo-index',  // 🔥 GSI 사용
                KeyConditionExpression: 'mileageNo = :mileageNo',
                ExpressionAttributeValues: {
                    ':mileageNo': mileageNo
                },
                Limit: 1, // 단건 조회
            };
            log.info("Query params (mileageNo): ", params);
            result = await dynamoDB.query(params).promise();
        }

        if ((!result || result.Items.length === 0) && tel) {
            // tel 인덱스를 사용하여 조회
            const params = {
                TableName: 'model_mileage',
                IndexName: 'tel-index',  // 🔥 GSI 사용
                KeyConditionExpression: 'tel = :tel',
                ExpressionAttributeValues: {
                    ':tel': tel
                },
                Limit: 1, // 단건 조회
            };
            log.info("Query params (tel): ", params);
            result = await dynamoDB.query(params).promise();
        }

        log.info("Query result: ", result);

        // 조회된 아이템이 있는지 확인
        if (result.Items && result.Items.length > 0) {
            const mileageData = result.Items[0];

            // 비밀번호 비교
            if (mileageData.password === password) {
                // 성공: 포인트 정보 반환
                return {
                    success: true,
                    points: mileageData.amount || 0, // 포인트 정보 반환
                    mileageNo: mileageNo,
                };
            } else {
                // 실패: 비밀번호 불일치
                return {
                    success: false,
                    message: '비밀번호가 일치하지 않습니다.',
                };
            }
        }

        // 실패: 조회된 데이터 없음
        return {
            success: false,
            message: '해당 마일리지 번호를 찾을 수 없습니다.',
        };
    } catch (error) {
        log.error(`DynamoDB 조회 중 오류 발생. userId: ${user.userId}, mileageNo: ${mileageNo}`, error);
        throw new Error('마일리지 정보 확인 실패');
    }
};

// 수정
const updateMileageInDynamoDB = async (uniqueMileageNo, updateData) => {
    try {
        const existingData = await dynamoDB.get({
            TableName: 'model_mileage',
            Key: {userId: user.userId, uniqueMileageNo }
        }).promise();

        if (!existingData.Item) {
            throw new Error('해당 마일리지 정보를 찾을 수 없습니다.');
        }

        // 새 데이터 생성
        const newItem = {
            ...existingData.Item, // 기존 데이터 복사
            mileageNo: updateData.mileageNo, // 새로운 mileageNo 적용
            amount: updateData.points,
            note: updateData.note || '',
            tel: updateData.tel || '',
        };

        if (updateData.password) {
            newItem.password = updateData.password;
        }

        // 새로운 데이터 저장
        await dynamoDB.put({
            TableName: 'model_mileage',
            Item: newItem
        }).promise();

        // 기존 데이터 삭제
        await dynamoDB.delete({
            TableName: 'model_mileage',
            Key: {userId: user.userId, uniqueMileageNo }
        }).promise();

        return newItem;
    } catch (error) {
        log.error('DynamoDB 마일리지 수정 중 오류 발생:', error);
        throw new Error('마일리지 수정 실패');
    }
};

// 삭제
const deleteMileageFromDynamoDB = async (uniqueMileageNo) => {
    try {
        const params = {
            TableName: 'model_mileage',
            Key: {
                userId: user.userId, // Partition Key
                uniqueMileageNo: uniqueMileageNo, // Sort Key
            },
        };

        await dynamoDB.delete(params).promise();
        log.info(`마일리지 삭제 성공: ${uniqueMileageNo}`);
    } catch (error) {
        log.error('DynamoDB 마일리지 삭제 중 오류 발생:', error);
        throw new Error('마일리지 데이터 삭제 실패');
    }
};

/** 세자리 콤마 숫자로 변경*/
const cleanNumber = (value) => Number(String(value).replace(/,/g, ''));

/**
 * DynamoDB 트랜잭션으로 마일리지 처리 마일리지 수정, 마일리지이용내역 등록
 * @param {string} uniqueMileageNo - 마일리지 유니크 키
 * @param {string} totalAmtNum - 전체결제금액
 * @param {number} changePointsNum - 변경할 포인트 (양수: 적립, 음수: 사용)
 * @param {string} type - 작업 유형 (earn, use, rollback, delete 등)
 * @param {string} note - 작업 설명
 */
const updateMileageAndLogHistory = async (uniqueMileageNo, totalAmtNum, changePointsNum, type, note) => {
    try {
        const now = new Date();
        const kstTimestamp = new Date(now.getTime() + 9 * 60 * 60 * 1000); // UTC + 9시간 추가
        const historySortKey = `${uniqueMileageNo}#${kstTimestamp.toISOString()}`;

        // 입력값을 숫자로 변환
        const totalAmt = cleanNumber(totalAmtNum);
        const changePoints = cleanNumber(changePointsNum);

        // 트랜잭션: model_mileage 업데이트
        const updateParams = {
            TransactItems: [
                {
                    Update: {
                        TableName: 'model_mileage',
                        Key: { userId: user.userId, uniqueMileageNo: uniqueMileageNo }, // ✅ 변경
                        UpdateExpression: 'SET #points = if_not_exists(#points, :start) + :changePoints',
                        ExpressionAttributeNames: { '#points': 'amount' },
                        ExpressionAttributeValues: {
                            ':start': 0,
                            ':changePoints': changePoints,
                        },
                        ReturnValuesOnConditionCheckFailure: 'ALL_OLD',
                    },
                },
            ],
        };

        await dynamoDB.transactWrite(updateParams).promise();

        // 업데이트된 최종 금액을 조회 (uniqueMileageNo 기반)
        const getParams = {
            TableName: 'model_mileage',
            Key: { userId: user.userId, uniqueMileageNo: uniqueMileageNo }, // ✅ 변경
        };
        const result = await dynamoDB.get(getParams).promise();

        if (!result.Item) {
            throw new Error('마일리지 데이터를 찾을 수 없습니다.');
        }

        const updatedAmount = result.Item.amount;

        // 이용 내역 기록 (uniqueMileageNo 기반)
        const historyParams = {
            TableName: 'model_mileage_history',
            Item: {
                userId: user.userId,
                uniqueMileageNo_timestamp: historySortKey, // ✅ uniqueMileageNo 기반 Key
                timestamp: kstTimestamp.toISOString(),
                totalAmt: totalAmt,
                type,
                points: changePoints,
                amount: updatedAmount, // 업데이트된 최종 금액
                note,
            },
        };

        await dynamoDB.put(historyParams).promise();
        log.info('마일리지 트랜잭션 성공');
        return { success: true, updatedAmount };
    } catch (error) {
        log.error('오류 발생:', error.message);
        throw new Error('마일리지 업데이트 실패');
    }
};

// 마일리지 사용
// 마일리지 사용취소



module.exports = {
    saveMileageToDynamoDB,
    getMileage,
    getMileageHistory,
    checkMileageExists,
    verifyMileageAndReturnPoints,
    updateMileageInDynamoDB,
    deleteMileageFromDynamoDB,
    updateMileageAndLogHistory
}