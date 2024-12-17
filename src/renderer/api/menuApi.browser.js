const url = window.location.hostname;

const getUserInfo = async () => {
    try {
        const response = await fetch(`http://${url}:3000/get-user-info`);
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
        const response = await fetch(`http://${url}:3000/get-menu-info`);
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
        const response = await fetch(`http://${url}:3000/get-menu-info-all`);

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

const setAdminMenuInfo = async (selectedOptions) => {
    try {
        // Fetch 요청 보내기
        const response = await fetch(`http://${url}:3000//set-admin-menu-info`, {
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

}

const setMenuImg = async () => {
    document.getElementById('setToMenu').addEventListener('click', async () => {
        try {
            // Fetch 요청 보내기
            const response = await fetch(`http://${url}:3000/set-menu-info`, {
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
        const response = await fetch(`http://${url}:3000/serial-order-coffee-use`);

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
        const response = await fetch(`http://${url}:3000/serial-order-coffee-use1`);

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
        const response = await fetch(`http://${url}:3000/serial-order-tea-use`);

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
        const response = await fetch(`http://${url}:3000/serial-order-syrup-use`);

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
        const response = await fetch(`http://${url}:3000/serial-ice-run`);

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
        const response = await fetch(`http://${url}:3000/serial-ice-stop`);

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
        const response = await fetch(`http://${url}:3000/serial-cup-info`);

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
        const response = await fetch(`http://${url}:3000/serial-cup-plastic-use`);

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
        const response = await fetch(`http://${url}:3000/serial-cup-paper-use`);

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
        const response = await fetch(`http://${url}:3000/serial-ice-info`);

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
    setAdminMenuInfo,
    setMenuImg,
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