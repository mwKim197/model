const { dynamoDB, s3} = require('../../aws');
const log = require('../../../logger');
const { getCounterValue, incrementCounter} = require('./getCount');
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
        // 1. 테이블 전체 스캔하여 현재 순번 배열 가져오기
        const scanParams = {
            TableName: 'model_menu',
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': user.userId,
            },
        };

        const existingItemsResult = await dynamoDB.scan(scanParams).promise();
        const existingItems = existingItemsResult.Items || [];

        // 현재 순번 배열 정렬
        const currentNos = existingItems.map(item => item.no).sort((a, b) => a - b);
        log.info(`[DEBUG] Current nos: ${currentNos}`);

        // 2. 신규 아이템 삽입 위치 이후의 순번 증가 처리
        const insertNo = data.no;

        for (let item of existingItems) {
            if (item.no >= insertNo) {
                const updateParams = {
                    TableName: 'model_menu',
                    Key: {
                        userId: item.userId,
                        menuId: item.menuId,
                    },
                    UpdateExpression: 'SET #no = :newNo',
                    ExpressionAttributeNames: {
                        '#no': 'no',
                    },
                    ExpressionAttributeValues: {
                        ':newNo': item.no + 1, // 순번 1 증가
                    },
                };
                await dynamoDB.update(updateParams).promise();
                log.info(`[DEBUG] Updated item no from ${item.no} to ${item.no + 1}`);
            }
        }

        // 3. 신규 아이템 추가
        const newMenuId = await getCounterValue(user.userId); // 새 menuId 생성
        const addParams = {
            TableName: 'model_menu',
            Item: {
                userId: user.userId,
                menuId: newMenuId,
                no: insertNo, // 삽입 위치
                ...data, // 추가 데이터
            },
        };
        await dynamoDB.put(addParams).promise();
        log.info(`[DEBUG] New item added with no: ${insertNo}`);

        // 4. 최종 순번 확인 및 정렬 (정상적인 1,2,3,... 순번 유지)
        const updatedItemsResult = await dynamoDB.scan(scanParams).promise();
        const updatedItems = updatedItemsResult.Items || [];
        const sortedItems = updatedItems.sort((a, b) => a.no - b.no);

        for (let index = 0; index < sortedItems.length; index++) {
            const item = sortedItems[index];
            const correctNo = index + 1; // 1부터 시작하는 순번
            if (item.no !== correctNo) {
                const updateParams = {
                    TableName: 'model_menu',
                    Key: {
                        userId: item.userId,
                        menuId: item.menuId,
                    },
                    UpdateExpression: 'SET #no = :correctNo',
                    ExpressionAttributeNames: {
                        '#no': 'no',
                    },
                    ExpressionAttributeValues: {
                        ':correctNo': correctNo,
                    },
                };
                await dynamoDB.update(updateParams).promise();
                log.info(`[DEBUG] Corrected item no from ${item.no} to ${correctNo}`);
            }
        }

        log.info('[DEBUG] Final sequence update completed.');
    } catch (error) {
        log.error(`[ERROR] Swap and add product failed: ${error.message}`);
        throw error;
    }
};

