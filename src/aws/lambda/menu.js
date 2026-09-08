const log = require('../../logger');
const { API_BASE_URL } = require('../../config/apiConfig');

const MENU_REQUEST_TIMEOUT_MS = 10000;

async function getAllMenusForMachine(userId) {
    if (!userId) {
        throw new Error('Menu API requires userId');
    }

    const url = new URL(`${API_BASE_URL}/model_admin_menu`);
    url.searchParams.set('func', 'get-all-menu-machine');
    url.searchParams.set('userId', userId);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MENU_REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: controller.signal,
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(body.message || `Menu API failed with HTTP ${response.status}`);
        }
        if (!Array.isArray(body.items)) {
            throw new Error('Menu API returned an invalid response');
        }

        return { Items: body.items };
    } catch (error) {
        const message = error.name === 'AbortError'
            ? `Menu API timed out after ${MENU_REQUEST_TIMEOUT_MS}ms`
            : error.message;
        log.error(`[MENU API] ${message}`);
        throw new Error(message);
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = {
    getAllMenusForMachine,
};
