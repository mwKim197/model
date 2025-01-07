const log = require('../logger');

// 사용자 정보 불러오기
const getUser = async () => {
    try {
        const { default: Store } = await import('electron-store'); // 동적 import 사용
        const store = new Store();

        // 저장된 'user' 정보 반환
        const user = store.get('user');

        // 'user' 정보가 없으면 null 반환
        if (!user) {
            return null;
        }

        return user;
    } catch (error) {
        log.error('[STORE] electron-store:', error);
        return null; // 예외 발생 시 null 반환
    }
};

// 사용자 정보 저장하기
const setUser = async (user) => {
    try {
        const { default: Store } = await import('electron-store'); // 동적 import 사용
        const store = new Store();

        if (!user || typeof user !== 'object') {
            throw new Error('유효하지 않은 사용자 데이터입니다.');
        }

        // 'user' 정보를 저장
        store.set('user', user);

        log.info('[STORE] 사용자 정보 저장 성공:', user);
    } catch (error) {
        log.error('[STORE] 사용자 정보 저장 중 오류 발생:', error);
        throw error; // 예외 발생 시 호출한 곳에서 처리할 수 있도록 에러를 던짐
    }
};

module.exports = { getUser, setUser }; // 두 유틸 함수 내보내기