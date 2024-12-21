const fs = require('fs');
const path = require('path');
const log = require('../../../logger'); // 로그 모듈 사용

// 절대 경로 설정
const absoluteCacheDir = path.resolve('C:/model/images');

// 디렉토리 확인 및 생성 함수
const ensureDirectoryExists = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        log.info(`디렉토리 생성됨: ${dir}`);
    }
};

// 절대 경로 보장
const getBasePath = () => {
    ensureDirectoryExists(absoluteCacheDir);
    return absoluteCacheDir;
};

module.exports = {
    getBasePath,
    ensureDirectoryExists,
};