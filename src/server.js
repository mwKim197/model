const express = require('express');
const cors = require('cors');
const path = require('path');
const log = require('./logger');
const Connect = require('./serial/portProcesses/Connect');
const Order = require('./serial/portProcesses/Order');
const Ice = require('./serial/portProcesses/Ice');
const Cup = require('./serial/portProcesses/Cup');
const Menu = require('./aws/db/Menu');
const Excel = require('./aws/db/Excel');
const fs = require('fs');
const { createServer } = require('http');
const { serialCommCom1, serialCommCom3, serialCommCom4 } = require('./serial/serialCommManager');
const { getBasePath } = require('./aws/s3/utils/cacheDirManager');
const {checkForUpdatesManually} = require("./updater");
const app = express();
const server = createServer(app);
const { getMainWindow } = require('./windows/mainWindow');

const isDevelopment = (process.env.NODE_ENV || '').trim().toLowerCase() === 'development';
const appPath = isDevelopment ? path.resolve(process.cwd()) : process.resourcesPath;
const { app: electronApp } = require('electron');
const { ipcMain } = require('electron');

const {getUser} = require("./util/store");
const LOG_DIR = path.join(electronApp.getPath('appData'), 'model', 'logs');

const BARCODE_API_BASE = 'https://api.narrowroad-model.com/model_barcode_scan';

log.info(`NODE_ENV: "${process.env.NODE_ENV}"`); // 값 출력
log.info(`App Path: ${appPath}`);

let user;

const processUserAndProduct = async () => {
    // 사용자 정보 가져오기
    user = await getUser();

    if (user) {
        log.info('[STORE]User Info:', user);
    } else {
        log.error('[STORE]No user found in store.');

    }
}
processUserAndProduct().then();

// CORS 설정
app.use(cors({
    origin: [
        'http://localhost:5174',                         // 개발용
        'https://modelzero.kr',                          // 운영 사이트
        /^https:\/\/.*\.nw-api\.org$/,                   // Cloudflare Tunnel 도메인 (머신)
        /^http:\/\/.*\.narrowroad-model\.com:3142$/      // 포트 포워딩 도메인 (머신)
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());
app.use((req, res, next) => {
    req.serialCommCom1 = serialCommCom1;
    req.serialCommCom3 = serialCommCom3;
    req.serialCommCom4 = serialCommCom4;
    next();
});

// Static 파일 제공
app.use('/assets', express.static(path.join(appPath, 'app', 'src', 'assets')));
app.use('/renderer', express.static(path.join(appPath, 'app', 'src', 'renderer')));
app.use('/images', express.static(getBasePath()));

log.info('getBasePath()', getBasePath())
log.info('App Path:', appPath);

// Static 파일 제공
const rendererPath = path.join(appPath, 'src', 'renderer');
const assetsPath = path.join(appPath, 'src', 'assets');

if (fs.existsSync(rendererPath)) {
    console.log('Renderer Path Exists:', rendererPath);
    app.use('/renderer', express.static(rendererPath));
} else {
    console.error('Renderer Path Missing:', rendererPath);
}

if (fs.existsSync(assetsPath)) {
    console.log('Assets Path Exists:', assetsPath);
    app.use('/assets', express.static(assetsPath));
} else {
    console.error('Assets Path Missing:', assetsPath);
}

// 라우트
app.use(Connect);
app.use(Order);
app.use(Ice);
app.use(Cup);
app.use(Menu);
app.use(Excel);

app.get('/version', (req, res) => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
    res.json({ version: packageJson.version });
});

app.get('/status', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.post('/electon-update', (req, res) => {
    log.info("✅ API를 통해 프로그램 업데이트 실행");
    checkForUpdatesManually(); // Electron에서 업데이트 체크 실행
    res.json({ message: "업데이트 확인 요청됨" });
});

// 모든 로그 파일 목록 반환
app.get('/logs', (req, res) => {
    fs.readdir(LOG_DIR, (err, files) => {
        if (err) {
            log.error('❌ 로그 디렉토리 읽기 실패:', err);
            return res.status(500).json({ error: '로그 디렉토리 읽기 실패' });
        }
        res.json(files);
    });
});

// 특정 로그 파일 다운로드
app.get('/logs/:filename', (req, res) => {
    const fileName = req.params.filename;
    const filePath = path.join(LOG_DIR, fileName);

    if (!fs.existsSync(filePath)) {
        log.error(`❌ 요청한 로그 파일 없음: ${fileName}`);
        return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    res.download(filePath, (err) => {
        if (err) {
            log.error(`❌ 로그 파일 다운로드 실패: ${fileName}`, err);
            res.status(500).json({ error: '파일 다운로드 실패' });
        } else {
            log.info(`✅ 로그 파일 다운로드 완료: ${fileName}`);
        }
    });
});

////////////////////////원격화면조작//////////////////
// 메뉴 추가 API
app.post('/order/add-item', (req, res) => {
    const { menuName, qty } = req.body;
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
        win.webContents.send("order-add-item", { menuName, qty });
        return res.json({ success: true, action: "add-item", menuName, qty });
    }
    res.status(500).json({ success: false, error: "mainWindow 없음" });
});

// 결제 시작 API
app.post('/order/start-payment', (req, res) => {
    const win = getMainWindow();
    if (win && !win.isDestroyed()) {
        win.webContents.send("order-start-payment", {});
        return res.json({ success: true, action: "start-payment" });
    }
    res.status(500).json({ success: false, error: "mainWindow 없음" });
});
////////////////////////원격화면조작//////////////////


let mainWindow; // main에서 주입받도록 설계

function setMainWindow(win) {
    mainWindow = win;
}

// ✅ 렌더러에서 코드 실행 도우미 (타임아웃 포함)
function execInRenderer(jsCode, { timeout = 15000 } = {}) {
    if (!mainWindow || mainWindow.webContents.isDestroyed()) {
        return Promise.reject(new Error('mainWindow가 준비되지 않았습니다.'));
    }
    return Promise.race([
        mainWindow.webContents.executeJavaScript(jsCode, true),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Renderer 응답 타임아웃')), timeout)
        ),
    ]);
}

// 심코드 바코드 스캔 API
app.post('/call-barcode', async (req, res) => {
    try {
        const window = getMainWindow(); // BrowserWindow 객체 가져오기
        if (!window) return res.status(500).send("화면이 실행되지않았습니다.");

        // 렌더러에 스캔 요청
        window.webContents.send("order-barcode-scan");

        // 렌더러에서 "barcode-scanned" 이벤트를 기다림
        const barcode = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Timeout")), 20000);

            ipcMain.once("barcode-scanned", (_, data) => {
                clearTimeout(timeout);
                resolve(data.barcode);
            });
        });

        console.log("✅ 스캔 결과:", barcode);

        // 3️⃣ Lambda 호출
        const saveUrl = `${BARCODE_API_BASE}?func=barcode-save`;
        const resp = await fetch(saveUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user, code: barcode })
        });

        const data = await resp.json();
        return res.json({ success: true, barcode, savedAt: data?.scanAt ?? null });

    } catch (e) {
        console.error("❌ 바코드 처리 오류:", e);
        return res.status(500).json({ success: false, message: e.message });
    }
});

