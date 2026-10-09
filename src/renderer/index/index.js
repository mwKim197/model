let userInfo = {};

window.onload = async () => {
    try {
        const userData = await window.electronAPI.getUserData();
        // 1차 개발 안정화 기간에는 기존 electron-store(config.json)의
        // userId만 있어도 기존처럼 자동 진입한다. 운영은 토큰을 계속 요구한다.
        if (userData?.userId && (window.electronAPI.isDevelopment || userData?.machineToken)) {
            await window.electronAPI.navigateToPage('order');
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
};

document.getElementById('signup-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
        const data = await window.electronAPI.setUserInfo({
            userId: document.getElementById('userId').value,
            password: document.getElementById('password').value,
            ipAddress: document.getElementById('ipAddress').value,
            storeName: document.getElementById('storeName').value,
            tel: document.getElementById('tel').value,
        });
        if (data.status === 200 || data.status === 201) {
            userInfo = data.data.Item;
            alert('회원가입에 성공했습니다.');
        } else {
            alert(`회원가입 실패: ${data.data?.message || '알 수 없는 오류'}`);
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        alert(`회원가입 실패: ${error?.message || '잠시 후 다시 시도해 주세요.'}`);
    }
});

document.getElementById('LoginButton').addEventListener('click', async () => {
    const loginButton = document.getElementById('LoginButton');

    try {
        const userId = document.getElementById('userId').value.trim();
        const password = document.getElementById('password').value;

        if (!userId || !password) {
            alert('아이디와 비밀번호를 입력해주세요.');
            return;
        }

        userInfo = {
            userId,
            password,
            ipAddress: document.getElementById('ipAddress').value.trim(),
        };

        loginButton.disabled = true;
        loginButton.textContent = '로그인 중...';

        await window.electronAPI.setUserLogin(userInfo);

        const storedUser = await window.electronAPI.getUserData();
        if (!storedUser || storedUser.userId !== userId) {
            throw new Error('로그인 정보 저장을 확인할 수 없습니다.');
        }

        const shouldRestart = window.confirm(
            '로그인이 완료되었습니다.\n머신을 다시 시작하겠습니다.'
        );

        if (shouldRestart) {
            window.electronAPI.restartAppAfterLogin();
            return;
        }
    } catch (error) {
        console.error('Error during login process:', error);
        alert(`로그인 실패: ${error?.message || '알 수 없는 오류'}`);
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = '로그인 버튼';
    }
});
