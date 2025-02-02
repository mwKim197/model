const express = require('express');
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { initializeUpdater } = require('./updater');
const { createMainWindow } = require('./windows/mainWindow');
const { setupEventHandlers } = require('./events/eventHandlers');
const server = require('./server');
const serialPolling = require('./services/serialPolling');
const { setupPortForwarding } = require('./services/portForwarding');
const { getBasePath } = require(path.resolve(__dirname, './aws/s3/utils/cacheDirManager'));
const log = require('./logger');
const fs = require('fs');

// 디렉토리 확인 및 생성
const basePath = getBasePath(); // getBasePath 함수 호출
if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath, { recursive: true });
    console.log(`[DEBUG] Created directory: ${basePath}`);
} else {
    console.log(`[DEBUG] Directory already exists: ${basePath}`);
}

async function initializeApp() {
    try {

        // 1. 포트 포워딩 설정
        await setupPortForwarding(3142, 3142);
        log.info('Port forwarding succeeded on port 3142');

        // 3. Express 서버 시작
        await server.start();
        log.info('[DEBUG] Express server started.');

        // 4. Electron 메인 창 생성
        const mainWindow = await createMainWindow();
        log.info('[DEBUG] Main window created.');

        // 5. Serial Polling 시작
        serialPolling.start();
        log.info('[DEBUG] Serial polling started.');

        // 6. Electron 업데이트 설정
        initializeUpdater();
        log.info('[DEBUG] Updater initialized.');

        // 7. IPC 이벤트 핸들러 설정
        setupEventHandlers(mainWindow);
        log.info('[DEBUG] IPC event handlers set.');

        // 8. Serial Data 주기적 전송
        setInterval(() => {
            if (!mainWindow || mainWindow.isDestroyed()) {
                log.info('[DEBUG] Main window is closed or destroyed. Stopping serial data transmission.');
                return;
            }
            const serialData = serialPolling.getSerialData('RD1');
            mainWindow.webContents.send('update-serial-data', serialData);
        }, 3000);
        log.info('[DEBUG] Serial data transmission interval set.');
    } catch (error) {
        log.error('[DEBUG] Error in initializeApp:', error.message);
        throw error; // 상위로 에러 전달
    }
}

(async () => {
    const { publicIpv4 } = await import('public-ip');
    let previousIp = null;

    async function checkPublicIp() {
        try {
            const ip = await publicIpv4({
                fallbackUrls: [
                    'https://ifconfig.me/ip'
                ],
                onlyHttps: true, // HTTPS 강제
                headers: {
                    'User-Agent': 'curl/7.83.1' // curl과 동일한 User-Agent 설정
                },
            });
            log.info(`현재 공용 IP: ${ip}`); // 템플릿 문자열 사용
            if (previousIp && previousIp !== ip) {
                log.info(`공용 IP 변경 감지: ${previousIp} → ${ip}`);
                // 필요한 동작 수행 (예: 이메일 알림, 설정 갱신 등)
            }
            previousIp = ip; // IP 업데이트
        } catch (error) {
            log.error(`공용 IP 확인 실패: ${error.message}`);
        }
    }

    setInterval(async () => {
        await checkPublicIp();
    }, 1500000); // 15분마다 실행
})();


function restartApp() {
    app.relaunch();
    app.exit(0);
}

app.whenReady().then(() => {
    initializeApp().catch((err) => log.info('App initialization failed:', err));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    serialPolling.stop();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});
