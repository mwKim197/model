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

const isDevelopment = (process.env.NODE_ENV || '').trim().toLowerCase() === 'development';
const appPath = isDevelopment ? path.resolve(process.cwd()) : process.resourcesPath;

const { app: electronApp } = require('electron');
const LOG_DIR = path.join(electronApp.getPath('appData'), 'model', 'logs');

log.info(`NODE_ENV: "${process.env.NODE_ENV}"`); // 값 출력
log.info(`App Path: ${appPath}`);

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

// Keep-Alive 설정 추가
server.keepAliveTimeout = 300000; // 5분
server.headersTimeout = 310000;  // Keep-Alive 타임아웃보다 약간 길게 설정

// 서버 시작 함수
async function start() {
    server.listen(3142, '0.0.0.0', () => {
        log.info('Server running on http://localhost:3142');
    });
}

module.exports = { start };
