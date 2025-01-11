const express = require('express');
const cors = require('cors');
const path = require('path');
const log = require('./logger');
const Connect = require('./serial/portProcesses/Connect');
const Order = require('./serial/portProcesses/Order');
const Ice = require('./serial/portProcesses/Ice');
const Cup = require('./serial/portProcesses/Cup');
const Menu = require('./aws/db/Menu');
const fs = require('fs');
const { createServer } = require('http');
const { serialCommCom1, serialCommCom3, serialCommCom4 } = require('./serial/serialCommManager');
const { getBasePath } = require('./aws/s3/utils/cacheDirManager');
const app = express();
const server = createServer(app);

const isDevelopment = (process.env.NODE_ENV || '').trim().toLowerCase() === 'development';
const appPath = isDevelopment ? path.resolve(process.cwd()) : process.resourcesPath;
log.info(`NODE_ENV: "${process.env.NODE_ENV}"`); // 값 출력
log.info(`App Path: ${appPath}`);

// CORS 설정
app.use(cors({
    origin: ['http://localhost:3142', /^http:\/\/.*\.narrowroad-model\.com:3142$/],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
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

app.get('/version', (req, res) => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
    res.json({ version: packageJson.version });
});

app.get('/status', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
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
