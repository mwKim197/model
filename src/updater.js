const { autoUpdater } = require('electron-updater');
const { BrowserWindow } = require('electron');
const log = require('./logger');

autoUpdater.forceDevUpdateConfig = true;

let overlayWindow = null; // 전체 화면 창 변수

autoUpdater.forceDevUpdateConfig = true;

function createOverlayWindow() {
    if (overlayWindow) return; // 이미 있으면 다시 만들지 않음

    overlayWindow = new BrowserWindow({
        width: 800,
        height: 600,
        alwaysOnTop: true, // 항상 위에 표시
        frame: false, // 제목 표시줄 제거
        transparent: true, // 투명 창
        fullscreen: true, // 전체 화면
        modal: true, // 메인 창을 블록
        skipTaskbar: true, // 작업 표시줄에서 숨김
        resizable: false,
        show: false, // 처음에는 숨겨둠
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    overlayWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
        <html>
            <body style="background:rgba(0,0,0,0.5); color:white; font-size:24px; text-align:center; display:flex; justify-content:center; align-items:center; height:100vh;">
                업데이트 중입니다... 창을 닫지 마세요.
            </body>
        </html>
    `));
}

// 창 제거 함수
function removeOverlayWindow() {
    if (overlayWindow) {
        overlayWindow.close();
        overlayWindow = null;
    }
}

function initializeUpdater() {
    autoUpdater.on('checking-for-update', () => log.info('업데이트 확인 중...'));
    autoUpdater.on('update-available', () => {
        log.info('업데이트가 가능합니다.');
        createOverlayWindow(); // 업데이트가 가능하면 전체 창 띄우기
        autoUpdater.downloadUpdate();
    });

    autoUpdater.on('update-not-available', () => {
        log.info('현재 최신버전입니다.');
    });

    autoUpdater.on('error', (err) => {
        log.error(`업데이트 에러: ${err}`);
        removeOverlayWindow(); // 전체 창 닫기
    });

    autoUpdater.on('update-downloaded', () => {
        log.info('업데이트 다운로드 완료.');
        autoUpdater.quitAndInstall();
        removeOverlayWindow(); // 업데이트가 가능하면 전체 창 닫기
    });
    autoUpdater.checkForUpdates();
}

// ✅ 수동 업데이트 실행 함수 (버튼에서 호출 가능)
function checkForUpdatesManually() {
    autoUpdater.removeAllListeners(); // ✅ 중복 이벤트 방지

    autoUpdater.on('update-available', () => {
        log.info('업데이트가 가능합니다. 다운로드를 시작합니다...');
        createOverlayWindow(); // 업데이트가 가능하면 전체 창 띄우기
        autoUpdater.downloadUpdate(); // 🔥 업데이트가 있으면 자동 다운로드
    });

    autoUpdater.on('update-downloaded', () => {
        log.info('업데이트 다운로드 완료. 앱을 재시작합니다...');
        autoUpdater.quitAndInstall(); // 🔥 다운로드 완료되면 즉시 업데이트 실행
        removeOverlayWindow(); // 전체 창 닫기
    });

    // ✅ 업데이트가 없을 경우 알림 추가
    autoUpdater.on('update-not-available', () => {
        log.info("✅ 현재 최신 버전입니다.");
    });

    autoUpdater.on('error', (err) => {
        log.error(`❌ 업데이트 에러 발생: ${err.message}`);
        removeOverlayWindow(); // 전체 창 닫기
    });

    autoUpdater.checkForUpdates();

}

module.exports = { initializeUpdater, checkForUpdatesManually };
