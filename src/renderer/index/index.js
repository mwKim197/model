const log = require('../../logger');
const { readJsonFile, updateJsonFile, addToJsonFile, deleteFromJsonFile } = require('../../util/fileUtil');
const {convertTimeToHex} = require('../../util/numberConvert');
const { ipcRenderer } = require('electron');
const menuApi = require('../api/menuApi')

// JSON TEST 완료
const data = readJsonFile();

log.info("data JSON!!!"+ JSON.stringify(data));

// 메뉴정보 조회 버튼
document.getElementById('getToMenu').addEventListener('click', () => {
    menuApi.getMenuInfo(); //메뉴 조회
});

// 메뉴정보 전체 조회 버튼
document.getElementById('getToMenuAll').addEventListener('click', async () => {
    const allData = await  menuApi.getMenuInfoAll(); //메뉴 조회
    document.getElementById('dataAll').textContent = JSON.stringify(allData.Items, null, 2);
});

// 메뉴정보 저장 버튼
document.getElementById('setToMenu').addEventListener('click', () => {
    menuApi.setMenuInfo(); //메뉴 조회
});

// 페이지 이동 버튼
document.getElementById('goToAdmin').addEventListener('click', () => {
    ipcRenderer.send('navigate-to-page', 'admin'); // 'admin' 페이지로 이동
});

/*// 페이지 이동 버튼
document.getElementById('goToTest').addEventListener('click', () => {
    ipcRenderer.send('navigate-to-page', 'test'); // 'admin' 페이지로 이동
});*/

// 페이지 이동 버튼
document.getElementById('goToOrder').addEventListener('click', () => {
    ipcRenderer.send('navigate-to-page', 'order'); // 'admin' 페이지로 이동
});


document.getElementById('sendCoffeeUse1Setting').addEventListener('click', () => {
    menuApi.fetchCoffeeInfo("045","000","110","000");
});
document.getElementById('sendCoffeeUse2Setting').addEventListener('click', () => {
    menuApi.fetchCoffeeInfo("000","045","110","140");
});

document.getElementById('sendCoffeeUse').addEventListener('click', () => {
    menuApi.fetchCoffeeUse();
});

document.getElementById('sendCoffeeUse1').addEventListener('click', () => {
    menuApi.fetchCoffeeUse1();
});
document.getElementById('sendTaeSetting').addEventListener('click', () => {
    menuApi.fetchTeaInfo("1","040","120");
});

document.getElementById('sendTeaUse').addEventListener('click', () => {
    menuApi.fetchTeaUse();
});
document.getElementById('sendSyrupSetting').addEventListener('click', () => {
    menuApi.fetchSyrupInfo("1","040","000","100");
});

document.getElementById('sendSyrupUse').addEventListener('click', () => {
    menuApi.fetchSyrupUse();
});
document.getElementById('sendWaterTime').addEventListener('click', () => {
    const waterItem = document.getElementById('setWaterTime').value;
    if(waterItem) {
        // 10 진수 16진수로 변경
        const time = convertTimeToHex(waterItem);
        menuApi.fetchWaterTime(time);
    }

});
document.getElementById('sendIceTime').addEventListener('click', () => {
    const iceItem = document.getElementById('setIceTime').value;
    if(iceItem) {
        // 10 진수 16진수로 변경
        const time = convertTimeToHex(iceItem);
        menuApi.fetchIceTime(time);
    }

});
document.getElementById('sendIceRun').addEventListener('click', () => {
    menuApi.fetchIceRun();
});
document.getElementById('sendIceStop').addEventListener('click', () => {
    menuApi.fetchIceStop();
});
document.getElementById('sendCupInfo').addEventListener('click', () => {
    menuApi.fetchCupInfo();
});
document.getElementById('sendCupPlUse').addEventListener('click', () => {
    menuApi.fetchCupPlUse();
});
document.getElementById('sendCupPaUse').addEventListener('click', () => {
    menuApi.fetchCupPaUse();
});
