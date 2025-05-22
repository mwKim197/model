const log = require('./logger');
const bcrypt =  require('bcrypt');

// DynamoDB 설정
const { dynamoDB } = require('./aws/aws');
const {addSubdomainSafely} = require("./aws/route53/route53");
const {initializeCounter} = require("./aws/db/utils/getCount");
const {setUser, getUser} = require("./util/store");

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
            limitCount: 10,
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
        log.error('회원 가입 실패:', error.message);
    }
};

// 로그인 처리 함수
const loginUser = async (userId, password, ipAddress) => {
    const params = {
        TableName: 'model_user',
        Key: {
            userId: userId,
        },
    };
    let url;

    try {
        const result = await dynamoDB.get(params).promise();

        if (result.Item) {
            const user = result.Item;
            const match = await bcrypt.compare(password, user.password);  // 비밀번호 비교

            if (match) {

                if (ipAddress) {
                    log.info('ip 정보 업데이트 처리');
                    url = await addSubdomainSafely(userId, ipAddress);

                    // 특정 필드만 업데이트하는 방식 사용 (Key와 UpdateExpression 활용)
                    const updateParams = {
                        TableName: 'model_user',
                        Key: { userId: userId },
                        UpdateExpression: "set ipAddress = :ip, url = :url",
                        ExpressionAttributeValues: {
                            ":ip": ipAddress,
                            ":url": url,
                        },
                    };

                    await dynamoDB.update(updateParams).promise();
                }

                // S3 카운터 DB 데이터 생성
                await initializeCounter(user.userId);

                // 사용자 정보를 저장 (예시: 사용자 이름과 ID)
                await setUser({
                    userId: user.userId,
                    name: user.name,  // DB에 name이 있다면 저장
                    ipAddress: user.ipAddress,
                    category: user.category,
                    storeName: user.storeName,
                    tel: user.tel,
                    url: user.url,
                });

                const data = await getUser();

                // 저장된 사용자 정보 확인
                log.info('스토어 회원 정보 확인:', data);
                return { success: true, message: '로그인 성공', user: data };
            } else {
                log.info('패스워드 오류');
            }
        } else {
            log.info('유저 정보 없음');
        }
    } catch (error) {
        log.error('로그인 실패 :', error.message);
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
        log.log("전체 계정 조회 성공:", userIds);
        return userIds;
    } catch (error) {
        log.error("전체 계정 조회실패:", error.message);
        throw error;
    }
};

module.exports = {
    signupUser,
    loginUser,
    getAllUserIds
};
