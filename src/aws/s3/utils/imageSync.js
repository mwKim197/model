const fs = require('fs');
const path = require('path');
const log = require('../../../logger');
const { getBasePath, ensureDirectoryExists } = require('./cacheDirManager');
const { getMachineImageManifest } = require('../../lambda/image');

const IMAGE_DOWNLOAD_TIMEOUT_MS = 30000;

async function syncMenuImagesFromApi(userId, cacheDirOverride = null) {
    const cacheDir = cacheDirOverride || getBasePath();
    ensureDirectoryExists(cacheDir);
    const images = await getMachineImageManifest(userId);
    let downloaded = 0;
    let cached = 0;

    for (const image of images) {
        const fileName = path.basename(String(image.fileName || ''));
        if (!fileName || fileName !== image.fileName || !image.url) continue;
        const localFilePath = path.join(cacheDir, fileName);
        const remoteModified = image.lastModified ? new Date(image.lastModified) : null;
        if (fs.existsSync(localFilePath)) {
            const stats = fs.statSync(localFilePath);
            if (stats.size === Number(image.size) && (!remoteModified || stats.mtime >= remoteModified)) {
                cached += 1;
                continue;
            }
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), IMAGE_DOWNLOAD_TIMEOUT_MS);
        try {
            const response = await fetch(image.url, { signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            fs.writeFileSync(localFilePath, Buffer.from(await response.arrayBuffer()));
            if (remoteModified && !Number.isNaN(remoteModified.getTime())) fs.utimesSync(localFilePath, new Date(), remoteModified);
            downloaded += 1;
        } finally {
            clearTimeout(timeout);
        }
    }

    log.info(`[IMAGE API] sync completed: downloaded=${downloaded}, cached=${cached}, total=${images.length}`);
    return { downloaded, cached, total: images.length };
}

module.exports = { syncMenuImagesFromApi };
