const log = require('../../logger');
const { ipcRenderer } = require('electron');

// Main Process로부터 데이터 가져오기
window.onload = async () => {
    try {
        const userData = await ipcRenderer.invoke('get-user-data'); // 데이터 요청
        console.log('User Data from Main Process:', userData);
        if (userData.userId) {
           // ipcRenderer.send('navigate-to-page', {pageName: 'order'});
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
};
