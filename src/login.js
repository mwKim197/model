const log = require('./logger');
const bcrypt =  require('bcrypt');


// DynamoDB 설정
const { dynamoDB } = require('./aws/aws');
const {addSubdomainSafely} = require("./aws/route53/route53");
const {initializeCounter} = require("./aws/db/utils/getCount");

// 비밀번호 해시화 함수
const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

// 회원가입 처리 함수
const signupUser = async (userId, password, ipAddress, storeName, tel) => {
    const hashedPassword = await hashPassword(password);
    const url = await addSubdomainSafely(userId, ipAddress);
    const params = {
        TableName: 'model_user',
        Item: {
            userId: userId,
            password: hashedPassword,  // 해시된 비밀번호 저장
            ipAddress: ipAddress,
            category: [ // 초기 카테고리 저장
                {
                    name: "전체메뉴",
                    no: "0",
                    item: "all"
                },
                {
                    name: "커피(COFFEE)",
                    no: "1",
                    item: "coffee"
                },
                {
                    name: "계절메뉴",
                    no: "2",
                    item: "season"
                },
                {
                    item: "ade",
                    name: "주스/에이드(JUICE/ADE)",
                    no: "3"
                },
                {
                    name: "차(TEA)",
                    no: "4",
                    item: "tea"
                },
                {
                    name: "디저트(DESSERT)",
                    no: "5",
                    item: "dessert"
                }
            ],
            storeName: storeName,
            tel: tel,
            url: url
        },
    };

    try {
        await dynamoDB.put(params).promise();
        log.info('회원 가입 성공');
        return params;
    } catch (error) {
        log.error('Error signing up:', error.message);
    }
};

// 로그인 처리 함수
const loginUser = async (userId, password) => {
    const params = {
        TableName: 'model_user',
        Key: {
            userId: userId,
        },
    };

    try {
        const result = await dynamoDB.get(params).promise();

        if (result.Item) {
            const user = result.Item;
            const match = await bcrypt.compare(password, user.password);  // 비밀번호 비교

            if (match) {
                // 로그인 성공 시 사용자 정보를 electron-store에 저장
                const { default: Store } = await import('electron-store');
                const store = new Store();

                // S3 카운터 DB 데이터 생성
                await initializeCounter(user.userId);

                // 사용자 정보를 저장 (예시: 사용자 이름과 ID)
                store.set('user', {
                    userId: user.userId,
                    name: user.name,  // DB에 name이 있다면 저장
                    ipAddress: user.ipAddress,
                    category: user.category,
                    storeName: user.storeName,
                    tel: user.tel,
                    url: user.url,
                });
                // 저장된 사용자 정보 확인
                log.info('스토어 회원 정보 확인:', store.get('user'));
            } else {
                log.info('페스워드 오류');
            }
        } else {
            log.info('유저 정보 없음');
        }
    } catch (error) {
        log.error('Error during login:', error.message);
    }
};

const getAllUserIds = async () => {
    const params = {
        TableName: "model_user", // 테이블 이름
        ProjectionExpression: "userId", // userId만 가져옴
    };

    try {
        const result = await dynamoDB.scan(params).promise();
        const userIds = result.Items.map(item => item.userId); // userId 배열 생성
        console.log("[INFO] Fetched userIds:", userIds);
        return userIds;
    } catch (error) {
        console.error("[ERROR] Failed to fetch userIds:", error.message);
        throw error;
    }
};



module.exports = {
    signupUser,
    loginUser,
    getAllUserIds
};
