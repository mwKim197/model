const { ipcRenderer } = require('electron');

ipcRenderer.on('page-data', (event, data) => {
    console.log('Received data for page:', data); // 받은 데이터 출력
    // 페이지에 데이터를 반영하는 로직 작성
    document.getElementById('display').innerText = JSON.stringify(data);
});

// 뒤로가기 버튼 클릭 이벤트
document.getElementById('backButton').addEventListener('click', () => {
    window.history.back(); // 브라우저 히스토리에서 뒤로가기
});