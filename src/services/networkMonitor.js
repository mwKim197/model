// 로컬 진단 전용. AWS 저장 및 기존 logger 설정을 변경하지 않는다.
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const dns = require('dns');
const http = require('http');
const https = require('https');
const { execFile } = require('child_process');

const INTERVAL = 60 * 1000;
const RETENTION_DAYS = 90;
const TRAFFIC_INTERVAL = 5 * INTERVAL;
const TRAFFIC_SCRIPT = "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-NetAdapterStatistics | ForEach-Object { [pscustomobject]@{ adapter=$_.Name; index=$_.InterfaceIndex; receivedBytes=[string]$_.ReceivedBytes; sentBytes=[string]$_.SentBytes } } | ConvertTo-Json -Compress";
const CONFIG_SCRIPT = "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; Get-CimInstance Win32_NetworkAdapterConfiguration -Filter 'IPEnabled=True' | ForEach-Object { [pscustomobject]@{ adapter=$_.Description; index=$_.InterfaceIndex; ipv4=@($_.IPAddress | Where-Object { $_ -match '^\\d+\\.' }); gateways=@($_.DefaultIPGateway); dns=@($_.DNSServerSearchOrder); dhcp=$_.DHCPEnabled } } | ConvertTo-Json -Depth 4 -Compress";

function localDate(now) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function execute(file, args, timeout = 5000) {
    return new Promise((resolve, reject) => {
        execFile(file, args, { windowsHide: true, timeout, encoding: 'utf8', maxBuffer: 256 * 1024 },
            (error, stdout) => error ? reject(Object.assign(new Error('Command failed'), { code: error.code })) : resolve(stdout));
    });
}

async function configuration() {
    if (process.platform === 'win32') {
        const output = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', CONFIG_SCRIPT], 8000);
        const parsed = JSON.parse(output.replace(/^\uFEFF/, '').trim() || '[]');
        const interfaces = os.networkInterfaces();
        return (Array.isArray(parsed) ? parsed : [parsed]).map(config => {
            const name = Object.keys(interfaces).find(key => interfaces[key].some(address => (config.ipv4 || []).includes(address.address)));
            return { ...config, adapter: name || config.adapter };
        });
    }
    return Object.entries(os.networkInterfaces()).map(([adapter, addresses]) => ({
        adapter, ipv4: addresses.filter(a => a.family === 'IPv4' && !a.internal).map(a => a.address),
        gateways: [], dns: dns.getServers(),
    }));
}

async function trafficCounters() {
    if (process.platform !== 'win32') return null;
    const output = await execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', TRAFFIC_SCRIPT], 8000);
    const parsed = JSON.parse(output.replace(/^\uFEFF/, '').trim() || '[]');
    return Array.isArray(parsed) ? parsed : [parsed];
}

async function measured(operation) {
    const start = Date.now();
    try { const result = await operation(); return { ok: true, ms: Date.now() - start, ...result }; }
    catch (error) { return { ok: false, ms: Date.now() - start, error: error.code || error.name || 'ERROR' }; }
}

function requestHealth(url) {
    return new Promise((resolve, reject) => {
        const transport = url.startsWith('https:') ? https : http;
        const request = transport.get(url, { agent: false }, response => {
            // 루트의 403/404도 HTTP 도달 결과로 기록하며 업무 API 정상 판정과 구분한다.
            response.destroy();
            resolve({ status: response.statusCode, reachable: true });
        });
        const timer = setTimeout(() => request.destroy(Object.assign(new Error('Timeout'), { code: 'TIMEOUT' })), 4000);
        request.once('close', () => clearTimeout(timer));
        request.once('error', reject);
    });
}

function resolveHost(host, type = 'A') {
    return new Promise((resolve, reject) => {
        const resolver = new dns.Resolver({ timeout: 1500, tries: 1 });
        const timer = setTimeout(() => {
            resolver.cancel();
            reject(Object.assign(new Error('DNS timeout'), { code: 'TIMEOUT' }));
        }, 3500);
        const callback = (error, addresses) => {
            clearTimeout(timer);
            error ? reject(error) : resolve({ addresses });
        };
        if (type === 'SRV') resolver.resolveSrv(host, callback);
        else resolver.resolve4(host, callback);
    });
}

async function cleanup(directory, now = new Date()) {
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    for (const name of await fs.readdir(directory)) {
        const match = /^(\d{4}-\d{2}-\d{2})_network\.log$/.exec(name);
        if (match && match[1] < localDate(cutoff)) {
            const file = path.join(directory, name);
            if ((await fs.lstat(file)).isFile()) await fs.unlink(file);
        }
    }
}

