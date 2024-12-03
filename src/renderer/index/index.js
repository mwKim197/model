const log = require('../../logger');
const { readJsonFile, updateJsonFile, addToJsonFile, deleteFromJsonFile } = require('../../util/fileUtil');
const {convertTimeToHex} = require('../../util/numberConvert');
const { ipcRenderer } = require('electron');

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', { level, message });
}

/*sendLogToMain('info', '렌더러에서 보내는 정보 로그');
sendLogToMain('error', '렌더러 에러 발생');*/

// JSON TEST 완료
const data = readJsonFile();
log.info("data JSON!!!"+ JSON.stringify(data));

// 메뉴정보 조회 버튼
document.getElementById('getToMenu').addEventListener('click', () => {
    getMenuInfo(); //메뉴 조회
});

// 메뉴정보 전체 조회 버튼
document.getElementById('getToMenuAll').addEventListener('click', () => {
    const allData = getMenuInfoAll(); //메뉴 조회
    document.getElementById('dataAll').textContent = JSON.stringify(allData);
});

// 메뉴정보 저장 버튼
document.getElementById('setToMenu').addEventListener('click', () => {
    setMenuInfo(); //메뉴 조회
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
    fetchCoffeeInfo("045","000","110","000");
});
document.getElementById('sendCoffeeUse2Setting').addEventListener('click', () => {
    fetchCoffeeInfo("000","045","110","140");
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
document.getElementById('sendWaterTime').addEventListener('click', () => {
    const waterItem = document.getElementById('setWaterTime').value;
    if(waterItem) {
        // 10 진수 16진수로 변경
        const time = convertTimeToHex(waterItem);
        fetchWaterTime(time);
    }

});
document.getElementById('sendIceTime').addEventListener('click', () => {
    const iceItem = document.getElementById('setIceTime').value;
    if(iceItem) {
        // 10 진수 16진수로 변경
        const time = convertTimeToHex(iceItem);
        fetchIceTime(time);
    }

});
document.getElementById('sendIceRun').addEventListener('click', () => {
    fetchIceRun();
});
document.getElementById('sendIceStop').addEventListener('click', () => {
    fetchIceStop();
});
document.getElementById('sendCupInfo').addEventListener('click', () => {
    fetchCupInfo();
});
document.getElementById('sendCupPlUse').addEventListener('click', () => {
    fetchCupPlUse();
});
document.getElementById('sendCupPaUse').addEventListener('click', () => {
    fetchCupPaUse();
});

const getMenuInfo = async () => {
    try {
        const response = await fetch('http://localhost:3000/get-menu-info');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        sendLogToMain('info','SCF: ', data);  // 디버깅용 콘솔
        log.info(data);
        document.getElementById('data').textContent = JSON.stringify(data);
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}

// 메뉴정보 전체 조회
const getMenuInfoAll = async () => {
    try {
        const response = await fetch('http://localhost:3000/get-menu-info-all');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        sendLogToMain('info','SCF: ', data);  // 디버깅용 콘솔
        log.info(data);
        return data;
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}

const setMenuInfo = async () => {

    // 각 옵션 값을 저장할 객체
    const selectedOptions = {
        cup: document.querySelector('input[name="cup"]:checked')?.value || 'None',
        ice: document.querySelector('input[name="ice"]:checked')?.value || 'None',
        iceTime: document.querySelector('input[name="iceTime"]')?.value || 'None',
        waterTime: document.querySelector('input[name="waterTime"]')?.value || 'None',
        coffee: document.querySelector('input[name="coffee"]:checked')?.value || 'None',
        coffeeGrinder1: document.querySelector('input[id="coffeeGrinder1"]')?.value || 'None',
        coffeeGrinder2: document.querySelector('input[id="coffeeGrinder2"]')?.value || 'None',
        coffeeExtraction: document.querySelector('input[id="coffeeExtraction"]')?.value || 'None',
        coffeeHotWater: document.querySelector('input[id="coffeeHotWater"]')?.value || 'None',
        coffeeShot: document.querySelector('input[id="coffeeShot"]')?.value || 'None',
        garuchaNumber: document.getElementById('garuchaNumber').value || 'None',
        garuchaExtraction: document.getElementById('garuchaExtraction').value || 'None',
        garuchaHotWater: document.getElementById('garuchaHotWater').value || 'None',
        syrupNumber: document.getElementById('syrupNumber').value || 'None',
        syrupExtraction: document.getElementById('syrupExtraction').value || 'None',
        syrupHotWater: document.getElementById('syrupHotWater').value || 'None',
    };

    log.info("data : " + JSON.stringify(selectedOptions));

    try {
        const response = await fetch('http://localhost:3000/set-menu-info', {
            method: 'POST', // POST 요청
            headers: {
                'Content-Type': 'application/json', // JSON 형식으로 전송
            },
            body: JSON.stringify(selectedOptions), // 선택된 옵션 객체를 JSON으로 직렬화하여 전송
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        log.info(selectedOptions);
        const data = await response.json();
        sendLogToMain('info','SCF: ', data);  // 디버깅용 콘솔
        log.info(data);
        document.getElementById('data').textContent = JSON.stringify(data);
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}

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

const fetchWaterTime = async (waterTime) => {
    try {
        const response = await fetch(`http://localhost:3000/serial-water-time?data=${waterTime}`);

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

const fetchIceTime = async (iceTime) => {
    try {
        const response = await fetch(`http://localhost:3000/serial-ice-time?data=${iceTime}`);

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

const fetchIceRun = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-ice-run');

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

const fetchIceStop = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-ice-stop');

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

const fetchCupPlUse = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-cup-plastic-use');

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

const fetchCupPaUse = async () => {
    try {
        const response = await fetch('http://localhost:3000/serial-cup-paper-use');

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


module.exports = {
    getMenuInfoAll,
    // 필요한 함수들 추가
};