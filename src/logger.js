const log = require('electron-log');

// 현재 날짜를 `yyyy-mm-dd` 형식으로 가져오는 함수
function getFormattedDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// File 로그 설정
if (log.transports.file) {
    log.transports.file.maxSize = 10 * 1024 * 1024;
    log.transports.file.level = 'info'; // 파일에 기록할 최소 레벨
    log.transports.file.fileName = getFormattedDate()+'_model.log'; // 로그 파일 이름 변경 (기본값: main.log)

}

// Console 로그 설정
if (log.transports.console) {
    log.transports.console.level = 'debug'; // 콘솔에 기록할 최소 레벨
    log.transports.console.format = '{h}:{i}:{s}.{ms} [{level}] {text}'; // 출력 포맷 변경
}

// IPC 로그 (렌더러에서 메인으로 전달되는 로그)
if (log.transports.ipc) {
    log.transports.ipc.level = 'error'; // IPC로 전송할 최소 로그 레벨
}

// Remote 로그 (네트워크 기반 로깅)
if (log.transports.remote) {
    log.transports.remote.level = false; // Remote 로그 비활성화
}


module.exports = log;