// 순번 적용 업데이트
const updateMenuAndAdjustNo = async (updatedData, isNew = false) => {
    const { menuId, no: newNo } = updatedData;
    const userId = user.userId;

    try {
        // 1. 테이블 전체에서 현재 `userId`의 데이터 스캔
        const scanParams = {
            TableName: "model_menu",
            FilterExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": userId,
            },
        };

        const existingItemsResult = await dynamoDB.scan(scanParams).promise();
        const existingItems = existingItemsResult.Items || [];

        // 2. 기존 아이템에서 변경 전 `menuId`의 현재 `no` 값 찾기
        const currentItem = existingItems.find((item) => item.menuId === menuId);

        if (!currentItem) {
            throw new Error(`Menu item with menuId ${menuId} not found`);
        }

        const currentNo = currentItem.no; // 기존 순번
        if (currentNo === newNo) {
            // 순번 변경이 없는 경우, 단순 업데이트 처리
            const updateParams = {
                TableName: "model_menu",
                Key: {
                    userId,
                    menuId,
                },
                UpdateExpression: `
                    SET #name = :name, 
                        #category = :category, 
                        #price = :price, 
                        #cup = :cup, 
                        #iceYn = :iceYn, 
                        #empty = :empty, 
                        #iceTime = :iceTime, 
                        #waterTime = :waterTime, 
                        #state = :state, 
                        #items = :items,
                        #image = :image
                `,
                ExpressionAttributeNames: {
                    "#name": "name",
                    "#category": "category",
                    "#price": "price",
                    "#cup": "cup",
                    "#iceYn": "iceYn",
                    "#empty": "empty",
                    "#iceTime": "iceTime",
                    "#waterTime": "waterTime",
                    "#state": "state",
                    "#items": "items",
                    "#image": "image",
                },
                ExpressionAttributeValues: {
                    ":name": updatedData.name,
                    ":category": updatedData.category,
                    ":price": updatedData.price.toString(),
                    ":cup": updatedData.cup,
                    ":iceYn": updatedData.iceYn,
                    ":empty": updatedData.empty,
                    ":iceTime": updatedData.iceTime.toString(),
                    ":waterTime": updatedData.waterTime.toString(),
                    ":state": updatedData.state,
                    ":items": updatedData.items,
                    ":image": updatedData.image,
                },
            };
            console.log("updatedData", updatedData);
            console.log("updatedData.items", updatedData.items);
            await dynamoDB.update(updateParams).promise();
            console.log("Item updated successfully without changing order.");
            return;
        }

        // 5. 순번 조정 로직 (기존 항목 업데이트와 동일)
        const updatePromises = [];

        if (currentNo > newNo) {
            existingItems.forEach((item) => {
                if (item.no >= newNo && item.no < currentNo) {
                    updatePromises.push(
                        dynamoDB
                            .update({
                                TableName: "model_menu",
                                Key: {
                                    userId: item.userId,
                                    menuId: item.menuId,
                                },
                                UpdateExpression: "SET #no = :newNo",
                                ExpressionAttributeNames: {
                                    "#no": "no",
                                },
                                ExpressionAttributeValues: {
                                    ":newNo": item.no + 1,
                                },
                            })
                            .promise()
                    );
                }
            });
        } else {
            existingItems.forEach((item) => {
                if (item.no > currentNo && item.no <= newNo) {
                    updatePromises.push(
                        dynamoDB
                            .update({
                                TableName: "model_menu",
                                Key: {
                                    userId: item.userId,
                                    menuId: item.menuId,
                                },
                                UpdateExpression: "SET #no = :newNo",
                                ExpressionAttributeNames: {
                                    "#no": "no",
                                },
                                ExpressionAttributeValues: {
                                    ":newNo": item.no - 1,
                                },
                            })
                            .promise()
                    );
                }
            });
        }

        // 6. 현재 아이템 업데이트 (새 순번으로 변경)
        const currentItemUpdateParams = {
            TableName: "model_menu",
            Key: {
                userId,
                menuId,
            },
            UpdateExpression: `
                SET #no = :no, 
                    #name = :name, 
                    #category = :category, 
                    #price = :price, 
                    #cup = :cup, 
                    #iceYn = :iceYn, 
                    #empty = :empty, 
                    #iceTime = :iceTime, 
                    #waterTime = :waterTime, 
                    #state = :state, 
                    #items = :items,
                    #image = :image
            `,
            ExpressionAttributeNames: {
                "#no": "no",
                "#name": "name",
                "#category": "category",
                "#price": "price",
                "#cup": "cup",
                "#iceYn": "iceYn",
                "#empty": "empty",
                "#iceTime": "iceTime",
                "#waterTime": "waterTime",
                "#state": "state",
                "#items": "items",
                "#image": "image",
            },
            ExpressionAttributeValues: {
                ":no": newNo,
                ":name": updatedData.name,
                ":category": updatedData.category,
                ":price": updatedData.price.toString(),
                ":cup": updatedData.cup,
                ":iceYn": updatedData.iceYn,
                ":empty": updatedData.empty,
                ":iceTime": updatedData.iceTime.toString(),
                ":waterTime": updatedData.waterTime.toString(),
                ":state": updatedData.state,
                ":items": updatedData.items,
                ":image": updatedData.image,
            },
        };

        updatePromises.push(dynamoDB.update(currentItemUpdateParams).promise());

        // 모든 업데이트 실행
        await Promise.all(updatePromises);
        console.log("Menu updated and order adjusted successfully.");
    } catch (error) {
        console.error("Error updating menu or adjusting order:", error);
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

// 계정으로 전체 아이템 조회
const getAllProductsByUserId = async (userId) => {
    let params = {
        TableName: 'model_menu',
        KeyConditionExpression: '#pk = :pk',
        ExpressionAttributeNames: {
            '#pk': 'userId',
        },
        ExpressionAttributeValues: {
            ':pk': userId,
        },
        ScanIndexForward: true,
    };
    try {
        const result = await dynamoDB.query(params).promise();
        return result.Items || [];
    } catch (error) {
        log.error(`[DB] ${userId}의 메뉴 조회 실패: `, error);
        throw error;
    }
};

// 조회된 아이템 신규 계정에 등록
const duplicateMenuData = async (sourceUserId, targetUserId) => {
    try {
        const bucketName = 'model-narrow-road'; // S3 버킷 이름
        const sourcePrefix = `model/${sourceUserId}/`; // 원본 사용자 경로
        const targetPrefix = `model/${targetUserId}/`; // 대상 사용자 경로

        // 1. 원본 `userId`로 데이터 조회
        const sourceData = await getAllProductsByUserId(sourceUserId);

        if (!sourceData || sourceData.length === 0) {
            log.warn(`[DB] ${sourceUserId}의 데이터가 없습니다.`);
            throw new Error(`${sourceUserId}의 데이터가 없습니다.`);
        }

        // 2. 데이터 복제 (menuId 생성 포함)
        const duplicatedData = await Promise.all(
            sourceData.map(async (item) => {
                const newMenuId = await incrementCounter(targetUserId); // 비동기 menuId 생성
                return {
                    ...item,
                    userId: targetUserId, // 새 사용자 ID로 변경
                    menuId: newMenuId,   // 새로운 menuId 설정
                };
            })
        );

        // 3. S3 이미지 복제
        const listParams = {
            Bucket: bucketName,
            Prefix: sourcePrefix,
        };

        const list = await s3.listObjectsV2(listParams).promise();
        if (list.Contents.length === 0) {
            log.warn(`[S3] ${sourceUserId}의 복사할 이미지가 없습니다.`);
        } else {
            const copyPromises = list.Contents.map(async (item) => {
                const sourceKey = item.Key; // 원본 파일 Key
                const targetKey = sourceKey.replace(sourcePrefix, targetPrefix); // 대상 Key

                const copyParams = {
                    Bucket: bucketName, // 대상 버킷
                    CopySource: encodeURIComponent(`/${bucketName}/${sourceKey}`), // 반드시 인코딩
                    Key: targetKey, // 새 파일 Key
                };

                try {
                    await s3.copyObject(copyParams).promise();
                    log.info(`[S3] 이미지 복사 완료: ${sourceKey} -> ${targetKey}`);
                } catch (error) {
                    log.error(`[S3] 이미지 복사 실패: ${sourceKey} -> ${targetKey}. Error: ${error.message}`);
                    throw error; // 필요하면 여기서 에러를 처리하거나 다시 throw
                }
            });

            await Promise.all(copyPromises);
        }


        // 4. DynamoDB에 저장
        const putPromises = duplicatedData.map((item) => {
            const params = {
                TableName: 'model_menu',
                Item: item,
            };
            return dynamoDB.put(params).promise();
        });

        await Promise.all(putPromises);

        log.info(`[DB & S3] ${sourceUserId}의 데이터를 ${targetUserId}로 복사 완료.`);
        return { success: true, message: `${sourceUserId}의 데이터 및 이미지를 ${targetUserId}로 복사했습니다.` };
    } catch (error) {
        log.error(`[DB] 데이터 복제 실패: `, error);
        throw error; // 에러를 throw해서 호출한 곳에서 처리할 수 있도록 함
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

async function getMenuById(menuId) {
    const params = {
        TableName: 'model_menu', // DynamoDB 테이블 이름
        Key: {
            userId: user.userId, // 파티션 키
            menuId: menuId, // 정렬 키
        },
    };

    try {
        const result = await dynamoDB.get(params).promise();
        return result.Item; // 조회된 항목 반환
    } catch (error) {
        console.error('Error fetching menu by ID:', error);
        throw new Error('Failed to fetch menu');
    }
}

module.exports = {
    swapNoAndAddProduct,
    updateMenuAndAdjustNo,
    addProduct,
    duplicateMenuData,
    allProduct,
    checkProduct,
    deleteProduct,
    replaceProduct,
    getMenuById
};