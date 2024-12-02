const { ipcRenderer } = require('electron');

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', { level, message });
}

/*
sendLogToMain('info', '렌더러에서 보내는 정보 로그');
sendLogToMain('error', '렌더러 에러 발생');
*/


// 페이지 이동 버튼
document.getElementById('goToIndex').addEventListener('click', () => {
    ipcRenderer.send('navigate-to-page', 'index'); // 'admin' 페이지로 이동
});

// 페이지 이동 버튼
document.getElementById('getData').addEventListener('click', () => {
    getData();
});

async function getData() {
    try {
        const response = await fetch('http://localhost:3000/get-data', {
            method: 'POST', // POST 요청
            headers: {
                'Content-Type': 'application/json', // JSON 형식으로 전송
            }
        });
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();
        console.log(data);

    } catch (error) {
        sendLogToMain('error','RD2: 데이터 가져오기 실패:', error);
    }
}

async function fetchSerialDataRd1() {
    try {
        const response = await fetch('http://localhost:3000/serial-data-rd1');
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();

        // 화면에 데이터 업데이트
        document.getElementById('data').textContent                         = data;
        document.getElementById('boilerTemperature').textContent            = data.boilerTemperature; // 보일러 온도
        document.getElementById('boilerHeaterStatus').textContent           = data.boilerHeaterStatus; // 히터 상태
        document.getElementById('boilerFlowRate').textContent               = data.boilerFlowRate; // 플로우미터1 유량;
        document.getElementById('boilerPumpStatus').textContent             = data.boilerPumpStatus; // 펌프 상태
        document.getElementById('hotWaterSolValve1').textContent            = data.hotWaterSolValve1;
        document.getElementById('hotWaterSolValve2').textContent            = data.hotWaterSolValve2;
        document.getElementById('coffeeSolValve').textContent               = data.coffeeSolValve;
        document.getElementById('carbonationPressureSensor').textContent    = data.carbonationPressureSensor;
        document.getElementById('carbonationFlowRate').textContent          = data.carbonationFlowRate; // 탄산수 플로우미터 유량
        document.getElementById('extractionHeight').textContent             = data.extractionHeight; // 추출기 상하높이
        document.getElementById('grinderMotor1').textContent                = data.grinderMotor1; // 그라인더 모터1
        document.getElementById('grinderMotor2').textContent                = data.grinderMotor2;
        document.getElementById('coffeeMode').textContent                   = data.coffeeMode; // 커피 동작 상태
        document.getElementById('cupSensor').textContent                    = data.cupSensor; // 컵 센서
        document.getElementById('waterAlarm').textContent                   = data.waterAlarm; // 물 없음 알람
        document.getElementById('ledStatus').textContent                    = data.ledStatus; // LED 상태


    } catch (error) {
        sendLogToMain('error','RD1: 데이터 가져오기 실패:', error);
    }
}

async function fetchSerialDataRd2() {
    try {
        const response = await fetch('http://localhost:3000/serial-data-rd2');
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();

    } catch (error) {
        sendLogToMain('error','RD2: 데이터 가져오기 실패:', error);
    }
}

async function fetchSerialDataRd3() {
    try {
        const response = await fetch('http://localhost:3000/serial-data-rd3');
        if (!response.ok) throw new Error('네트워크 응답 실패');
        const data = await response.json();

    } catch (error) {
        sendLogToMain('error','RD3: 데이터 가져오기 실패:', error);
    }
}

async function fetchSerialDataRd4() {
    try {
        const response = await fetch('http://localhost:3000/serial-data-rd4');
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();

    } catch (error) {
        sendLogToMain('error','RD4: 데이터 가져오기 실패:', error);
    }
}

/*async function fetchSerialRdData() {
    await fetchSerialDataRd1();
    await fetchSerialDataRd2();
    await fetchSerialDataRd3();
    await fetchSerialDataRd4();
}

// 1초마다 폴링
setInterval(fetchSerialRdData, 10000);*/
