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

const callSerialAdminCupOrder = async () => {
    try {
        const response = await fetch(`http://${url}:3000/serial-admin-cup-order`);

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



export {
    getUserData,
    getMenuInfoAll,
    callSerialAdminDrinkOrder,
    callSerialAdminIceOrder,
    fetchCupPlUse,
    fetchCupPaUse,
};