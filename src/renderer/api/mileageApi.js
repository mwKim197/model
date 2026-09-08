const log = require('../../logger');
const { ipcRenderer } = require('electron');
const { API_BASE_URL, isDevelopment } = require('../../config/apiConfig');

const MILEAGE_API = `${API_BASE_URL}/model_admin_mileage`;

const getMachineUser = async () => {
    const user = await ipcRenderer.invoke('get-user-data');
    if (!user?.userId || (!isDevelopment && !user?.machineToken)) {
        throw new Error('머신 로그인이 필요합니다.');
    }
    return user;
};

const request = async (func, { method = 'GET', query = {}, body } = {}) => {
    const user = await getMachineUser();
    const url = new URL(MILEAGE_API);
    url.searchParams.set('func', func);
    url.searchParams.set('userId', user.userId);
    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    });
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
    if (user.machineToken) headers.Authorization = `Bearer ${user.machineToken}`;
    const response = await fetch(url, {
        method,
        headers,
        ...(body && { body: JSON.stringify({ ...body, userId: user.userId }) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `마일리지 API 오류 (${response.status})`);
    return data;
};

const checkMileageExists = async ({ mileageNo, tel }) => {
    try {
        return await request('machine-check', { query: { mileageNo, tel } });
    } catch (error) {
        log.error('[MILEAGE API] check:', error);
        throw error;
    }
};

const verifyMileageAndReturnPoints = async ({ mileageNo, tel, password }) => {
    return request('machine-verify', { method: 'POST', body: { mileageNo, tel, password } });
};

const saveMileageToDynamoDB = async ({ mileageNo, password, tel }) => {
    return request('machine-create', { method: 'POST', body: { mileageNo, password, tel } });
};

const updateMileageAndLogHistory = async (uniqueMileageNo, totalAmt, changePoints, type, note, operationId) => {
    if (!operationId) throw new Error('마일리지 처리 식별자가 필요합니다.');
    return request('machine-transaction', {
        method: 'POST',
        body: { uniqueMileageNo, totalAmt, changePoints, type, note, operationId },
    });
};

module.exports = {
    checkMileageExists,
    verifyMileageAndReturnPoints,
    saveMileageToDynamoDB,
    updateMileageAndLogHistory,
};
