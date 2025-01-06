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

const callSerialAdminCupOrder = async (recipe) => {
    try {
        const response = await fetch(`http://${url}:3000/serial-admin-cup-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ recipe })
        });

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

// 결제 내역 조회
const getOrdersByDateRange = async (startDate, endDate, ascending = true) => {
    const apiUrl = `http://${url}:3000/get-orders-by-date-range?startDate=${startDate}&endDate=${endDate}&ascending=${ascending}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.success) {
            return data.data; // 성공 시 주문 데이터 반환
        } else {
            console.error('API 오류:', data.error);
            return [];
        }
    } catch (error) {
        console.error('API 호출 중 오류 발생:', error);
        return [];
    }
}

// 기간별 통계조회
const calculateSalesStatistics = async () => {
    const apiUrl = `http://${url}:3000/calculate-sales-statistics`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.success) {
            return data.data; // 성공 시 주문 데이터 반환
        } else {
            console.error('API 오류:', data.error);
            return [];
        }
    } catch (error) {
        console.error('API 호출 중 오류 발생:', error);
        return [];
    }
}

// 프로그램 재시작 API 호출 함수
async function requestAppRestart() {
    try {
        const response = await fetch(`http://${url}:3000/restart-app`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (result.success) {
            alert('재부팅 요청 성공');
            console.log('재부팅 요청 성공:', result.message);
        } else {
            console.error('재부팅 요청 실패:', result.message);
        }
    } catch (error) {
        console.error('재부팅 요청 중 오류 발생:', error);
    }
}

// 프로그램 종료 API 호출 함수
async function requestAppShutdown() {
    try {
        const response = await fetch(`http://${url}:3000/shutdown-app`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (result.success) {
            alert('종료 요청 성공');
            console.log('종료 요청 성공:', result.message);
        } else {
            console.error('종료 요청 실패:', result.message);
        }
    } catch (error) {
        console.error('종료 요청 중 오류 발생:', error);
    }
}

// 플라스틱 컵 투출 함수
const fetchCupPlUse = async () => {
    try {
        const response = await fetch(`http://${url}:3000/serial-cup-plastic-use`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        console.error(error);
    }
}

// 종이 컵 투출 함수
const fetchCupPaUse = async () => {
    try {

        const response = await fetch(`http://${url}:3000/serial-cup-paper-use`);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Response Data:', data);  // 디버깅용 콘솔
    } catch (error) {
        sendLogToMain('error','Error fetching coffee info:', error);
        console.error(error);
    }
}

// 어드민 세척 함수
const adminUseWash = async (data) => {
    try {
        const response = await fetch(`http://${url}:3000/admin-use-wash`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data })
        });

        const result = await response.json();

        if (response.ok) {
            console.log('Success:', result.message);
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

export {
    getUserData,
    getMenuInfoAll,
    callSerialAdminDrinkOrder,
    callSerialAdminIceOrder,
    callSerialAdminCupOrder,
    getOrdersByDateRange,
    calculateSalesStatistics,
    requestAppRestart,
    requestAppShutdown,
    fetchCupPlUse,
    fetchCupPaUse,
    adminUseWash
};