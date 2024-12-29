let userInfo= {};
// Main Process로부터 데이터 가져오기
window.onload = async () => {
    try {
        const userData = await window.electronAPI.getUserData(); // 데이터 요청
        if (userData.userId) {
            await window.electronAPI.navigateToPage('order');
        }

        console.log(userId);

    } catch (error) {
        console.error('Error fetching user data:', error);
    }
};

document.getElementById('signup-form').addEventListener('submit',  async function(event) {
    event.preventDefault(); // 기본 제출 방지

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

    userInfo = data.data.Item;

});

document.getElementById('LoginButton').addEventListener('click', async () => {
    try {
        // 로그인 요청
        await window.electronAPI.setUserLogin(userInfo);

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

        alert(`${sourceUserId}의 데이터를 ${targetUserId}로 복사했습니다.`);
    } catch (error) {
        alert(`복사 실패: ${error.message}`);
    }
});