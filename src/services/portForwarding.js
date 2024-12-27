const upnp = require('nat-upnp');
const log = require('../logger');

function setupPortForwarding(publicPort, privatePort) {
    const client = upnp.createClient();
    client.portMapping(
        {
            public: publicPort,
            private: privatePort,
            ttl: 3600,
        },
        (err) => {
            if (err) {
                log.error(`포트 포워딩 실패 (공용 포트: ${publicPort}, 사설 포트: ${privatePort}):`, err.message);
                log.error('디버깅 정보:', {
                    stack: err.stack,
                    code: err.code,
                });
            } else {
                log.info(`포트 포워딩 성공: 외부 포트 ${publicPort} → 내부 포트 ${privatePort}`);
            }
        }
    );

    // 포트 해제
    process.on('exit', () => {
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
