const urlHost = window.location.hostname;
let url = "";
if (window.location.hostname.includes("nw-api.org")) {
    console.log("✅ 현재 도메인은 Cloudflared를 통한 nw-api.org 입니다.");
    url = `https://${urlHost}`
} else {
    url = `http://${urlHost}:3142`
    console.log("❌ 다른 도메인에서 실행 중입니다.");
}

const getUserData = async () => {
    try {
        const response = await fetch(`${url}/get-user-info`);

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
        const response = await fetch(`${url}/get-menu-info-all`);

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
        const response = await fetch(`${url}/serial-admin-drink-order`, {
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
        const response = await fetch(`${url}/serial-admin-ice-order`, {
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
        const response = await fetch(`${url}/serial-admin-cup-order`, {
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
    const apiUrl = `${url}/get-orders-by-date-range?startDate=${startDate}&endDate=${endDate}&ascending=${ascending}`;
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
    const apiUrl = `${url}/calculate-sales-statistics`;
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
        const response = await fetch(`${url}/restart-app`, {
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
        const response = await fetch(`${url}/shutdown-app`, {
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

// 프로그램 리프레시 API 호출 함수
async function requestAppRefresh() {
    try {
        const response = await fetch(`${url}/order-refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (result.success) {
            alert('리프레시 요청 성공');
            console.log('리프레시 요청 성공:', result.message);
        } else {
            console.error('리프레시 요청 실패:', result.message);
        }
    } catch (error) {
        console.error('리프레시 요청 중 오류 발생:', error);
    }
}

// 프로그램 업데이트 API 호출 함수
async function requestAppUpdate() {
    try {
        const response = await fetch(`${url}/electon-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (result.success) {
            alert('업데이트 요청 성공');
            console.log('업데이트 요청 성공:', result.message);
        } else {
            console.error('업데이트 요청 실패:', result.message);
        }
    } catch (error) {
        console.error('업데이트 요청 중 오류 발생:', error);
    }
}


// 플라스틱 컵 투출 함수
const fetchCupPlUse = async () => {
    try {
        const response = await fetch(`${url}/serial-cup-plastic-use`);

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

        const response = await fetch(`${url}/serial-cup-paper-use`);

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
        const response = await fetch(`${url}/admin-use-wash`, {
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

// 어드민 정보 업데이트 함수
const updateUserInfo = async (data) => {
    try {
        console.log("data: ", data);
        const response = await fetch(`${url}/update-user-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({data})
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

const fetchAndSaveUserInfo = async () => {
    try {
        const response = await fetch(`${url}/fetch-and-save-user`);
        const result = await response.json();

        if (response.ok) {
            console.log('사용자 정보 조회 및 저장 성공:', result.data);
        } else {
            console.error('사용자 정보 조회 실패:', result.message);
        }
    } catch (error) {
        console.error('사용자 정보 조회 및 저장 중 오류 발생:', error.message);
    }
};

// 추출기 원점 함수
const extractorHome = async () => {
    try {
        const response = await fetch(`${url}/extractor-home`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
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
    adminUseWash,
    updateUserInfo,
    fetchAndSaveUserInfo,
    requestAppRefresh,
    requestAppUpdate,
    extractorHome
};