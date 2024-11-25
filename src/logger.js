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
// 로그 레벨 설정
/*log.transports.file.level = 'info'; // 파일에는 info 이상만 기록
log.transports.console.level = 'debug'; // 콘솔에는 debug 이상 기록*/

/*log.info('info 레벨 로그');
log.debug('debug 레벨 로그');
log.warn('warn 레벨 로그');
log.error('error 레벨 로그');*/

/* 양식 추가
*
log.info(`[메인 프로세스] ${new Date().toISOString()} - 로그 메시지`);
log.warn(`[렌더러 프로세스] ${new Date().toISOString()} - 경고 메시지`);
*/


// C:<사용자>\AppData\Roaming\<appName>\logs
/* 변경 예제
* log.transports.file.resolvePath = () => {
*   return '/custom/path/to/logs/app.log'; // 로그 파일 위치 변경
*};
* */

/* 파일사이즈 예제
* log.transports.file.maxSize = 10 * 1024 * 1024; // 최대 10MB v
* */
module.exports = log;