
function sendLogToMain(level, message) {
    console[level](message); // 브라우저에서는 단순히 콘솔 출력
}

const getUserInfo = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/get-user-info');
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {

        console.error(error);
    }
}

const getMenuInfo = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/get-menu-info');
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(error);
    }
}

// 메뉴정보 전체 조회
const getMenuInfoAll = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/get-menu-info-all');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        console.error(error);
    }
}

const setMenuInfo = async () => {
    document.getElementById('setToMenu').addEventListener('click', async () => {
        try {
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

            console.log("data : " + JSON.stringify(selectedOptions));

            // Fetch 요청 보내기
            const response = await fetch('http://test_user1.narrowroad-model.com:3000/set-menu-info', {
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
            console.log(data);

            // 결과 표시
            document.getElementById('data').textContent = JSON.stringify(data);
        } catch (error) {
            console.error(error);
        }
    });
}

const fetchCoffeeInfo = async (grinder1, grinder2, extraction, hotwater) => {
    try {
        const response = await fetch(`http://test_user1.narrowroad-model.com:3000/serial-order-coffee-setting/${grinder1}/${grinder2}/${extraction}/${hotwater}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchCoffeeUse = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-order-coffee-use');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchCoffeeUse1 = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-order-coffee-use1');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchTeaInfo = async (motor, extraction, hotwater) => {
    try {
        const response = await fetch(`http://test_user1.narrowroad-model.com:3000/serial-order-tea-setting/${motor}/${extraction}/${hotwater}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchTeaUse = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-order-tea-use');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchSyrupInfo = async (syrup, pump, hotwater, sparkling) => {
    try {
        const response = await fetch(`http://test_user1.narrowroad-model.com:3000/serial-order-syrup-setting/${syrup}/${pump}/${hotwater}/${sparkling}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchSyrupUse = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-order-syrup-use');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchWaterTime = async (waterTime) => {
    try {
        const response = await fetch(`http://test_user1.narrowroad-model.com:3000/serial-water-time?data=${waterTime}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchIceTime = async (iceTime) => {
    try {
        const response = await fetch(`http://test_user1.narrowroad-model.com:3000/serial-ice-time?data=${iceTime}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchIceRun = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-ice-run');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchIceStop = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-ice-stop');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchCupInfo = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-cup-info');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchCupPlUse = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-cup-plastic-use');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}

const fetchCupPaUse = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-cup-paper-use');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {

        console.error(error);
    }
}

const fetchIceInfo = async () => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/serial-ice-info');

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
    } catch (error) {
        console.error(error);
    }
}


export {
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
    fetchIceInfo,
};