// NVCAT 바코드 스캔 API
/*app.post('/call-barcode', async (req, res) => {
    try {
        // 1) 바코드 스캔 (렌더러에서 대기 -> 결과 반환)
        const result = await execInRenderer(`(async () => {
      return await window.electronAPI.reqBarcodeHTTP();
    })()`, { timeout: 20000 });

        if (!result || !result.barcode) {
            // 사용자 취소/미입력 등
            return res.status(204).send();
        }

        const { barcode } = result;  // ⬅️ 여기서 꺼내기

        // 2) userId 확보 (요청 바디 > 로컬 스토어)
        let { userId } = req.body || {};
        if (!userId && typeof getUser === 'function') {
            try {
                const localUser = await getUser(); // 구현에 따라 sync/async
                userId = localUser?.userId;
            } catch (_) {}
        }
        if (!userId) {
            return res.status(400).json({ success: false, message: 'userId가 필요합니다.' });
        }

        // 3) Lambda 저장 호출 (POST ?func=barcode-save)
        const saveUrl = `${BARCODE_API_BASE}?func=barcode-save`;
        const resp = await fetch(saveUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, code: barcode })
        }).catch((e) => {
            throw e;
        })

        if (!resp.ok) {
            const text = await resp.text().catch(() => '');
            return res.status(502).json({ success: false, message: `Lambda ${resp.status}`, detail: text });
        }

        const data = await resp.json();
        return res.json({ success: true, barcode, savedAt: data?.scanAt ?? null });

    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});*/

// Keep-Alive 설정 추가
server.keepAliveTimeout = 300000; // 5분
server.headersTimeout = 310000;  // Keep-Alive 타임아웃보다 약간 길게 설정

// 서버 시작 함수
async function start() {
    server.listen(3142, '0.0.0.0', () => {
        log.info('Server running on http://localhost:3142');
    });
}

module.exports = { start, setMainWindow };
