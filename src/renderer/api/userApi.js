const log = require("../../logger");


const setUserInfo = async (userInfo) => {
    try {
        const response = await fetch('http://narrowroad-model.com:3142/set-user-info',{method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userInfo)});
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

const setUserLogin = async (userInfo) => {
    try {
        const response = await fetch(`http://localhost:3142/set-user-login`,{method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userInfo)});
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


module.exports = {setUserInfo, setUserLogin, getAllUserIds, setMenuAllUpdate};