const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');
const log = require('./logger');

function initializeUpdater() {
    autoUpdater.on('checking-for-update', () => log.info('업데이트 확인 중...'));
    autoUpdater.on('update-available', () => {
        log.info('업데이트가 가능합니다.');
        dialog.showMessageBox({
            type: 'info',
            title: '업데이트 확인',
            message: '새로운 업데이트가 있습니다. 다운로드하시겠습니까?',
            buttons: ['업데이트', '나중에']
        }).then(result => {
            if (result.response === 0) { // '업데이트' 선택 시
                autoUpdater.downloadUpdate();
            }
        });
    });

    autoUpdater.on('update-not-available', () => {
        log.info('현재 최신버전입니다.');
        dialog.showMessageBox({
            type: 'info',
            title: '업데이트 확인',
            message: '현재 최신 버전입니다.'
        });
    });

    autoUpdater.on('error', (err) => log.error(`업데이트 에러: ${err}`));

    autoUpdater.on('update-downloaded', () => {
        log.info('업데이트 다운로드 완료.');
        dialog.showMessageBox({
            type: 'info',
            title: '업데이트 완료',
            message: '업데이트가 다운로드되었습니다. 지금 설치하고 재시작하시겠습니까?',
            buttons: ['재시작', '나중에']
        }).then(result => {
            if (result.response === 0) { // '재시작' 선택 시
                autoUpdater.quitAndInstall();
            }
        });
    });
    autoUpdater.checkForUpdates();
}

// ✅ 수동 업데이트 실행 함수 (버튼에서 호출 가능)
function checkForUpdatesManually() {
    autoUpdater.checkForUpdates();
}

module.exports = { initializeUpdater, checkForUpdatesManually };
