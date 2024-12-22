const { BrowserWindow, ipcMain} = require('electron');
const path = require('path');

async function createMainWindow() {
    const { default: Store } = await import('electron-store'); // 비동기 Import
    const store = new Store();

    // 사용자 데이터 초기화
    if (!store.has('user')) {
        store.set('user', { userId: false });
    }
    // 6. Renderer와 데이터 통신
    ipcMain.handle('get-user-data', () => {
        return store.get('user'); // Electron Store에서 사용자 데이터 반환
    });

    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        icon: path.join(__dirname, '../assets/icons/coffee_bean_icon.png'),
        webPreferences: {
            preload: path.join(__dirname, '../preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
    });

    await win.loadFile(path.join(__dirname, '../renderer/index/index.html'));
    return win;
}

module.exports = { createMainWindow };