const log = require("../../logger");
const { ipcRenderer } = require('electron');

// 전역 변수 선언
let userData = null;

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', { level, message });
}

const initializeUserData = async () => {
    try {
        userData = await ipcRenderer.invoke('get-user-data'); // 메인 프로세스에서 데이터 가져오기
        console.log('유저 정보 조회 완료:', userData);
        return true;
    } catch (error) {
        console.error('유저 정보 조회 실패:', error);
        throw error; // 초기화 실패 시 에러 던지기
    }
};

// 초기화 완료 후 호출 가능하도록 보장
const ensureUserDataInitialized = async () => {
    if (!userData) {
        await initializeUserData();
    }
};


/*sendLogToMain('info', '렌더러에서 보내는 정보 로그');
sendLogToMain('error', '렌더러 에러 발생');*/

const getUserInfo = async () => {
    try {

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }
        console.log("url: " , userData.url);
        const response = await fetch(`http://localhost:3000/get-user-info`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        sendLogToMain('info','SCF: ', data);  // 디버깅용 콘솔
        return data;
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}

const getMenuInfo = async () => {
    try {

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3000/get-menu-info`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        sendLogToMain('info','MENU: ', data);  // 디버깅용 콘솔
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

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }
        
        const response = await fetch(`http://localhost:3000/get-menu-info-all`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        console.log("getMenuInfoAll ", userData);
        const data = await response.json();
        log.info(data);
        sendLogToMain('info','MENU-ALL: ', data);  // 디버깅용 콘솔
        return data;
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}

const setMenuInfo = async () => {
    document.getElementById('setToMenu').addEventListener('click', async () => {
        try {

            await ensureUserDataInitialized(); // userData 초기화 보장

            // userData 초기화가 끝난 후에 실행되도록 보장
            if (!userData) {
                throw new Error('User data is not initialized');
            }

            const items = [];

            // 모든 item-input 필드셋에서 데이터 수집
            document.querySelectorAll('.item-input').forEach((fieldset) => {
                const itemId = fieldset.id.replace('item', ''); // 항목 ID 추출
                const itemType = document.getElementById(`itemType${itemId}`)?.value || 'None';
                const value1 = document.getElementById(`value1-${itemId}`)?.value || '0';
                const value2 = document.getElementById(`value2-${itemId}`)?.value || '0';
                const value3 = document.getElementById(`value3-${itemId}`)?.value || '0';
                const value4 = document.getElementById(`value4-${itemId}`)?.value || '0';

                items.push({
                    type: itemType,
                    no: parseInt(itemId, 10),
                    value1,
                    value2,
                    value3,
                    value4,
                });
            });

            // 각 옵션 값을 저장할 객체
            const selectedOptions = {
                name: document.getElementById('menuName')?.value || 'None',
                cup: document.querySelector('input[name="cup"]:checked')?.value || 'None',
                iceYn: document.querySelector('input[name="iceYn"]:checked')?.value || 'No',
                iceTime: document.querySelector('input[name="iceTime"]')?.value || '0',
                waterTime: document.querySelector('input[name="waterTime"]')?.value || '0',
                price: document.getElementById('price').value || 'None',
                image: 'https://placehold.co/200x300/png',
                category: document.getElementById('category').value || 'None',
                items, // 통합된 items 배열 추가
            };

            log.info("data : " + JSON.stringify(selectedOptions));

            // Fetch 요청 보내기
            const response = await fetch(`http://localhost:3000/set-menu-info`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(selectedOptions),
            });

            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }

            const data = await response.json();
            sendLogToMain('info', '메뉴 저장: ', data); // 디버깅용 로그
            log.info(data);

            // 결과 표시
            document.getElementById('data').textContent = JSON.stringify(data);
        } catch (error) {
            sendLogToMain('error', 'Error fetching menu info:', error);
            log.error(error);
        }
    });
}

const fetchCoffeeInfo = async (grinder1, grinder2, extraction, hotwater) => {
    try {

        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

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

        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3000/serial-order-coffee-use`);

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

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3000/serial-order-coffee-use1`);

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
        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

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

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3000/serial-order-tea-use`);

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

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

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
        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3000/serial-order-syrup-use`);

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
        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

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
        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

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
        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }
        const response = await fetch(`http://localhost:3000/serial-ice-run`);

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
        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3000/serial-ice-stop`);

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
        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3000/serial-cup-info`);

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
        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }
        const response = await fetch(`http://localhost:3000/serial-cup-plastic-use`);

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

        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3000/serial-cup-paper-use`);

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
        await ensureUserDataInitialized(); // userData 초기화 보장

// userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }
        
        const response = await fetch(`http://localhost:3000/serial-ice-info`);

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
    getUserInfo,
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