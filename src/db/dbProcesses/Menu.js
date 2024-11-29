const dynamoDB = require('../dynamodb_start');
const log = require('../../logger');

const addProduct = async (product) => {
    const params = {
        TableName: 'model_menu',
        Item: {
            menuId: product.menuId,
            userId: product.userId,
        },
    };

    try {
        // DynamoDB에 아이템 삽입
        await dynamoDB.put(params).promise();
        console.log('Product added successfully');
    } catch (error) {
        console.error('Error adding product:', error.message);  // 상세 오류 메시지 출력
    }
};

// 예시로 제품 데이터 삽입
const newProduct = {
    menuId: '0001',
    userId: '테스트유저',

};

/*addProduct(newProduct).then(() => {
    log.info("set Menu!");
});*/

const checkProduct = async (menuId) => {
    const params = {
        TableName: 'model_menu',
        Key: {
            menuId: menuId,
        },
    };

    log.info('Check Product Params:', params);  // params 확인용 로그
    try {
        // DynamoDB에서 데이터 조회
        const result = await dynamoDB.get(params).promise();

        if (result.Item) {
            log.info('Product found:', result.Item);
        } else {
            log.info('Product not found');
        }
    } catch (error) {
        log.info('Error checking product:', error.message);
    }
};

// `menuId`로 저장된 데이터 확인
checkProduct('0001').then(() => {
    log.info("get Menu!");
});