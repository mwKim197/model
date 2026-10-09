const path = require('path');
const { spawn, execSync } = require('child_process');
const { app } = require('electron');
const fs = require('fs');
const log = require('../logger');
const { API_BASE_URL } = require('../config/apiConfig');

const basePath = path.dirname(app.getPath('exe'));
const cloudflaredDir = path.join(basePath, 'cloudflared');
const bundledCloudflaredBin = path.join(cloudflaredDir, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
const developmentCloudflaredBin = path.join(app.getAppPath(), 'resources', process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
const systemCloudflaredBin = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
const cloudflaredBin = [bundledCloudflaredBin, developmentCloudflaredBin]
    .find((candidate) => fs.existsSync(candidate)) || systemCloudflaredBin;

let cloudflareProcess = null;
let currentUserId = null;
let currentTunnelToken = null;

function isCloudflareRunning() {
    try {
        const output = execSync('tasklist', { encoding: 'utf-8' });
        return output.includes('cloudflared.exe');
    } catch (_error) {
        return false;
    }
}

function stopCloudflareTunnel() {
    if (cloudflareProcess) {
        log.info('⚠️ Cloudflare Tunnel 종료 중...');
        cloudflareProcess.kill('SIGTERM');
        cloudflareProcess = null;
    }
    if (process.platform === 'win32') {
        try {
            execSync('taskkill /F /IM cloudflared.exe', { stdio: 'ignore' });
        } catch (_error) {
            // 실행 중인 프로세스가 없으면 taskkill이 실패할 수 있다.
        }
    }
}

async function restartCloudflareTunnel() {
    stopCloudflareTunnel();
    await new Promise((resolve) => setTimeout(resolve, 2000));
}

async function requestTunnelToken(userId) {
    const url = new URL(`${API_BASE_URL}/model_machine_registry`);
    url.searchParams.set('func', 'get-tunnel-token');
    url.searchParams.set('userId', userId);
    const result = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' } });
    const payload = await result.json().catch(() => ({}));
    if (!result.ok || !payload?.data?.token) {
        throw new Error(payload?.message || `터널 토큰 요청 실패 (HTTP ${result.status})`);
    }
    return payload.data;
}

function startCloudflareTunnel(token = currentTunnelToken) {
    if (!token) throw new Error('Cloudflare 터널 토큰이 없습니다.');
    fs.mkdirSync(cloudflaredDir, { recursive: true });
    log.info(`🚀 Lambda 발급 토큰으로 Cloudflare Tunnel 실행 중: ${cloudflaredBin}`);
    return new Promise((resolve, reject) => {
        const processInstance = spawn(cloudflaredBin, ['tunnel', 'run', '--token', token], {
            shell: false,
            windowsHide: true,
        });
        cloudflareProcess = processInstance;
        let settled = false;
        const startupTimer = setTimeout(() => {
            settled = true;
            resolve();
        }, 1000);

        processInstance.stdout.on('data', (data) => log.info(`Cloudflared: ${data}`));
        processInstance.stderr.on('data', (data) => log.info(`Cloudflared log: ${data}`));
        processInstance.on('error', (error) => {
            clearTimeout(startupTimer);
            log.error(`❌ Cloudflared 실행 실패: ${error.message}`);
            if (!settled) reject(error);
        });
        processInstance.on('close', (code) => {
            clearTimeout(startupTimer);
            log.info(`Cloudflared 종료 (코드: ${code})`);
            if (cloudflareProcess === processInstance) cloudflareProcess = null;
            if (!settled) reject(new Error(`Cloudflared가 시작 중 종료되었습니다. (코드: ${code})`));
        });
    });
}

async function setupCloudflare(userId) {
    log.info(`🚀 Cloudflare 토큰 방식 설정 시작: ${userId}`);
    await restartCloudflareTunnel();
    const tunnel = await requestTunnelToken(userId);
    currentUserId = userId;
    currentTunnelToken = tunnel.token;
    await startCloudflareTunnel(currentTunnelToken);
    log.info(`✅ Cloudflare Tunnel 실행 요청 완료: ${tunnel.tunnelUrl}`);
    return tunnel.tunnelUrl;
}

async function checkTunnelHealth(userId = currentUserId) {
    try {
        const localRes = await fetch('http://localhost:3142/health');
        if (!localRes.ok) throw new Error('Local API unhealthy');
        const externalRes = await fetch(`https://${userId}.nw-api.org/health`);
        if (!externalRes.ok) throw new Error(`External API unhealthy (${externalRes.status})`);
    } catch (error) {
        log.warn(`⚠️ Healthcheck 실패 (${error.message}) → 터널 토큰 재발급 후 재시작`);
        try {
            await setupCloudflare(userId);
        } catch (restartError) {
            log.error(`❌ Cloudflare Tunnel 재시작 실패: ${restartError.message}`);
        }
    }
}

module.exports = { setupCloudflare, isCloudflareRunning, stopCloudflareTunnel, checkTunnelHealth };
