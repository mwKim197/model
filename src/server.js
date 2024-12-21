const express = require('express');
const cors = require('cors');
const path = require('path');
const log = require('./logger');
const Connect = require('./serial/portProcesses/Connect');
const Order = require('./serial/portProcesses/Order');
const Ice = require('./serial/portProcesses/Ice');
const Cup = require('./serial/portProcesses/Cup');
const Menu = require('./aws/db/Menu');
const Image = require('./aws/s3/Image');
const fs = require('fs');
const { createServer } = require('http');
const { serialCommCom1, serialCommCom3, serialCommCom4 } = require('./serial/serialCommManager');

const app = express();
const server = createServer(app);

// CORS 설정
app.use(cors({
    origin: ['http://localhost:3000', /^http:\/\/.*\.narrowroad-model\.com:3000$/],
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
app.use('/assets', express.static(path.resolve(__dirname, 'assets')));
app.use('/renderer', express.static(path.join(__dirname, 'renderer')));

// 라우트
app.use(Connect);
app.use(Order);
app.use(Ice);
app.use(Cup);
app.use(Menu);
app.use(Image);

app.get('/version', (req, res) => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
    res.json({ version: packageJson.version });
});

// 서버 시작 함수
async function start() {
    server.listen(3000, '0.0.0.0', () => {
        log.info('Server running on http://localhost:3000');
    });
}

module.exports = { start };
