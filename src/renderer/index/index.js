let userInfo= {};
// Main Process로부터 데이터 가져오기
window.onload = async () => {
    try {
        const userData = await window.electronAPI.getUserData(); // 데이터 요청
        if (userData.userId) {
            await window.electronAPI.navigateToPage( 'order');
        }
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

    await window.electronAPI.setUserLogin(userInfo).then();

    const userData = await window.electronAPI.getUserData(); // 데이터 요청
    console.log('User Data from Main Process:', userData);
    if(userData) {
        alert("로그인에 성공하였습니다.");
    }
});

