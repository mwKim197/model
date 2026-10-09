const fs = require('fs');
const path = require('path');
const log = require('../../logger');
const { API_BASE_URL, isDevelopment } = require('../../config/apiConfig');
const { getUser } = require('../../util/store');
const { getBasePath, ensureDirectoryExists } = require('../s3/utils/cacheDirManager');

const NOTICE_API = `${API_BASE_URL}/model_admin_menu`;
const REQUEST_TIMEOUT_MS = 15000;
const DOWNLOAD_TIMEOUT_MS = 30000;

async function requestNoticeApi(func, params = {}) {
    const user = await getUser();
    if (!user?.userId || (!isDevelopment && !user?.machineToken)) throw new Error('머신 로그인이 필요합니다.');

    const url = new URL(NOTICE_API);
    url.searchParams.set('func', func);
    Object.entries(params).forEach(([key, value]) => {
        if (value != null && value !== '') url.searchParams.set(key, value);
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const headers = { Accept: 'application/json' };
        if (user.machineToken) headers.Authorization = `Bearer ${user.machineToken}`;
        const response = await fetch(url, {
            headers,
            signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || `공지 API 오류: HTTP ${response.status}`);
        return body;
    } finally {
        clearTimeout(timeout);
    }
}

async function cacheNoticeImage(notice) {
    if (!notice?.imageUrl || !notice?.imageFileName) return notice;
    const fileName = path.basename(String(notice.imageFileName));
    if (!fileName || fileName !== notice.imageFileName) return notice;

    const cacheDir = getBasePath();
    ensureDirectoryExists(cacheDir);
    const localPath = path.join(cacheDir, fileName);
    const remoteModified = notice.imageLastModified ? new Date(notice.imageLastModified) : null;
    if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        if (stats.size === Number(notice.imageSize) && (!remoteModified || stats.mtime >= remoteModified)) {
            return { ...notice, image: localPath };
        }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    try {
        const response = await fetch(notice.imageUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`공지 이미지 다운로드 실패: HTTP ${response.status}`);
        fs.writeFileSync(localPath, Buffer.from(await response.arrayBuffer()));
        if (remoteModified && !Number.isNaN(remoteModified.getTime())) fs.utimesSync(localPath, new Date(), remoteModified);
        return { ...notice, image: localPath };
    } finally {
        clearTimeout(timeout);
    }
}

async function getMachineNotices(startDate, endDate) {
    const body = await requestNoticeApi('get-machine-notices', { startDate, endDate });
    const notices = Array.isArray(body.notices) ? body.notices : [];
    const cached = [];
    for (const notice of notices) {
        try { cached.push(await cacheNoticeImage(notice)); }
        catch (error) { log.warn(`[NOTICE API] ${notice.noticeId} image cache failed: ${error.message}`); cached.push(notice); }
    }
    return cached;
}

async function getMachineNotice(noticeId) {
    const body = await requestNoticeApi('get-machine-notice', { noticeId });
    return cacheNoticeImage(body.notice);
}

module.exports = { getMachineNotices, getMachineNotice };
