const { ipcMain } = require('electron');
const log = require('../logger');

function setupEventHandlers(mainWindow) {
    ipcMain.handle('get-user-data', async () => {
        // 사용자 데이터 처리 로직
    });

    ipcMain.on('navigate-to-page', async (event, { pageName, data }) => {
        const filePath = path.join(__dirname, '../renderer', pageName, `${pageName}.html`);
        try {
            await mainWindow.loadFile(filePath);
            mainWindow.webContents.send('page-data', data);
        } catch (err) {
            log.error(`페이지 로드 실패: ${err.message}`);
        }
    });

    ipcMain.on('log-to-main', (event, { level, message }) => {
        const timestamp = new Date().toISOString();
        log[level]?.(`[렌더러] ${timestamp} - ${message}`) || log.debug(`[렌더러] ${timestamp} - ${message}`);
    });
}

module.exports = { setupEventHandlers };
