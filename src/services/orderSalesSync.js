const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const log = require('../logger');
const { saveOrderSales } = require('../aws/lambda/orderSales');

const RETRY_INTERVAL_MS = 60 * 1000;
let flushPromise = null;
let retryTimer = null;

function getQueuePath() {
    return path.join(app.getPath('userData'), 'pending-order-sales.json');
}

function readQueue() {
    const queuePath = getQueuePath();
    if (!fs.existsSync(queuePath)) return [];
    try {
        const parsed = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        log.error(`[ORDER SALES] failed to read retry queue: ${error.message}`);
        return [];
    }
}

function writeQueue(queue) {
    const queuePath = getQueuePath();
    fs.mkdirSync(path.dirname(queuePath), { recursive: true });
    const temporaryPath = `${queuePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(queue, null, 2), 'utf8');
    fs.renameSync(temporaryPath, queuePath);
}

function createOrderPayload(order) {
    const orderList = Array.isArray(order?.orderList) ? order.orderList : [];
    const userId = orderList[0]?.userId;
    if (!userId || orderList.length === 0) throw new Error('Order sales payload has no userId or items');

    const timestamp = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString();
    const compactTimestamp = timestamp.slice(0, 23).replace(/[-T:.]/g, '');
    const orderId = `${compactTimestamp}-${userId}-${crypto.randomUUID().slice(0, 8)}`;
    return {
        userId,
        orderId,
        timestamp,
        orderList,
        point: order.point,
        payInfo: order.payInfo,
        pointData: order.pointData,
        totalPayInfo: order.totalPayInfo,
    };
}

function enqueue(payload) {
    const queue = readQueue();
    if (!queue.some(item => item.orderId === payload.orderId)) {
        queue.push(payload);
        writeQueue(queue);
    }
}

async function flushOrderSalesQueue() {
    if (flushPromise) return flushPromise;
    flushPromise = (async () => {
        const queue = readQueue();
        if (queue.length === 0) return { sent: 0, pending: 0 };

        const pending = [];
        let sent = 0;
        for (const payload of queue) {
            try {
                await saveOrderSales(payload);
                sent += 1;
            } catch (error) {
                pending.push(payload);
                log.warn(`[ORDER SALES] retry pending ${payload.orderId}: ${error.message}`);
            }
        }
        writeQueue(pending);
        log.info(`[ORDER SALES] retry completed: sent=${sent}, pending=${pending.length}`);
        return { sent, pending: pending.length };
    })().finally(() => {
        flushPromise = null;
    });
    return flushPromise;
}

async function saveOrderSalesWithQueue(order) {
    const payload = createOrderPayload(order);
    try {
        const result = await saveOrderSales(payload);
        log.info(`[ORDER SALES] saved ${payload.orderId}, duplicate=${result.duplicate === true}`);
        return { ...result, queued: false };
    } catch (error) {
        enqueue(payload);
        log.warn(`[ORDER SALES] queued ${payload.orderId}: ${error.message}`);
        return { success: true, queued: true, orderId: payload.orderId };
    }
}

function startOrderSalesRetryWorker() {
    if (retryTimer) return;
    flushOrderSalesQueue().catch(error => log.warn(`[ORDER SALES] startup retry failed: ${error.message}`));
    retryTimer = setInterval(() => {
        flushOrderSalesQueue().catch(error => log.warn(`[ORDER SALES] scheduled retry failed: ${error.message}`));
    }, RETRY_INTERVAL_MS);
    retryTimer.unref?.();
}

function stopOrderSalesRetryWorker() {
    if (retryTimer) clearInterval(retryTimer);
    retryTimer = null;
}

module.exports = {
    createOrderPayload,
    flushOrderSalesQueue,
    saveOrderSalesWithQueue,
    startOrderSalesRetryWorker,
    stopOrderSalesRetryWorker,
};
