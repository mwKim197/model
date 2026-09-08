const { app, ipcMain, BrowserWindow } = require('electron');
const log = require('../logger');
const path = require('path');
const { pathToFileURL } = require('url');
const { getBasePath } = require("../aws/s3/utils/cacheDirManager");

function setupEventHandlers(mainWindow) {
    // 캐시 디렉토리 요청 처리
    ipcMain.handle('get-cache-dir', async () => {
        try {
            const cacheDir = getBasePath();
            console.log('[DEBUG] Returning cacheDir to Renderer:', cacheDir);
            return cacheDir;
        } catch (err) {
            console.error('[DEBUG] Error getting cacheDir:', err.message);
            throw err;
        }
    });

    // 페이지 변경 핸들러
    ipcMain.on('navigate-to-page', async (event, { pageName, data }) => {
        const allowedPages = new Set(['index', 'order']);
        if (!allowedPages.has(pageName)) {
            log.error(`Invalid page navigation request: ${pageName}`);
            return;
        }
        const filePath = path.resolve(__dirname, '../renderer', pageName, `${pageName}.html`);
        const fileUrl = pathToFileURL(filePath).href;
        try {
            console.log(`[DEBUG] Navigating to page: ${filePath}`);
            await mainWindow.loadURL(fileUrl);
            mainWindow.webContents.send('page-data', data); // 데이터 전달
        } catch (err) {
            log.error(`페이지 로드 실패: ${err.message}`);
        }
    });

    // 로그 핸들러
    ipcMain.on('log-to-main', (event, { level, message }) => {
        const timestamp = new Date().toISOString();
        const logMethod = log[level] || log.debug; // level이 유효하지 않으면 debug로 처리
        logMethod(`[렌더러] ${timestamp} - ${message}`);
    });

    // 신규 로그인 후 저장된 config.json을 기준으로 앱을 다시 초기화한다.
    ipcMain.on('restart-app-after-login', () => {
        log.info('신규 로그인 완료 → 머신 프로그램을 다시 시작합니다.');
        app.relaunch();
        app.exit(0);
    });

    // 렌더러의 관리자 숨김 기능 요청으로 머신 창을 최소화한다.
    ipcMain.on('minimize-machine-window', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.minimize();
            log.info('우측 상단 로고 10회 클릭 → 머신 창을 최소화했습니다.');
        }
    });
}

module.exports = { setupEventHandlers };
