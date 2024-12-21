const { ipcMain, BrowserWindow } = require('electron');
const log = require('../logger');
const path = require('path');
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
        const filePath = path.join(__dirname, '../renderer', pageName, `${pageName}.html`);
        try {
            console.log(`[DEBUG] Navigating to page: ${filePath}`);
            await mainWindow.loadFile(filePath); // MainWindow에 페이지 로드
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
}

module.exports = { setupEventHandlers };
