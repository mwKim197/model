const { contextBridge, ipcRenderer } = require('electron');
const userApi = require('./renderer/api/userApi');
const menuApi = require('./renderer/api/menuApi');
const orderApi = require('./renderer/api/orderApi');
const image = require('./aws/s3/utils/image');

let NODE_SERVER_URL = '';

// 비동기 데이터 로드
(async () => {
    try {
        const userData = await ipcRenderer.invoke('get-user-data');
        NODE_SERVER_URL = userData.url;
        console.log('서버 URL이 설정되었습니다:', NODE_SERVER_URL);
    } catch (error) {
        console.error('Error fetching server URL:', error);
    }
})();

// 공통 유틸 함수
function registerIpcListener(channel, callback) {
    const listener = (event, data) => {
        if (typeof callback === 'function') {
            callback(data);
        } else {
            console.warn('Callback is not a function');
        }
    };

    ipcRenderer.on(channel, listener);

    // 리스너 제거 함수 반환
    return () => ipcRenderer.removeListener(channel, listener);
}

// contextBridge로 안전하게 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // 서버 URL 반환
    getNodeServerUrl: async () => {
        if (!NODE_SERVER_URL) {
            const userData = await ipcRenderer.invoke('get-user-data');
            NODE_SERVER_URL = userData.url;
        }
        return NODE_SERVER_URL;
    },
    getBasePath: async () => {
        try {
            return await ipcRenderer.invoke('get-cache-dir');
        } catch (error) {
            console.error('Error getting base path:', error.message);
            throw error;
        }
    },

    // Main Process로부터 데이터 가져오기
    getUserData: async () => {
        try {
            return await ipcRenderer.invoke('get-user-data');
        } catch (error) {
            console.error('Error fetching user data:', error.message);
            throw error;
        }
    },

    // 사용자 정보 설정
    setUserInfo: async (data) => await userApi.setUserInfo(data),

    // 사용자 로그인 설정
    setUserLogin: async (userInfo) => await userApi.setUserLogin(userInfo),

    // 모든 메뉴조회
    getMenuInfoAll: async () => await menuApi.getMenuInfoAll(),

    // 유저 정보 조회
    getUserInfo: async () => await menuApi.getUserInfo(),

    // 결제처리
    reqVcatHttp: async (price) => await orderApi.reqVCAT_HTTP(price, '00'),

    // 주문 처리
    setOrder: async (orderList) => await orderApi.reqOrder(orderList),

    // S3 이미지 조회 및 캐시 처리
    downloadAllFromS3WithCache: async (bucketName, prefix) =>
        await image.downloadAllFromS3WithCache(bucketName, prefix),

    // polling 으로 받아온 RD1 상태를 노출
    updateSerialData: (callback) => registerIpcListener('update-serial-data', callback),

    // order 플로우를 전달
    updateOrderFlow: (callback) => registerIpcListener('order-update', callback),

    // 페이지 이동
    navigateToPage: (pageName) => ipcRenderer.send('navigate-to-page', { pageName }),

    // 로그 기록
    logToMain: (level, message) => ipcRenderer.send('log-to-main', { level, message }),
});
