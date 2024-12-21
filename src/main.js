const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initializeUpdater } = require('./updater');
const { createMainWindow } = require('./windows/mainWindow');
const { setupEventHandlers } = require('./events/eventHandlers');
const server = require('./server'); // Express 서버 모듈
const serialPolling = require('./services/serialPolling');

async function initializeApp() {
    // 1. 페이지 변경 핸들러
    ipcMain.on('navigate-to-page', (event, { pageName, data }) => {
        const win = BrowserWindow.getFocusedWindow(); // 현재 활성 창 가져오기
        const filePath = path.join(__dirname, 'renderer', pageName, `${pageName}.html`);

        win.loadFile(filePath)
            .then(() => {
                win.webContents.send('page-data', data); // 페이지 로드 후 데이터 전달
            })
            .catch((err) => {
                console.error('Failed to load page:', err.message);
            });
    });

    // 2. 로그 핸들러 (렌더러에서 전달받은 로그 처리)
    ipcMain.on('log-to-main', (event, { level, message }) => {
        const timestamp = new Date().toISOString();
        console.log(`[${level}] ${timestamp} - ${message}`);
    });

    // 3. Express 서버 시작
    await server.start();

    // 4. Electron 메인 창 생성
    const mainWindow = await createMainWindow();

    // 5. Serial Polling 시작
    serialPolling.start();

    // 6. Electron 업데이트 설정
    initializeUpdater();

    // 7. IPC 이벤트 핸들러 설정
    setupEventHandlers(mainWindow);

    setInterval(() => {
        const serialData = serialPolling.getSerialData('RD1'); // RD1 데이터 가져오기
        mainWindow.webContents.send('update-serial-data', serialData);
    }, 3000); // 3초마다 데이터 전송
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    // 앱 종료 시 Serial Polling 중지
    serialPolling.stop();
});
