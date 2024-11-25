const log = require('../../logger');
const { readJsonFile, updateJsonFile, addToJsonFile, deleteFromJsonFile } = require('../../util/fileUtil');


const { ipcRenderer } = require('electron');
function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', { level, message });
}

sendLogToMain('info', '렌더러에서 보내는 정보 로그');
sendLogToMain('error', '렌더러 에러 발생');

// JSON TEST 완료
const data = readJsonFile();
log.info("data JSON!!!"+ JSON.stringify(data));

// 페이지 이동 버튼
document.getElementById('goToAdmin').addEventListener('click', () => {
    ipcRenderer.send('navigate-to-page', 'admin'); // 'admin' 페이지로 이동
});

// 페이지 이동 버튼
document.getElementById('goToTest').addEventListener('click', () => {
    ipcRenderer.send('navigate-to-page', 'test'); // 'admin' 페이지로 이동
});


document.getElementById('sendCoffeeSetting').addEventListener('click', () => {
    fetchCoffeeInfo("000","010","100","000");
});

document.getElementById('sendCoffeeUse').addEventListener('click', () => {
    fetchCoffeeUse();
});

document.getElementById('sendCoffeeUse1').addEventListener('click', () => {
    fetchCoffeeUse1();
});
document.getElementById('sendTaeSetting').addEventListener('click', () => {
    fetchTeaInfo("1","040","120");
});

document.getElementById('sendTeaUse').addEventListener('click', () => {
    fetchTeaUse();
});
document.getElementById('sendSyrupSetting').addEventListener('click', () => {
    fetchSyrupInfo("1","040","000","100");
});

document.getElementById('sendSyrupUse').addEventListener('click', () => {
    fetchSyrupUse();
});
document.getElementById('sendIceUse').addEventListener('click', () => {
    fetchIceUse();
});
document.getElementById('sendCupInfo').addEventListener('click', () => {
    fetchCupInfo();
});



const fetchCoffeeInfo = async (grinder1, grinder2, extraction, hotwater) => {
    try {
        const response = await fetch(`http://localhost:3000/serial-order-coffee-setting/${grinder1}/${grinder2}/${extraction}/${hotwater}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        sendLogToMain('info','SCF: ', data);  // 디버깅용 콘솔
        log.info(data);
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        log.error(error);
    }
}

const fetchCoffeeUse = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-order-coffee-use');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        log.info(data);
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        log.error(error);
    }
}

const fetchCoffeeUse1 = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-order-coffee-use1');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        log.info(data);
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        log.error(error);
    }
}

const fetchTeaInfo = async (motor, extraction, hotwater) => {
    try {
        const response = await fetch(`http://localhost:3000/serial-order-tea-setting/${motor}/${extraction}/${hotwater}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        log.info(data);
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        log.error(error);
    }
}

const fetchTeaUse = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-order-tea-use');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        log.info(data);
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        log.error(error);
    }
}

const fetchSyrupInfo = async (syrup, pump, hotwater, sparkling) => {
    try {
        const response = await fetch(`http://localhost:3000/serial-order-syrup-setting/${syrup}/${pump}/${hotwater}/${sparkling}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        log.info(data);
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        log.error(error);
    }
}

const fetchSyrupUse = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-order-syrup-use');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        log.info(data);
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        log.error(error);
    }
}

const fetchIceUse = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-ice-info');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        log.info(data);
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        log.error(error);
    }
}

const fetchCupInfo = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-cup-info');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        log.info(data);
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        log.error(error);
    }
}



