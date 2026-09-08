const log = require('../../logger');
const { API_BASE_URL } = require('../../config/apiConfig');

const IMAGE_MANIFEST_TIMEOUT_MS = 15000;

async function getMachineImageManifest(userId) {
    if (!userId) {
        throw new Error('Image manifest API requires userId');
    }

    const url = new URL(`${API_BASE_URL}/model_admin_menu`);
    url.searchParams.set('func', 'get-machine-image-manifest');
    url.searchParams.set('userId', userId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), IMAGE_MANIFEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || `Image manifest API failed with HTTP ${response.status}`);
        }
        if (!Array.isArray(body.images)) {
            throw new Error('Image manifest API returned an invalid response');
        }
        return body.images;
    } catch (error) {
        const message = error.name === 'AbortError'
            ? `Image manifest API timed out after ${IMAGE_MANIFEST_TIMEOUT_MS}ms`
            : error.message;
        log.error(`[IMAGE API] ${message}`);
        throw new Error(message);
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = {
    getMachineImageManifest,
};
