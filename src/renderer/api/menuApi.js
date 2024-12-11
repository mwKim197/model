const log = require("../../logger");
const { ipcRenderer } = require('electron');

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', { level, message });
}

/*sendLogToMain('info', '렌더러에서 보내는 정보 로그');
sendLogToMain('error', '렌더러 에러 발생');*/

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
        log.info(data);
        sendLogToMain('info','DATA: ', data);  // 디버깅용 콘솔
        return data;
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}

const setMenuInfo = async () => {

    // 각 옵션 값을 저장할 객체
    const selectedOptions = {
        name: document.getElementById('menuName')?.value || 'None',
        cup: document.querySelector('input[name="cup"]:checked')?.value || 'None',
        iceYn: document.querySelector('input[name="iceYn"]:checked')?.value || 'No',
        iceTime: document.querySelector('input[name="iceTime"]')?.value || '0',
        waterTime: document.querySelector('input[name="waterTime"]')?.value || '0',
        coffeeYn: document.querySelector('input[name="coffeeYn"]:checked')?.value || 'No',
        // 커피 데이터 저장
        coffee: Array.from(document.querySelectorAll('[id^="grinderOne"]')).map((coffeeElement, index) => ({
            grinderOne: coffeeElement.value || '0',
            grinderTwo: document.getElementById(`grinderTwo${index + 1}`)?.value || '0',
            extraction: document.getElementById(`extraction${index + 1}`)?.value || '0',
            hotWater: document.getElementById(`hotWater${index + 1}`)?.value || '0',
        })),
        garuchaYn: document.querySelector('input[name="garuchaYn"]:checked')?.value || 'No',
        // 가루차 데이터 저장
        garucha: Array.from(document.querySelectorAll('[id^="garuchaNumber"]')).map((garuchaElement, index) => ({
            garuchaNumber: garuchaElement.value || '0',
            garuchaExtraction: document.getElementById(`garuchaExtraction${index + 1}`)?.value || '0',
            garuchaHotWater: document.getElementById(`garuchaHotWater${index + 1}`)?.value || '0',
        })),
        syrupYn: document.querySelector('input[name="syrupYn"]:checked')?.value || 'No',
        // 시럽 데이터 저장
        syrup: Array.from(document.querySelectorAll('[id^="syrupNumber"]')).map((syrupElement, index) => ({
            syrupNumber: syrupElement.value || '0',
            syrupExtraction: document.getElementById(`syrupExtraction${index + 1}`)?.value || '0',
            syrupHotWater: document.getElementById(`syrupHotWater${index + 1}`)?.value || '0',
            syrupSparklingWater: document.getElementById(`syrupSparklingWater${index + 1}`)?.value || '0',
        })),
        price: document.getElementById('price').value || '0',
        image: 'https://placehold.co/200x300/png',
        category: document.getElementById('category').value || 'None',
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

const fetchIceInfo = async () => {
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


module.exports = {
    getMenuInfo,
    getMenuInfoAll,
    setMenuInfo,
    fetchCoffeeInfo,
    fetchCoffeeUse,
    fetchCoffeeUse1,
    fetchTeaInfo,
    fetchTeaUse,
    fetchSyrupInfo,
    fetchSyrupUse,
    fetchWaterTime,
    fetchIceTime,
    fetchIceRun,
    fetchIceStop,
    fetchCupInfo,
    fetchCupPlUse,
    fetchCupPaUse,
    fetchIceInfo
    // 필요한 함수들 추가
};