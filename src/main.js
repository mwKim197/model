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
        // [TODO] await setupPortForwarding(3000, 3000);
        log.info('Port forwarding succeeded on port 3000');

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
