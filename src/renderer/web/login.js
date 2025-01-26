const url = window.location.hostname;

document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const userId = document.getElementById('userId').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!userId || !password) {
        alert('Username and Password are required.');
        return;
    }

    try {
        // 로그인 API 호출
        const response = await fetch(`http://${url}:3142/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId, password }),
        });

        const result = await response.json();

        if (response.ok) {
            // 로그인 성공 시 토큰 저장
            localStorage.setItem('authToken', result.token);

            // 메인 페이지로 이동
            window.location.href = 'modelAdmin.html';
        } else {
            alert(result.message || 'Login failed. Please try again.');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('An error occurred during login. Please try again.');
    }
});


