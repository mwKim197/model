const log = require('./logger');
const bcrypt =  require('bcrypt');

// DynamoDB 설정
const { dynamoDB } = require('./aws/aws');

// 비밀번호 해시화 함수
const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

// 회원가입 처리 함수
const signupUser = async (userId, password) => {
    const hashedPassword = await hashPassword(password);

    const params = {
        TableName: 'model_user',
        Item: {
            userId: userId,
            password: hashedPassword,  // 해시된 비밀번호 저장
        },
    };

    try {
        await dynamoDB.put(params).promise();
        log.info('User signed up successfully');
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

                // 사용자 정보를 저장 (예시: 사용자 이름과 ID)
                store.set('user', {
                    userId: user.userId,
                    name: user.name,  // DB에 name이 있다면 저장
                    category: user.category,
                    storeName: user.storeName,
                    tel: user.tel
                });
                // 저장된 사용자 정보 확인
                log.info('User stored in electron-store:', store.get('user'));
            } else {
                log.info('Incorrect password');
            }
        } else {
            log.info('User not found');
        }
    } catch (error) {
        log.error('Error during login:', error.message);
    }
};

module.exports = {
    signupUser,
    loginUser
};
