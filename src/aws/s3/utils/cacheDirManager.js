const fs = require('fs');
const path = require('path');
const os = require('os');
const log = require('../../../logger'); // 로그 모듈 사용

// Helper: ensure dir exists
const ensureDirectoryExists = (dir) => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log.info(`디렉토리 생성됨: ${dir}`);
        }
    } catch (e) {
        log.error('ensureDirectoryExists failed', e);
    }
};

// Determine sensible default cache directory depending on platform
const getBasePath = () => {
    try {
        const projectCache = path.join(process.cwd(), 'out', 's3cache');
        const windowsDefault = path.resolve('C:\model\images');
        // Prefer Windows-style path only on Windows
        const chosen = (process.platform === 'win32') ? windowsDefault : projectCache;
        ensureDirectoryExists(chosen);
        return chosen;
    } catch (e) {
        log.error('getBasePath error, falling back to process.cwd()', e);
        const fallback = path.join(process.cwd(), 'out', 's3cache');
        ensureDirectoryExists(fallback);
        return fallback;
    }
};

module.exports = {
    getBasePath,
    ensureDirectoryExists,
};
