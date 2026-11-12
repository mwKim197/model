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

        log.info(`[STORE] user saved: ${user.userId || 'unknown'}`);
    } catch (error) {
        log.error('[STORE] 사용자 정보 저장 중 오류 발생:', error);
        throw error; // 예외 발생 시 호출한 곳에서 처리할 수 있도록 에러를 던짐
    }
};

// 관리자 등록 흐름에서 호출한다. 외부 HTTP/IPC에는 직접 노출하지 않는다.
const installMachineToken = async (userId, token) => {
    if (typeof userId !== 'string' || !userId || typeof token !== 'string' ||
        !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(token) || token.length > 4096) {
        throw new Error('유효하지 않은 머신 등록 정보입니다.');
    }
    const { default: Store } = await import('electron-store');
    const { API_BASE_URL } = require('../config/apiConfig');
    const store = new Store();
    if (store.get('user')?.userId !== userId) throw new Error('대상 매장이 일치하지 않습니다.');
    const url = new URL(`${API_BASE_URL}/model_user_setting`);
    url.searchParams.set('func', 'machine-verify-enrollment');
    url.searchParams.set('userId', userId);
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    if (!response.ok || !data.success || data.userId !== userId) {
        throw new Error('서버에서 머신 토큰을 검증하지 못했습니다.');
    }
    const current = store.get('user');
    if (current?.userId !== userId) throw new Error('검증 중 매장 설정이 변경됐습니다.');
    if (current.machineToken && current.machineToken !== token) throw new Error('이미 머신 토큰이 등록되어 있습니다.');
    store.set('user', { ...current, machineToken: token });
};

module.exports = { getUser, setUser, installMachineToken };
