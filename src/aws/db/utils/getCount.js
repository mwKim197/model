const { dynamoDB } = require('../../aws');
const log = require('../../../logger');

const initializeCounter = async (userId) => {
    const params = {
        TableName: 'model_counter',
        Item: {
            counterId: userId,  // userId로 카운터 식별
            counterValue: 0,     // 초기값 (0으로 시작)
        },
    };

    try {
        log.info(params);
        await dynamoDB.put(params).promise();
        console.log(`Counter initialized for ${userId}`);
    } catch (error) {
        console.error('Error initializing counter:', error.message);
    }
};

// 예시로 userId 'test_user1'에 대해 카운터 초기화
//initializeCounter('test_user1');

// 해당 카운터 증가 -> 증가값 반환
const incrementCounter = async (userId) => {
    const params = {
        TableName: 'model_counter',
        Key: { counterId: userId },  // userId로 카운터 조회
        UpdateExpression: 'SET counterValue = counterValue + :inc',  // counterValue 1 증가
        ExpressionAttributeValues: {
            ':inc': 1,
        },
        ReturnValues: 'UPDATED_NEW',  // 업데이트된 값을 반환
    };

    try {
        const result = await dynamoDB.update(params).promise();
        console.log(`Counter incremented for ${userId}:`, result.Attributes.counterValue);
        return result.Attributes.counterValue;
    } catch (error) {
        console.error('Error incrementing counter:', error.message);
        return null;
    }
};

// 예시로 userId 'test_user1'에 대해 카운터 증가
//incrementCounter('test_user1');

// 해당 카운터의 현제 값 반환
const getCounterValue = async (userId) => {
    const params = {
        TableName: 'model_counter',
        Key: { counterId: userId },  // userId로 카운터 조회
    };

    try {
        console.log("count", params)
        const result = await dynamoDB.get(params).promise();
        console.log(result)
        if (result.Item) {
            console.log(`Current counter value for ${userId}:`, result.Item.counterValue);
            return result.Item.counterValue;
        }
        console.log(`Counter not found for ${userId}`);
        return null;
    } catch (error) {
        console.error('Error getting counter value:', error.message);
        return null;
    }
};

// 예시로 userId 'test_user1'에 대해 카운터 값 조회
//getCounterValue('test_user1');

module.exports = {
    initializeCounter,
    incrementCounter,
    getCounterValue
};