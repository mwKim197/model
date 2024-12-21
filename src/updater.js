const { autoUpdater } = require('electron-updater');
const log = require('./logger');

function initializeUpdater() {
    autoUpdater.on('checking-for-update', () => log.info('업데이트 확인 중...'));
    autoUpdater.on('update-available', () => log.info('업데이트가 가능합니다.'));
    autoUpdater.on('update-not-available', () => log.info('현재 최신버전입니다.'));
    autoUpdater.on('error', (err) => log.error(`업데이트 에러: ${err}`));
    autoUpdater.on('update-downloaded', () => log.info('업데이트 다운로드 완료.'));
    autoUpdater.checkForUpdates();
}

module.exports = { initializeUpdater };
