const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createNetworkMonitor, cleanup, localDate } = require('../src/services/networkMonitor');

test('어댑터 사용량의 5분 증가량과 카운터 초기화를 기록한다', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'model-network-traffic-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    let clock = Date.now(), received = 1000, sent = 300;
    t.mock.method(Date, 'now', () => clock);
    const monitor = createNetworkMonitor({ directory, apiBaseUrl: 'https://example.com',
        collectConfiguration: async () => [],
        collectTraffic: async () => [{ adapter: '이더넷', index: 12, receivedBytes: String(received), sentBytes: String(sent) }],
        probeDns: async () => ({ addresses: [] }), probeHttp: async () => ({ status: 200 }) });
    await monitor.check();
    received = 1500; sent = 500; clock += 300001;
    await monitor.check();
    received = 10; sent = 5; clock += 300001;
    await monitor.check();
    const content = await fs.readFile(path.join(directory, `${localDate(new Date())}_network.log`), 'utf8');
    assert.match(content, /"receivedDeltaBytes":"500"/);
    assert.match(content, /"sentDeltaBytes":"200"/);
    assert.match(content, /"receivedBytes":"10".*"receivedDeltaBytes":null.*"baseline":true/);
});

test('장애 시작/지속/복구와 설정을 별도 파일에 기록하며 중복 진단을 제한한다', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'model-network-test-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    let clock = Date.now(), offline = true, probes = 0;
    t.mock.method(Date, 'now', () => clock);
    const monitor = createNetworkMonitor({ directory, version: 'test', apiBaseUrl: 'https://example.com/private?token=secret',
        collectConfiguration: async () => [{ adapter: '이더넷 2', ipv4: ['192.0.2.2'], gateways: [], dns: ['192.0.2.1'] }],
        probeDns: async () => {
            probes++;
            if (offline) throw Object.assign(new Error('private message'), { code: 'ETIMEOUT' });
            return { addresses: ['192.0.2.3'] };
        },
        probeHttp: async url => ({ status: url.includes('127.0.0.1') ? 200 : 403, reachable: true }),
    });
    await monitor.check();
    await monitor.check();
    assert.equal(probes, 2, '동일 분의 재호출은 추가 진단하지 않음');
    clock += 6 * 60000;
    await monitor.check();
    offline = false;
    clock += 60001;
    await monitor.check();
    await monitor.stop();
    const content = await fs.readFile(path.join(directory, `${localDate(new Date())}_network.log`), 'utf8');
    assert.match(content, /이더넷 2/);
    assert.match(content, /이상 감지/);
    assert.match(content, /이상 상태 지속/);
    assert.match(content, /복구/);
    assert.match(content, /"durationMs":420001/);
    assert.doesNotMatch(content, /secret|private message/);
});

test('90일 정리는 네트워크 일별 파일만 지우고 기존 머신 로그는 보존한다', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'model-network-retention-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    for (const name of ['2026-01-01_network.log', '2026-10-26_network.log', '2026-01-01_model.log', 'notes.txt']) {
        await fs.writeFile(path.join(directory, name), 'test');
    }
    await cleanup(directory, new Date(2026, 9, 26));
    assert.deepEqual((await fs.readdir(directory)).sort(), ['2026-01-01_model.log', '2026-10-26_network.log', 'notes.txt']);
});

test('설정 수집 실패와 로컬 API 오류도 진단 로그에 남고 결제나 재시작을 수행하지 않는다', async t => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'model-network-failure-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const monitor = createNetworkMonitor({ directory, apiBaseUrl: 'https://example.com',
        collectConfiguration: async () => { throw Object.assign(new Error('failure'), { code: 'CONFIG_FAIL' }); },
        probeDns: async () => ({ addresses: [] }),
        probeHttp: async url => ({ status: url.includes('127.0.0.1') ? 503 : 404 }),
    });
    await monitor.check();
    const content = await fs.readFile(path.join(directory, `${localDate(new Date())}_network.log`), 'utf8');
    assert.match(content, /CONFIG_FAIL/);
    assert.match(content, /"status":503/);
    assert.match(content, /異常|이상 감지/);
});
