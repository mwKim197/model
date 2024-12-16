const log = require('../../logger');
const { ipcRenderer } = require('electron');

// Main Process로부터 데이터 가져오기
window.onload = async () => {
    try {
        const userData = await ipcRenderer.invoke('get-user-data'); // 데이터 요청
        console.log('User Data from Main Process:', userData);
        if (userData.userId) {
           ipcRenderer.send('navigate-to-page', {pageName: 'order'});
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
};

const userApi = require( "../api/userApi");

document.getElementById('signup-form').addEventListener('submit',  async function(event) {
    event.preventDefault(); // 기본 제출 방지

    // 입력된 값 가져오기
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    const ipAddress = document.getElementById('ipAddress').value;
    const storeName = document.getElementById('storeName').value;
    const tel = document.getElementById('tel').value;

    const data = await userApi.setUserInfo({
        userId: userId,
        password: password,
        ipAddress: ipAddress,
        storeName: storeName,
        tel: tel
    });

    console.log(data);
    await userApi.setUserLogin(data.data.Item).then();

    const userData = await ipcRenderer.invoke('get-user-data'); // 데이터 요청
    console.log('User Data from Main Process:', userData);
    if (userData.userId) {
        ipcRenderer.send('navigate-to-page', {pageName: 'order'});
    }
});
