const log = require('../../logger');
const { ipcRenderer } = require('electron');
const { API_BASE_URL, isDevelopment } = require('../../config/apiConfig');

const getUser = () => ipcRenderer.invoke('get-user-data');
const setUser = (user) => ipcRenderer.invoke('set-user-data', user);

const MACHINE_USER_API = `${API_BASE_URL}/model_user_setting`;

const setUserInfo = async (userInfo) => {
    const response = await fetch(`${API_BASE_URL}/model_new_store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userInfo),
    });
    const data = await response.json();
    log.info('setUserInfo response:', response.status, data);
    return { status: response.status, data };
};

const setUserLogin = async (userInfo) => {
    const response = await fetch(`${MACHINE_USER_API}?func=machine-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userInfo),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || response.statusText || '로그인 실패');
    }
    const storedUser = { ...data.user, machineToken: data.machineToken };
    await setUser(storedUser);
    return { success: true, message: '로그인 성공', user: storedUser };
};

const fetchAndSaveUserInfo = async () => {
    const currentUser = await getUser();
    if (!currentUser?.userId || (!isDevelopment && !currentUser?.machineToken)) {
        throw new Error('머신 로그인이 필요합니다.');
    }
    const headers = {};
    if (currentUser.machineToken) headers.Authorization = `Bearer ${currentUser.machineToken}`;
    const response = await fetch(
        `${MACHINE_USER_API}?func=machine-get-user&userId=${encodeURIComponent(currentUser.userId)}`,
        { headers },
    );
    const result = await response.json();
    if (!response.ok || !result.success) {
        throw new Error(result.message || '매장 정보 조회 실패');
    }
    await setUser({ ...result.user, ...(currentUser.machineToken && { machineToken: currentUser.machineToken }) });
    return { success: true, data: result.user };
};

const postMachineHealthCheck = async () => {
    const response = await fetch(`${API_BASE_URL}/model_machine_health_check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    return { status: response.status, data };
};

module.exports = { setUserInfo, setUserLogin, fetchAndSaveUserInfo, postMachineHealthCheck };
