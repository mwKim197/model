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
    if (!user.userId) {
        throw new Error("userId가 필요합니다.");
    }

    // Step 1: userId 기준으로 먼저 전체 데이터 조회
    const userParams = {
        TableName: 'model_mileage',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': user.userId },
        ScanIndexForward: false,  // 내림차순 정렬
    };


    if (lastEvaluatedKey) {
        userParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const userResult = await dynamoDB.query(userParams).promise();

    // Step 2: 조회된 데이터에서 mileageNo 필터링
    let filteredItems = userResult.Items;
    if (searchKey) {
        filteredItems = userResult.Items.filter(item => item.mileageNo.startsWith(searchKey));
    }

    // ✅ limit 개수만큼 데이터 선택
    const paginatedItems = filteredItems.slice(0, limit);

    // ✅ 첫 페이지 여부 확인
    const isFirstPage = !lastEvaluatedKey;

    // ✅ 첫 페이지일 때만 `total`과 `pageKeys` 반환
    const totalCount = isFirstPage ? filteredItems.length : undefined;

    // 전체 페이지 키 계산
    let pageKeys = null;

    if (!lastEvaluatedKey) {
        pageKeys = [];

        if (isFirstPage) {
            for (let i = limit - 1; i < filteredItems.length; i += limit) {
                pageKeys.push({
                    userId: user.userId,
                    uniqueMileageNo: filteredItems[i].uniqueMileageNo
                });
            }
        }
    }

    // ✅ 기존 리턴 형식 유지
    return {
        items: paginatedItems, // 조회된 데이터 (필터링 적용됨)
        total: totalCount, // 🔥 필터링된 데이터 개수 반영
        lastEvaluatedKey: userResult.LastEvaluatedKey ? JSON.stringify(userResult.LastEvaluatedKey) : null,
        pageKeys, // 전체 페이지 키
    };
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

// 계정 확인
const checkMileageExists = async (mileageNo, tel) => {
    try {
        //  1. userId 기반으로 먼저 조회 (기본 테이블에서 직접 조회)
        const params = {
            TableName: 'model_mileage',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': user.userId
            }
        };

        log.info("Query params (userId): ", params);
        const userItems = await dynamoDB.query(params).promise();

        if (!userItems.Items || userItems.Items.length === 0) {
            return {
                success: false,
                message: '해당 userId로 등록된 마일리지 정보가 없습니다.'
            };
        }

        //  2. 조회된 데이터에서 mileageNo 또는 tel이 일치하는 데이터 찾기
        const matchedItem = userItems.Items.find(
            item => (mileageNo && item.mileageNo === mileageNo) || (tel && item.tel === tel)
        );

        if (!matchedItem) {
            return {
                success: false,
                message: '해당 마일리지 번호 또는 연락처를 찾을 수 없습니다.'
            };
        }

        log.info("Matched item: ", matchedItem);

        //  3. uniqueMileageNo 및 데이터 반환
        return {
            exists: true,
            uniqueMileageNo: matchedItem.uniqueMileageNo, // 정확한 uniqueMileageNo 반환
            item: matchedItem, // 실제 찾은 데이터 반환
        };

    } catch (error) {
        log.error(`DynamoDB 마일리지 단건 조회 중 오류 발생. mileageNo: ${mileageNo}, tel: ${tel}`, error);
        throw new Error('마일리지 단건 조회 실패');
    }
};

// 계정 비밀번호 확인
const verifyMileageAndReturnPoints = async (mileageNo, tel, password) => {
    try {
        //  1. userId 기반으로 먼저 조회 (기본 테이블에서 직접 조회)
        const params = {
            TableName: 'model_mileage',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': user.userId
            }
        };

        log.info("Query params (userId): ", params);
        const userItems = await dynamoDB.query(params).promise();

        if (!userItems.Items || userItems.Items.length === 0) {
            return {
                success: false,
                message: '해당 userId로 등록된 마일리지 정보가 없습니다.'
            };
        }

        //  2. 조회된 데이터에서 mileageNo 또는 tel이 일치하는 데이터 찾기
        let matchedItem = null;

        if (mileageNo) {
            matchedItem = userItems.Items.find(item => item.mileageNo === mileageNo);
        }

        if (!matchedItem && tel) {
            matchedItem = userItems.Items.find(item => item.tel === tel);
        }

        //  3. 일치하는 데이터가 없으면 실패 처리
        if (!matchedItem) {
            return {
                success: false,
                message: '해당 마일리지 번호를 찾을 수 없습니다.'
            };
        }

        //  4. 비밀번호 확인
        if (matchedItem.password !== password) {
            return {
                success: false,
                message: '비밀번호가 일치하지 않습니다.'
            };
        }

        //  5. 포인트 정보 반환
        return {
            success: true,
            points: matchedItem.amount || 0,
            mileageNo: matchedItem.mileageNo
        };

    } catch (error) {
        log.error(`DynamoDB 조회 중 오류 발생. userId: ${user.userId}, mileageNo: ${mileageNo}, tel: ${tel}`, error);
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

        // 기존 데이터 삭제
        await dynamoDB.delete({
            TableName: 'model_mileage',
            Key: {userId: user.userId, uniqueMileageNo }
        }).promise();

        // 새로운 데이터 저장
        await dynamoDB.put({
            TableName: 'model_mileage',
            Item: newItem
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