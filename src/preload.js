const { contextBridge, ipcRenderer } = require('electron');
const userApi = require('./renderer/api/userApi'); // Node.js 모듈 동기 로드
const menuApi = require('./renderer/api/menuApi');
const orderApi = require('./renderer/api/orderApi');
const image = require('./aws/s3/utils/image');


let NODE_SERVER_URL = ''; // 서버 URL 초기화

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

// contextBridge로 안전하게 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // 서버 URL 반환
    getNodeServerUrl: () => NODE_SERVER_URL,

    // Main Process로부터 데이터 가져오기
    getUserData: async () => await ipcRenderer.invoke('get-user-data'),

    // 사용자 정보 설정
    setUserInfo: async (data) => await userApi.setUserInfo(data),

    // 사용자 로그인 설정
    setUserLogin: async (userInfo) => await userApi.setUserLogin(userInfo),

    // 모든 메뉴조회
    getMenuInfoAll: async () => await menuApi.getMenuInfoAll(),

    // 유저 정보 조회
    getUserInfo: async ()=> await menuApi.getUserInfo(),

    // 결제처리
    reqVcatHttp: async (price)=> await orderApi.reqVCAT_HTTP(price, "00"),

    // 주문 처리
    setOrder: async (orderList)=>await orderApi.reqOrder(orderList),

    // S3 이미지 조회 및 캐시 처리
    downloadAllFromS3WithCache: async (bucketName, prefix) => await image.downloadAllFromS3WithCache(bucketName, prefix),

    // polling 으로 받아온 RD1상태를 노출한다.
    updateSerialData: async (callback) => ipcRenderer.on('update-serial-data', (event, data) => {
        if (typeof callback === 'function') {
            callback(data); // 전달된 callback 함수 호출
        } else {
            console.warn('Callback is not a function');
        }
    }),

    // order 플로우를 전달한다
    updateOrderFlow: async (callback) => ipcRenderer.on('order-update', (event, data) => {
        if (typeof callback === 'function') {
            callback(data); // 전달된 callback 함수 호출
        } else {
            console.warn('Callback is not a function');
        }
    }),

    // 페이지 이동 (Main Process에 이벤트 전송)
    navigateToPage: (pageName) => ipcRenderer.send('navigate-to-page', { pageName }),
    logToMain: (level, message) => ipcRenderer.send('log-to-main', {level, message}),
});
