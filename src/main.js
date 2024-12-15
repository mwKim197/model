const { app, BrowserWindow} = require('electron');
const { autoUpdater } = require("electron-updater");
const path = require('path');
const express = require('express');
const log = require('./logger');
const { signupUser, loginUser } = require('./login');
const Connect = require('./serial/portProcesses/Connect');
const serialDataManager  = require('./services/serialDataManager');
const Order = require('./serial/portProcesses/Order');
const Ice = require('./serial/portProcesses/Ice');
const Cup = require('./serial/portProcesses/Cup');
const Menu = require('./aws/db/Menu');
const fs = require('fs');
const appServer = express();
const { createServer } = require("http");
const server = createServer(appServer);
const {serialCommCom1, serialCommCom3, serialCommCom4} = require("./serial/serialCommManager")
// MC 머신 Data - SerialPolling 인스턴스 생성
const polling = new serialDataManager(serialCommCom1);

const { ipcMain } = require('electron');

// Express 서버에서 serialComm을 각 포트에 맞게 사용하도록 설정
appServer.use((req, res, next) => {
    req.serialCommCom1 = serialCommCom1;  // COM1 포트를 사용하는 시리얼 통신 객체
    req.serialCommCom3 = serialCommCom3;  // COM3 포트를 사용하는 시리얼 통신 객체
    req.serialCommCom4 = serialCommCom4;  // COM4 포트를 사용하는 시리얼 통신 객체
    next();
});

// 시리얼 통신 부
const cors = require('cors');

appServer.use((req, res, next) => {
    res.set('Content-Type', 'text/html');
    next();
});
appServer.use(cors());

appServer.use(cors({
    origin: ['http://test_user1.narrowroad-model.com:3000', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

appServer.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Private-Network', 'true'); // PNA 허용
    next();
});

// assets 디렉토리를 정적 파일로 제공
appServer.use('/assets', express.static(path.resolve(__dirname, 'assets')));
appServer.use('/renderer', express.static(path.join(__dirname, 'renderer'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));


appServer.use(express.json());
appServer.use(Connect); // MC연결
appServer.use(Order);   // MC주문
appServer.use(Ice);     // 카이저 ICE
appServer.use(Cup);     // 컵 디스펜서
appServer.use(Menu);    // MENU DB

appServer.use((req, res, next) => {
    console.log(`Request URL: ${req.url}`);
    next();
});

// 로그인처리 임시
loginUser("test_user1", "test_user1").then();

// 서버 시작
server.listen(3000, '0.0.0.0', () => {
    log.info('Server running on http://localhost:3000');
});

// 버전읽기
appServer.get('/version', (req, res) => {
    // package.json 파일에서 version 값 읽기
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
    res.json({ version: packageJson.version });
});


// Electron 창 설정
async function createWindow() {
    const { default: Store } = await import('electron-store'); // 비동기 Import
    const store = new Store();

    // 데이터 초기화
    if (!store.has('user')) {
        store.set('user', { userId: false });
    }

    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        //alwaysOnTop: true,          // 항상 윈도우가맨위
        //fullscreen: true,           // 전체화면
        //autoHideMenuBar: true,      // 메뉴바 숨기기
        icon: path.join(__dirname, "assets", "icons", "coffee_bean_icon.png"),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
    });

    win.loadFile(path.join(__dirname, 'renderer', 'index', 'index.html'));

    // 주기적으로 렌더러에 데이터 전송 [TODO]
   /* setInterval(() => {
        const serialData = polling.getSerialData('RD1'); // RD1 데이터 가져오기
        console.log('Sending serialData to renderer:', serialData);
        win.webContents.send('update-serial-data', serialData);
    }, 3000); // 3초마다 데이터 전송*/


    // Renderer Process에 데이터 전달
    ipcMain.handle('get-user-data', () => {
        return store.get('user');
    });

    // 페이지 변경 핸들러
    ipcMain.on('navigate-to-page', (event,{pageName, data} ) => {
        const win = BrowserWindow.getFocusedWindow(); // 현재 활성화된 창
        const filePath = path.join(__dirname, 'renderer', pageName, `${pageName}.html`);
        win.loadFile(filePath).then(() => {
            // 페이지 로드 후 데이터 전달
           win.webContents.send('page-data', data); // 데이터 렌더러로 전달
        }).catch((err) => {
            console.error('Failed to load page:', err.message);
        });
    });

    // IPC 로그 이벤트 처리
    ipcMain.on('log-to-main', (event, { level, message }) => {
        const timestamp = new Date().toISOString();

        switch (level) {
            case 'info':
                log.info(`[렌더러 프로세스] ${timestamp} - ${message}`);
                break;
            case 'warn':
                log.warn(`[렌더러 프로세스] ${timestamp} - ${message}`);
                break;
            case 'error':
                log.error(`[렌더러 프로세스] ${timestamp} - ${message}`);
                break;
            default:
                log.debug(`[렌더러 프로세스] ${timestamp} - ${message}`);
                break;
        }
    });

}


/* Updater ======================================================*/

autoUpdater.on('checking-for-update', () => {
    log.info('업데이트 확인 중...');
});
autoUpdater.on('update-available', () => {
    log.info('업데이트가 가능합니다.');
});
autoUpdater.on('update-not-available', () => {
    log.info('현재 최신버전입니다.');
});
autoUpdater.on('error', (err) => {
    log.info('에러가 발생하였습니다. 에러내용 : ' + err);
});
autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "다운로드 속도: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - 현재 ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    log.info(log_message);
})
autoUpdater.on('update-downloaded', () => {
    log.info('업데이트가 완료되었습니다.');
});

/* Electron =====================================================*/

/** 초기화가 끝나게 되면 실행 */
app.whenReady().then(async () => {


    createWindow();
    // polling.startPolling() 호출 전 상태 확인
    console.log('Before startPolling:', polling.pollingTimer, polling.isPollingActive);

    // 폴링 호출
    await polling.startPolling();

    // polling.startPolling() 호출 후 상태 확인
    console.log('After startPolling:', polling.pollingTimer, polling.isPollingActive);

    await autoUpdater.checkForUpdates();
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
