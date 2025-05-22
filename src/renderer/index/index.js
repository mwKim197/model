let userInfo= {};
// Main Process로부터 데이터 가져오기
window.onload = async () => {
    try {
        const userData = await window.electronAPI.getUserData(); // 데이터 요청
        if (userData.userId) {
            await window.electronAPI.navigateToPage('order');
        }


    } catch (error) {
        console.error('Error fetching user data:', error);
    }
};

document.getElementById('signup-form').addEventListener('submit',  async function(event) {
    event.preventDefault(); // 기본 제출 방지

    try {
        // 입력된 값 가져오기
        const userId = document.getElementById('userId').value;
        const password = document.getElementById('password').value;
        const ipAddress = document.getElementById('ipAddress').value;
        const storeName = document.getElementById('storeName').value;
        const tel = document.getElementById('tel').value;

        const data = await window.electronAPI.setUserInfo({
            userId: userId,
            password: password,
            ipAddress: ipAddress,
            storeName: storeName,
            tel: tel
        });

        // ✅ 200, 201 성공일 때만 세팅
        if (data.status === 200 ||data.status === 201) {
            userInfo = data.data.Item;
            alert("회원가입에 성공했습니다.");
        } else {
            alert(`회원가입 실패: ${data.data?.message || '알 수 없는 오류'}`);
        }

    } catch (e) {
        console.error('Error fetching user data:', e);

        if (e?.message) {
            alert(`회원가입 실패: ${e.message}`);
        } else {
            alert("에러 발생. 잠시 후 다시 시도해주세요.");
        }

    }
});

document.getElementById('LoginButton').addEventListener('click', async () => {
    try {

        const userId = document.getElementById('userId').value;
        const password = document.getElementById('password').value;
        const ipAddress = document.getElementById('ipAddress').value;

        userInfo = {
            userId,
            password,
            ipAddress
        }

        // 로그인 요청
        window.electronAPI.setUserLogin(userInfo).then(async () => {

            // 로그인 후 사용자 데이터 가져오기
            const userData = await window.electronAPI.getUserData();
            console.log('User Data from Main Process:', userData);

            if (userData) {
                // 계정 목록 가져오기
                const userIds = await window.electronAPI.getAllUserIds();
                console.log('Fetched userIds:', userIds);

                // <select> 요소에 계정 추가
                const selectElement = document.getElementById('userSelect');
                selectElement.innerHTML = '<option value="" disabled selected>계정을 선택하세요</option>'; // 초기화
                userIds.data.forEach(userId => {
                    const option = document.createElement('option');
                    option.value = userId;
                    option.textContent = userId;
                    selectElement.appendChild(option);
                });

                // <select> 컨테이너 표시
                document.getElementById('userSelectContainer').classList.remove('hidden');

                alert('로그인에 성공하였습니다.');
            }
        }).catch((e) => {
            console.log("로그인 실패", e);
            alert('로그인 실패: ' + (e.message || '알 수 없는 에러'));
        });

    } catch (error) {
        console.error('Error during login process:', error);
        alert('로그인에 실패하였습니다.');
    }
});

document.getElementById('dataUse').addEventListener('click', async () => {
    // 선택된 userId 가져오기
    const sourceUserId = document.getElementById('userSelect').value; // select에서 선택된 userId
    const targetUserId = userInfo.userId; // 현재 로그인한 userId

    if (!sourceUserId) {
        alert('원본 계정을 선택하세요.');
        return;
    }

    if (!targetUserId) {
        alert('로그인된 대상 계정 정보가 없습니다.');
        return;
    }

    try {
        // Electron API 호출
        await window.electronAPI.setMenuAllUpdate(sourceUserId, targetUserId);

        alert(`${sourceUserId}의 데이터를 ${targetUserId}로 복사했습니다. 프로그램을 종료후 다시 실행해 주세요.`);
    } catch (error) {
        alert(`복사 실패: ${error.message}`);
    }
});