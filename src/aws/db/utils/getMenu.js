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
// 순번 적용 등록
const swapNoAndAddProduct = async (data) => {

    try {
        // 1. 테이블 스캔하여 동일한 `no` 값이 있는 아이템 찾기
        const scanParams = {
            TableName: 'model_menu',
            FilterExpression: '#no = :desiredNo AND userId = :userId',
            ExpressionAttributeNames: {
                '#no': 'no',
            },
            ExpressionAttributeValues: {
                ':desiredNo': data.no,
                ':userId': user.userId,
            },
        };

        const existingItemResult = await dynamoDB.scan(scanParams).promise();
        const existingItem = existingItemResult.Items && existingItemResult.Items.length > 0
            ? existingItemResult.Items[0]
            : null;

        if (existingItem) {
            log.info(`[DEBUG] Found existing item:`, existingItem);

            // 2. 기존 아이템의 순번을 임시 값(-1)으로 변경
            const tempNo = -1;
            const updateOldItemParams = {
                TableName: 'model_menu',
                Key: {
                    userId: existingItem.userId,
                    menuId: existingItem.menuId,
                },
                UpdateExpression: 'SET #no = :tempNo',
                ExpressionAttributeNames: {
                    '#no': 'no',
                },
                ExpressionAttributeValues: {
                    ':tempNo': tempNo,
                },
            };
            await dynamoDB.update(updateOldItemParams).promise();
            log.info(`[DEBUG] Old item's no updated to temporary value: ${tempNo}`);
        } else {
            log.info('[DEBUG] No item found with the specified no.');
        }

        // 3. 새 아이템 등록
        const newNo = data.no;
        const addParams = {
            TableName: 'model_menu',
            Item: {
                userId: user.userId,
                menuId: await getCounterValue(user.userId),
                no: newNo,
                ...data, // 나머지 데이터
            },
        };
        await dynamoDB.put(addParams).promise();
        log.info(`[DEBUG] New item added with no: ${newNo}`);

        // 4. 기존 아이템의 순번을 새 값으로 업데이트
        if (existingItem) {
            const newOldNo = await getMaxNo(user.userId) + 1; // 마지막 번호 뒤로 이동
            const updateOldItemParams = {
                TableName: 'model_menu',
                Key: {
                    userId: existingItem.userId,
                    menuId: existingItem.menuId, // 기존 아이템의 menuId를 사용
                },
                UpdateExpression: 'SET #no = :newOldNo',
                ExpressionAttributeNames: {
                    '#no': 'no',
                },
                ExpressionAttributeValues: {
                    ':newOldNo': newOldNo,
                },
            };
            await dynamoDB.update(updateOldItemParams).promise();
            log.info(`[DEBUG] Old item's no updated to: ${newOldNo}`);
        }
    } catch (error) {
        log.error(`[ERROR] Swap and add product failed: ${error.message}`);
        throw error;
    }
};


const addProduct = async (data) => {
    try {
        // 1. 현재 테이블에서 `no`의 최대 값 가져오기
        const maxNo = await getMaxNo(user.userId);
        // 2. 새로운 아이템의 no는 `maxNo + 1`
        const newNo = maxNo + 1;
        // 3. DynamoDB에 새로운 아이템 등록
        const params = {
            TableName: 'model_menu',
            Item: {
                userId: user.userId, // Partition Key
                no: newNo, // 새로운 순번
                menuId: await getCounterValue(user.userId), // 카운터 값
                ...data, // 추가 데이터
            },
        };

        await dynamoDB.put(params).promise();
        log.info(`[DB] 아이템 등록 성공: ${newNo}`);
    } catch (error) {
        log.error('[DB] 아이템 등록 실패: ', error.message);
        throw error;
    }
};

// 현재 userId에 대한 no의 최대값을 조회
const getMaxNo = async (userId) => {
    const params = {
        TableName: 'model_menu',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
            ':userId': userId,
        },
        ProjectionExpression: '#no', // 예약어를 대체할 Alias 사용
        ExpressionAttributeNames: {
            '#no': 'no', // 'no'를 #no로 매핑
        },
    };

    try {
        const result = await dynamoDB.query(params).promise();
        const noValues = result.Items.map((item) => item.no);

        // no 값 중 가장 큰 값을 반환 (항목이 없을 경우 0 반환)
        return noValues.length > 0 ? Math.max(...noValues) : 0;
    } catch (error) {
        log.error('[DB] no 최대값 조회 실패: ', error.message);
        throw error;
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
        log.info('[DB] 삭제 성공:', result);
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
        log.info('[DB] 항목 대체 성공:', menuId);
    } catch (error) {
        console.error('[DB] 항목 대체 실패:', error.message); // 오류 메시지 출력
    }
};


module.exports = {
    swapNoAndAddProduct,
    addProduct,
    allProduct,
    checkProduct,
    deleteProduct,
    replaceProduct,
};