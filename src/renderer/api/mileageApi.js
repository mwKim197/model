const log = require("../../logger");
const { ipcRenderer, ipcMain} = require('electron');

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

// 유저 번호 체크
const checkMileageExists = async (mileageNo) => {
    try {

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3142/mileage-user/${mileageNo}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}

// 유저 번호 체크
const verifyMileageAndReturnPoints = async (mileageNo, password) => {
    try {

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3142/mileage-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mileageNo: mileageNo, password: password })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}

// 마일리지 등록
const saveMileageToDynamoDB = async (mileageNo, password) => {
    try {

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3142/mileage-add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mileageNo: mileageNo, password: password })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}

// 마일리지트렌젝션
const updateMileageAndLogHistory = async (mileageNo, totalAmt, changePoints, type, note) => {
    try {

        await ensureUserDataInitialized(); // userData 초기화 보장

        // userData 초기화가 끝난 후에 실행되도록 보장
        if (!userData) {
            throw new Error('User data is not initialized');
        }

        const response = await fetch(`http://localhost:3142/mileage-transaction`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mileageNo: mileageNo, totalAmt: totalAmt, changePoints: changePoints, type: type, note: note })
        });

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        sendLogToMain('error','Error fetching menu info:', error);
        log.error(error);
    }
}


module.exports = {
    checkMileageExists,
    verifyMileageAndReturnPoints,
    saveMileageToDynamoDB,
    updateMileageAndLogHistory
}