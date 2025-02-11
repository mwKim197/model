const cloudflareApi = require('./api/cloudflareApi.js');
const { BrowserWindow } = require('electron');
const log = require('../logger');
const fs = require('fs');
const os = require('os');
const path = require("path");
const {app} = require("electron");
const https = require('follow-redirects').https;

const appDataPath = app.getPath('userData');
const cloudflareDir = path.join(appDataPath, 'cloudflared');
const cloudflareBin = path.join(cloudflareDir, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
const configFile = path.join(cloudflareDir, 'config.yml');
// ✅ Cloudflared 기본 `cert.pem` 경로 설정
function getCloudflaredCertPath() {
    return path.join(os.homedir(), '.cloudflared', 'cert.pem');
}

const cloudflareCert = getCloudflaredCertPath(); // ✅ 올바른 cert.pem 경로 사용

const { exec, execSync, spawn } = require('child_process');
log.info("cloudflareDir ::: ",cloudflareDir);
const cloudflareCertPath = path.join(
    process.env.APPDATA || path.join(process.env.HOME, '.config'),
    'model',
    'cloudflared',
    'origin-ca.pem'
);

// ✅ Cloudflare 인증서 자동 다운로드
function downloadCloudflareCert(callback) {
    if (fs.existsSync(cloudflareCertPath)) {
        log.info("✅ Cloudflare Origin CA 인증서가 이미 존재합니다.");
        return callback();
    }

    log.info("⏳ Cloudflare Origin CA 인증서 다운로드 중...");

    const file = fs.createWriteStream(cloudflareCertPath);
    https.get('https://developers.cloudflare.com/ssl/static/origin_ca_rsa_root.pem', (response) => {
        if (response.statusCode !== 200) {
            log.error(`❌ 인증서 다운로드 실패: HTTP ${response.statusCode}`);
            fs.unlinkSync(cloudflareCertPath);
            return;
        }

        response.pipe(file);
        file.on('finish', () => {
            file.close(() => {
                log.info("✅ Cloudflare Origin CA 인증서 다운로드 완료!");
                callback();
            });
        });
    }).on('error', (err) => {
        log.error("❌ 인증서 다운로드 실패:", err.message);
        fs.unlinkSync(cloudflareCertPath);
    });
}


// ✅ Cloudflared 경로 자동 감지
function getCloudflaredDir() {
    return path.join(os.homedir(), '.cloudflared');
}

// ✅ 인증 파일 자동 감지
function getCloudflaredCredentials() {
    const cloudflaredDir = getCloudflaredDir();
    const files = fs.readdirSync(cloudflaredDir);
    const credentialFile = files.find(file => file.endsWith('.json') && file !== 'cert.pem');

    if (!credentialFile) {
        throw new Error('❌ credentials.json 파일을 찾을 수 없습니다.');
    }

    return path.join(cloudflaredDir, credentialFile);
}

// ✅ Cloudflared 다운로드
function downloadCloudflared(callback) {
    if (fs.existsSync(cloudflareBin) && fs.statSync(cloudflareBin).size > 0) {
        log.info("✅ Cloudflared 이미 설치됨.");
        return callback();
    }

    log.info("⏳ Cloudflared 다운로드 중...");

    let url = process.platform === 'win32'
        ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
        : process.platform === 'darwin'
            ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64'
            : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';

    fs.mkdirSync(cloudflareDir, { recursive: true });

    const file = fs.createWriteStream(cloudflareBin);

    https.get(url, (response) => {
        if (response.statusCode !== 200) {
            log.error(`❌ 다운로드 실패: HTTP ${response.statusCode}`);
            fs.unlinkSync(cloudflareBin);
            return;
        }

        response.pipe(file);

        file.on('finish', () => {
            file.close(() => {
                if (fs.existsSync(cloudflareBin) && fs.statSync(cloudflareBin).size > 0) {
                    fs.chmodSync(cloudflareBin, 0o755);
                    log.info("✅ Cloudflared 다운로드 완료!");
                    callback();
                } else {
                    log.error("❌ 다운로드된 파일이 비어 있음 (0KB)");
                    fs.unlinkSync(cloudflareBin);
                }
            });
        });
    }).on('error', (err) => {
        log.error("❌ Cloudflared 다운로드 실패:", err.message);
        fs.unlinkSync(cloudflareBin);
    });
}

// ✅ Cloudflare 로그인
async function cloudflareLogin(callback) {
    log.info("🚀 Cloudflare 로그인 중...");

    exec(`${cloudflareBin} tunnel login`, (error) => {
        if (error) {
            log.error(`❌ Cloudflare 로그인 실패: ${error.message}`);
            return;
        }
        log.info("✅ Cloudflare 로그인 성공");

        // 🔥 로그인 후 터널을 생성해서 credentials.json이 반드시 존재하도록 만듦
        setTimeout(async () => {
            await getOrCreateTunnelUUID(); // ✅ 터널 생성 강제 실행
            setCloudflareEnvVariable(); // ✅ 로그인 후 환경 변수 설정
            callback();
        }, 3000);
    });
}

// ✅ 환경변수 등록
function setCloudflareEnvVariable() {
    if (!fs.existsSync(cloudflareCert)) {
        log.error("❌ Cloudflare 인증서 없음! 먼저 로그인하세요.");
        return;
    }

    exec(`setx TUNNEL_ORIGIN_CERT "${cloudflareCert}"`, (error) => {
        if (error) {
            log.error(`❌ 환경 변수 등록 실패: ${error.message}`);
        } else {
            log.info("✅ 환경 변수 설정 완료!");
        }
    });
}

// ✅ Cloudflare Tunnel UUID 확인 또는 생성
async function getOrCreateTunnelUUID() {
    try {
        log.info("🔍 기존 Cloudflare Tunnel UUID 확인 중...");

        // ✅ 기존 터널 목록 조회
        const listOutput = execSync(`${cloudflareBin} tunnel list`, { encoding: 'utf8' });

        // ✅ 터널 목록에서 `model-app`의 UUID 추출
        const match = listOutput.match(/([a-f0-9-]+)\s+model-app/);
        let tunnelUUID = match ? match[1] : null;

        if (tunnelUUID) {
            log.info(`✅ 기존 터널 UUID 사용: ${tunnelUUID}`);
            return tunnelUUID;
        }

        log.info("🆕 기존 터널이 없음. 새 터널 생성 중...");

        // ✅ 새로운 터널 생성
        const createOutput = execSync(`${cloudflareBin} tunnel create model-app`, { encoding: 'utf8' });

        // ✅ 새 터널 생성 후 UUID 추출
        const newMatch = createOutput.match(/Created tunnel (.+)/);
        if (!newMatch) {
            throw new Error("❌ 터널 UUID 생성 실패");
        }

        tunnelUUID = newMatch[1].trim();
        log.info(`✅ 새 UUID 생성됨: ${tunnelUUID}`);

        return tunnelUUID;
    } catch (error) {
        log.error(`❌ 터널 UUID 가져오기 실패: ${error.message}`);
        return null;
    }
}

// ✅ `config.yml` 생성
async function generateConfigYml(tunnelUUID, url) {
    try {
        log.info("🚀 config.yml 생성 중...");

        // Electron에서 메인 창 가져오기
        const mainWindow = BrowserWindow.getAllWindows()[0];

        if (!mainWindow) {
            log.error("❌ Main window not found!");
            return;
        }

        if (!url) {
            log.error("❌ 사용자 URL 정보 없음! 기본값 사용: nw-api.org");
            url = 'nw-api.org';
        }
        // 🔥 올바른 credentials 파일 경로 가져오기
        const credentialsFile = getCloudflaredCredentials();
        // ✅ `config.yml` 업데이트
        const configContent = `tunnel: ${tunnelUUID}
credentials-file: ${credentialsFile}

ingress:
  - hostname: ${url}
    service: http://localhost:3142
  - service: http_status:404
`;

        // 디렉토리 생성 후 파일 저장
        fs.mkdirSync(cloudflareDir, { recursive: true });
        fs.writeFileSync(configFile, configContent, 'utf8');

        log.info(`✅ config.yml 생성 완료: ${url} 에서 접속 가능`);
    } catch (error) {
        log.error(`❌ config.yml 생성 실패: ${error.message}`);
    }
}


// ✅ Cloudflare Tunnel 실행
function startCloudflareTunnel() {
    if (!fs.existsSync(configFile)) {
        log.error("❌ Cloudflare Tunnel 설정 파일 없음!");
        return;
    }

    log.info("🚀 Cloudflare Tunnel 실행 중...");

    const tunnel = spawn(cloudflareBin, [
        'tunnel',
        '--config', configFile,
        'run',
        '--origin-ca-pool', cloudflareCertPath, // 🔥 인증서 적용
    ], { shell: true });

    tunnel.stdout.on('data', (data) => log.info(`Cloudflared: ${data}`));
    tunnel.stderr.on('data', (data) => log.info(`Cloudflared log: ${data}`));

    tunnel.on('close', (code) => log.info(`Cloudflared 종료 (코드: ${code})`));

    require('electron').app.on('before-quit', () => tunnel.kill());
}

// ✅ 전체 실행
async function setupCloudflare(userId) {
    log.info("🚀 Cloudflare 설정 시작...");

    await downloadCloudflared(() => {
        cloudflareLogin(async () => {
            const tunnelUUID = await getOrCreateTunnelUUID();
            if (!tunnelUUID) return log.error("❌ 터널 UUID 가져오기 실패.");

            // ✅ 서브도메인 생성
            const url = await cloudflareApi.createCloudflareSubdomain(`${userId}`, tunnelUUID);
            log.info(`✅ 터널 UUID: ${tunnelUUID}`);
            if (!url) return log.error("❌ 서브 url 등록 실패.");
            // ✅ Cloudflare 인증서 다운로드 (🔥 이 시점에 추가)
            downloadCloudflareCert(async () => {
                // ✅ config.yml 생성
                await generateConfigYml(tunnelUUID, url);
                log.info(`✅ config.yml 생성 완료: ${url} 에서 접속 가능`);

                // ✅ Cloudflared 실행
                startCloudflareTunnel();
            });

        });
    });

    log.info("🎉 Cloudflare 설정 완료!");
}

module.exports = { setupCloudflare };