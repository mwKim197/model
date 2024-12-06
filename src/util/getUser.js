const log = require('../logger');
const getUser = async () => {
    try {
        const { default: Store } = await import('electron-store');  // 동적 import 사용
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
        return null;  // 예외 발생 시 null 반환
    }
};

module.exports = getUser;  // 유틸 함수 내보내기