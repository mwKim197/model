const url = window.location.hostname;

const getUserData = async () => {
    try {
        const response = await fetch(`http://${url}:3000/get-user-info`);

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

const callSerialAdminDrinkOrder = async (recipe) => {
    try {
        const response = await fetch(`http://${url}:3000/serial-admin-drink-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipe })
        });

        const result = await response.json();

        if (response.ok) {
            console.log('Success:', result.message);
            console.log('Menu ID:', result.data.menuId);
        } else {
            console.error('Error:', result.message);
            if (result.error) {
                console.error('Details:', result.error.message);
            }
        }
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
};


const callSerialAdminIceOrder = async (recipe) => {
    try {
        const response = await fetch(`http://${url}:3000/serial-admin-ice-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipe })
        });

        const result = await response.json();

        if (response.ok) {
            console.log('Success:', result.message);
            console.log('Menu ID:', result.data.menuId);
        } else {
            console.error('Error:', result.message);
            if (result.error) {
                console.error('Details:', result.error.message);
            }
        }
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
};

const fetchCoffeeInfo = async (grinder1, grinder2, extraction, hotwater) => {
    try {
        const response = await fetch(`http://${url}:3000/serial-order-coffee-setting/${grinder1}/${grinder2}/${extraction}/${hotwater}`);

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

const fetchCoffeeUse = async () => {
    try {
        const response = await fetch(`http://${url}:3000/serial-order-coffee-use`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
        return data;
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
        return data;
    } catch (error) {
        console.error(error);
    }
}

const fetchTeaInfo = async (motor, extraction, hotwater) => {
    try {
        const response = await fetch(`http://${url}:3000/serial-order-tea-setting/${motor}/${extraction}/${hotwater}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
        return data;
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
        return data;
    } catch (error) {
        console.error(error);
    }
}

const fetchSyrupInfo = async (syrup, pump, hotwater, sparkling) => {
    try {
        const response = await fetch(`http://${url}:3000/serial-order-syrup-setting/${syrup}/${pump}/${hotwater}/${sparkling}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
        return data;
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
        return data;
    } catch (error) {
        console.error(error);
    }
}

const fetchWaterTime = async (waterTime) => {
    try {
        const response = await fetch(`http://${url}:3000/serial-water-time?data=${waterTime}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
        return data;
    } catch (error) {
        console.error(error);
    }
}

const fetchIceTime = async (iceTime) => {
    try {
        const response = await fetch(`http://${url}:3000/serial-ice-time?data=${iceTime}`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
        console.log(data);
        return data;
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
        return data;
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
        return data;
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
        return data;
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
        return data;
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
        return data;
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
    getUserData,
    getMenuInfoAll,
    callSerialAdminDrinkOrder,
    callSerialAdminIceOrder,
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