const log = require('electron-log');

// 로그 레벨 설정
log.transports.file.level = 'info'; // 파일에는 info 이상만 기록
log.transports.console.level = 'debug'; // 콘솔에는 debug 이상 기록

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