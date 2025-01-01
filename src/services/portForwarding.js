const upnp = require('nat-upnp');
const log = require('../logger');

function setupPortForwarding(publicPort, privatePort) {
    const client = upnp.createClient();

    function mapPort() {
        client.portMapping(
            {
                public: publicPort,
                private: privatePort,
                ttl: 3600, // TTL 1시간
            },
            (err) => {
                if (err) {
                    log.error(`포트 포워딩 실패 (공용 포트: ${publicPort}, 사설 포트: ${privatePort}):`, err.message);
                } else {
                    log.info(`포트 포워딩 성공: 외부 포트 ${publicPort} → 내부 포트 ${privatePort}`);
                }
            }
        );
    }

    // 처음 포트 매핑
    mapPort();

    // 55분(3300초)마다 포트 매핑 갱신
    const interval = setInterval(mapPort, 3300 * 1000);

    // 프로그램 종료 시 포트 해제
    process.on('exit', () => {
        clearInterval(interval);
        client.portUnmapping(
            { public: publicPort },
            (err) => {
                if (err) {
                    log.error('포트 해제 실패:', err.message);
                } else {
                    log.info('포트 해제 성공:', publicPort);
                }
            }
        );
    });
}

module.exports = { setupPortForwarding };
