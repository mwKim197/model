const { BrowserWindow, ipcMain} = require('electron');
const path = require('path');
const eventEmitter = require('../services/events');
let win = null;

async function createMainWindow() {
    const { default: Store } = await import('electron-store'); // 비동기 Import
    const store = new Store();

    // 사용자 데이터 초기화
    if (!store.has('user')) {
        store.set('user', { userId: false });
    }

    // 마지막 세척 날짜 조회
    ipcMain.handle('get-last-wash-date', () => {
        return store.get('lastWashDate');
    });

    // 세척 날짜 세팅
    ipcMain.handle('set-last-wash-date', (_event, value) => {
        store.set('lastWashDate', value);
    });

    // 6. Renderer와 데이터 통신
    ipcMain.handle('get-user-data', () => {
        return store.get('user'); // Electron Store에서 사용자 데이터 반환
    });

    win = new BrowserWindow({
        width: 1200,
        height: 900,
        icon: path.join(__dirname, '../assets/icons/coffee_bean_icon.png'),
        webPreferences: {
            preload: path.join(__dirname, '../preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
        },
        fullscreen: true,
        alwaysOnTop: true,
        autoHideMenuBar: true,
    });

    // IPC 리스너 설정 - 렌더러로 데이터 전송
    eventEmitter.on('order-update', (data) => {
        if (win && win.webContents) {
            win.webContents.send('order-update', data);
        }
    });

    // Renderer에서 win 리프레시
    ipcMain.handle('order-refresh', () => {
        if (win && win.webContents) {
            return win.refresh();
        }
    });

    await win.loadFile(path.join(__dirname, '../renderer/index/index.html'));
    return win;
}

module.exports = { createMainWindow, getMainWindow: () => win };
