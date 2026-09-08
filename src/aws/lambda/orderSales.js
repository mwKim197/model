const { API_BASE_URL, isDevelopment } = require('../../config/apiConfig');
const { getUser } = require('../../util/store');

const ORDER_SALES_URL = `${API_BASE_URL}/model_payment?func=save-machine-order`;
const REQUEST_TIMEOUT_MS = 15000;

async function saveOrderSales(payload) {
    const user = await getUser();
    if (!user?.userId || (!isDevelopment && !user?.machineToken)) {
        throw new Error('Machine authorization token is missing');
    }
    if (user.userId !== payload.userId) throw new Error('Machine token userId does not match order userId');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const headers = { 'Content-Type': 'application/json' };
        if (user.machineToken) headers.Authorization = `Bearer ${user.machineToken}`;
        const response = await fetch(ORDER_SALES_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.success !== true) {
            const error = new Error(body.message || `Order sales API failed: HTTP ${response.status}`);
            error.status = response.status;
            throw error;
        }
        return body;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { saveOrderSales };
