const path = require('path');
const { spawn, execSync  } = require('child_process');
const { app } = require('electron');
const fs = require('fs');
const log = require('../logger');
const cloudflareApi = require('./api/cloudflareApi.js');

// ✅ Electron이 실행된 디렉토리를 가져옴 (설치된 실제 경로)
const basePath = path.dirname(app.getPath('exe')); // model.exe의 디렉토리 찾기
const cloudflaredDir = path.join(basePath, 'cloudflared'); // Cloudflare 실행 폴더
const cloudflaredPath = path.join(cloudflaredDir, 'cloudflared.exe');
const credentialsFile = path.join(cloudflaredDir, 'ca0fec0f-d28d-4ed1-ade8-980fa45adfef.json');
const configFile = path.join(cloudflaredDir, 'config.yml');

let cloudflareProcess = null; // ✅ Cloudflare 프로세스 핸들러

// ✅ Cloudflare 실행 여부 체크 함수
function isCloudflareRunning() {
    try {
        const output = execSync('tasklist', { encoding: 'utf-8' });
        return output.includes('cloudflared.exe');
    } catch (error) {
        return false;
    }
}

// ✅ Cloudflare 종료 함수
function stopCloudflareTunnel() {
    if (cloudflareProcess) {
        log.info("⚠️ Cloudflare Tunnel 종료 중...");
        cloudflareProcess.kill('SIGTERM');
        try {
            execSync('taskkill /F /IM cloudflared.exe'); // 강제 종료
            log.info("✅ Cloudflare Tunnel 강제 종료 완료 (Windows)");
        } catch (error) {
            log.error("❌ Cloudflare 종료 실패 (Windows):", error.message);
        }
        cloudflareProcess = null;
    }
}

// ✅ Cloudflare Tunnel 실행 함수
function startCloudflareTunnel() {
    if (!fs.existsSync(credentialsFile)) {
        log.error("❌ Cloudflare Tunnel 인증 파일 없음! 로그인 필요");
        return;
    }

    if (!fs.existsSync(configFile)) {
        log.error("❌ config.yml 없음! 먼저 `setupCloudflare()`를 실행하세요.");
        return;
    }

    // ✅ Cloudflare Tunnel 실행
    log.info("🚀 Cloudflare Tunnel 실행 중...");
    cloudflareProcess = spawn(cloudflaredPath, ['tunnel', '--config', configFile, 'run'], { shell: true });

    cloudflareProcess.stdout.on('data', (data) => log.info(`Cloudflared: ${data}`));
    cloudflareProcess.stderr.on('data', (data) => log.info(`Cloudflared log: ${data}`));

    cloudflareProcess.on('close', (code) => log.info(`Cloudflared 종료 (코드: ${code})`));
}

// ✅ 전체 실행
async function setupCloudflare(userId) {
    log.info("🚀 Cloudflare 설정 시작...");

    // ✅ 이미 실행 중이면 실행하지 않음
    if (isCloudflareRunning()) {
        log.info("⚠️ Cloudflare Tunnel이 이미 실행 중입니다. 중복 실행 방지.");
        return;
    }

    log.warn("✅️ config.yml 생성 시작 ");
    const tunnelUUID = "ca0fec0f-d28d-4ed1-ade8-980fa45adfef"; // 기존 터널 UUID 사용
    const url = await cloudflareApi.createCloudflareSubdomain(`${userId}`, tunnelUUID);

    if (!url) {
        log.error("❌ 서브 도메인 생성 실패.");
        return;
    }

    await generateConfigYml(tunnelUUID, url);
    log.info(`✅ config.yml 생성 완료: ${url} 에서 접속 가능`);
    startCloudflareTunnel();

}

// ✅ `config.yml` 생성 함수
async function generateConfigYml(tunnelUUID, url) {
    try {
        log.info("🚀 config.yml 생성 중...");

        if (!url) {
            log.error("❌ 사용자 URL 정보 없음!");
            return;
        }

        const configContent = `tunnel: ${tunnelUUID}
credentials-file: ${credentialsFile}

ingress:
  - hostname: ${url}
    service: http://localhost:3142
  - service: http_status:404
`;
        fs.writeFileSync(configFile, configContent);
        log.info(`✅ config.yml 생성 완료: ${url} 에서 접속 가능`);
    } catch (error) {
        log.error(`❌ config.yml 생성 실패: ${error.message}`);
    }
}

module.exports = { setupCloudflare, isCloudflareRunning, stopCloudflareTunnel };
