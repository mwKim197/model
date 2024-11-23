const socket = io(); // 서버와 연결

// 서버로부터 상태값을 받으면 DOM을 업데이트
socket.on('status', (data) => {
    document.getElementById('boilerTemp').textContent = data.boilerTemp;
    document.getElementById('heaterStatus').textContent = data.heaterStatus;
    document.getElementById('flowRate1').textContent = data.flowRate1;
    // 다른 상태값들도 여기에 추가
});