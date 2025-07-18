const log = require("../../logger");


const setUserInfo = async (userInfo) => {
    try {
        const response = await fetch('https://api.narrowroad-model.com/model_new_store', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userInfo)
        });

        const data = await response.json();

        log.info("응답 status:", response.status);
        log.info("응답 data:", data);

        return { status: response.status, data }; // ✅ status와 data 모두 리턴
    } catch (error) {
        log.error(error);
        throw error;
    }
};



const setUserLogin = async (userInfo) => {
    try {
        const response = await fetch(`http://localhost:3142/set-user-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userInfo)
        });

        const data = await response.json(); // ★ 무조건 JSON 먼저 읽는다
        log.info('서버 응답:', data);

        if (!response.ok || !data.success) {
            // 서버가 success: false를 보내거나, HTTP 자체가 실패해도
            const errorMessage = data.message || response.statusText || '로그인 실패';
            throw new Error(errorMessage);
        }

        return data;
    } catch (error) {
        log.error('setUserLogin error:', error);
        throw error;
    }
};

// 유저 id 전체조회
const getAllUserIds = async () => {
    try {
        const response = await fetch(`http://localhost:3142/get-all-users-ids`,{method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        log.info(data);
        return data;
    } catch (error) {
        log.error(error);
    }
}

// 유저 id 기준 Data 복제
const setMenuAllUpdate = async (sourceUserId, targetUserId) => {
    try {
        // POST 요청 시 전달할 body 데이터 구성
        const bodyData = JSON.stringify({
            sourceUserId: sourceUserId,
            targetUserId: targetUserId,
        });
        console.log("setMenuAllUpdate: ", bodyData);
        const response = await fetch(`http://localhost:3142/set-menu-all-update`, {method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: bodyData, // 실제로 데이터를 보냄
        });


        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || '알 수 없는 에러가 발생했습니다.');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[ERROR] 데이터 복사 실패:', error.message);
        throw error; // 호출 위치로 에러를 다시 전달
    }
};

// 유저정보 config 업로드
const fetchAndSaveUserInfo = async () => {
    try {
        const response = await fetch(`http://localhost:3142/fetch-and-save-user`);
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

const postMachineHealthCheck = async (userInfo) => {
    try {
        const response = await fetch('https://api.narrowroad-model.com/model_machine_health_check', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();
        if (response.ok) {
            log.info("응답 status:", response.status);
            log.info("응답 data:", data);
        }
        return { status: response.status, data }; // ✅ status와 data 모두 리턴
    } catch (error) {
        log.error(error);
        throw error;
    }
};



module.exports = {setUserInfo, setUserLogin, getAllUserIds, setMenuAllUpdate, fetchAndSaveUserInfo, postMachineHealthCheck};