function createNetworkMonitor({ directory, apiBaseUrl, version, collectConfiguration = configuration,
    collectTraffic = trafficCounters, probeHttp = requestHealth, probeDns = resolveHost, runCommand = execute, reportError = () => {} }) {
    let timer, stopped = false, busy = false, lastRun = 0, lastSummary = 0, lastConfig = '', lastDay = '';
    let failedSince = null;
    let previousTraffic = new Map(), lastTraffic = 0;
    let pendingWrite = Promise.resolve();
    const apiOrigin = new URL(apiBaseUrl).origin;
    const apiHost = new URL(apiBaseUrl).hostname;

    function write(level, event, details) {
        const now = new Date();
        const stamp = `${localDate(now)} ${now.toTimeString().slice(0, 8)}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        const line = `[${stamp}] [${level}] ${event} ${JSON.stringify(details)}${os.EOL}`;
        pendingWrite = pendingWrite.then(async () => {
            await fs.mkdir(directory, { recursive: true });
            await fs.appendFile(path.join(directory, `${localDate(now)}_network.log`), line, 'utf8');
        }).catch(() => reportError('네트워크 진단 로그 저장 실패'));
        return pendingWrite;
    }

    async function check(reason = 'periodic') {
        if (stopped || busy || Date.now() - lastRun < INTERVAL) return;
        busy = true;
        lastRun = Date.now();
        try {
            const configResult = await measured(async () => ({ adapters: await collectConfiguration() }));
            const config = configResult.adapters || [];
            const serialized = JSON.stringify(configResult.ok ? config : { error: configResult.error });
            if (serialized !== lastConfig) {
                await write('INFO', '네트워크 설정 변경/최초 확인', configResult);
                lastConfig = serialized;
            }
            if (!lastTraffic || Date.now() - lastTraffic >= TRAFFIC_INTERVAL) {
                try {
                    const counters = await collectTraffic();
                    if (counters) {
                        const now = Date.now(), next = new Map();
                        const adapters = counters.map(item => {
                            const key = `${item.index}:${item.adapter}`;
                            const received = BigInt(item.receivedBytes), sent = BigInt(item.sentBytes);
                            const prior = previousTraffic.get(key);
                            next.set(key, { received, sent, time: now });
                            const reset = !!prior && (received < prior.received || sent < prior.sent);
                            return { adapter: item.adapter, index: item.index,
                                receivedBytes: received.toString(), sentBytes: sent.toString(),
                                intervalMs: prior && !reset ? now - prior.time : null,
                                receivedDeltaBytes: prior && !reset ? (received - prior.received).toString() : null,
                                sentDeltaBytes: prior && !reset ? (sent - prior.sent).toString() : null,
                                baseline: !prior || reset };
                        });
                        await write('INFO', '네트워크 어댑터 사용량', { scope: '어댑터 전체, 프로그램별 구분 불가', adapters });
                        previousTraffic = next;
                        lastTraffic = now;
                    }
                } catch (error) {
                    await write('WARN', '네트워크 사용량 조회 실패', { error: error.code || error.name });
                    lastTraffic = Date.now();
                }
            }
            const gateways = [...new Set(config.flatMap(c => c.gateways || []))].filter(ip => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip));
            const [local, dnsResult, tunnelDns, external, gatewayResults] = await Promise.all([
                measured(() => probeHttp('http://127.0.0.1:3142/health')),
                measured(() => probeDns(apiHost)),
                measured(() => probeDns('_v2-origintunneld._tcp.argotunnel.com', 'SRV')),
                measured(() => probeHttp(apiOrigin)),
                Promise.all(gateways.map(async gateway => ({ gateway, ...await measured(async () => {
                    await runCommand('ping.exe', ['-n', '1', '-w', '1500', gateway], 2500);
                    return { note: 'ICMP 응답 여부이며 인터넷 연결 판정에는 사용하지 않음' };
                }) }))),
            ]);
            // 외부 GET은 읽기 전용 origin 요청. 업무 API/결제 성공 여부를 판정하지 않는다.
            const failed = !dnsResult.ok || !tunnelDns.ok || !external.ok || !local.ok || local.status !== 200;
            const details = { reason, local, dns: dnsResult, tunnelDns, external: { origin: apiOrigin, ...external }, gateways: gatewayResults };
            if (failed && failedSince === null) {
                failedSince = Date.now();
                await write('WARN', '통신/로컬 API 이상 감지', details);
                lastSummary = Date.now();
            } else if (!failed && failedSince !== null) {
                await write('INFO', '통신/로컬 API 복구', { durationMs: Date.now() - failedSince, ...details });
                failedSince = null;
                lastSummary = Date.now();
            } else if (Date.now() - lastSummary >= (failed ? 5 : 30) * INTERVAL) {
                await write(failed ? 'WARN' : 'INFO', failed ? '이상 상태 지속' : '정기 상태 확인', details);
                lastSummary = Date.now();
            }
            const day = localDate(new Date());
            if (day !== lastDay) {
                await cleanup(directory);
                lastDay = day;
            }
        } catch (error) {
            await write('WARN', '진단 수행 실패', { error: error.code || error.name });
        } finally { busy = false; }
    }

    return {
        start() {
            if (timer || stopped) return;
            void write('INFO', '네트워크 진단 시작', { version, pid: process.pid,
                systemUptimeSeconds: Math.floor(os.uptime()),
                estimatedSystemBootAt: new Date(Date.now() - os.uptime() * 1000).toISOString(),
                retentionDays: RETENTION_DAYS, intervalMs: INTERVAL });
            void check('startup');
            timer = setInterval(() => { void check(); }, INTERVAL);
            timer.unref?.();
        },
        notifyFailure() { void check('tunnel-health-failed'); },
        stop() {
            stopped = true;
            clearInterval(timer);
            timer = null;
            return write('INFO', '프로그램 종료 요청', {});
        },
        check,
        flush: () => pendingWrite,
    };
}

let monitor;
function startNetworkMonitor() {
    if (monitor) return;
    const { app } = require('electron');
    const log = require('../logger');
    const { API_BASE_URL } = require('../config/apiConfig');
    monitor = createNetworkMonitor({ directory: path.dirname(log.transports.file.getFile().path),
        apiBaseUrl: API_BASE_URL, version: app.getVersion(), reportError: message => log.warn(message) });
    monitor.start();
}
function stopNetworkMonitor() { return monitor?.stop(); }
function notifyNetworkFailure() { monitor?.notifyFailure(); }

module.exports = { startNetworkMonitor, stopNetworkMonitor, notifyNetworkFailure, createNetworkMonitor, cleanup, localDate };
