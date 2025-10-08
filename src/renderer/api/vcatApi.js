// renderer/api/vcatFlow.js
const { SmTCatAgentClient } = require('../../vcat/vcat');

// ----- compat 응답 -> 맵/분류 -----
function toMapFromCompat(res) {
    const arr = (res && res.message && res.message.parsedData) || [];
    return arr.reduce((acc, cur) => { acc[cur.name] = cur.value != null ? String(cur.value) : ''; return acc; }, {});
}
function classifyCompatResponse(res) {
    const m = toMapFromCompat(res);
    const respCode = m['응답코드'];
    const msg = m['응답메시지'] || '';
    const digits = msg.replace(/\D/g, '');
    if (respCode === '00') {
        return { phase: 'APPROVED', payload: { approvalNo: m['승인번호']||'', approvedAt: m['승인일시']||'', amount: m['실승인금액']||m['거래금액']||'' } };
    }
    if (digits.length >= 6) return { phase: 'BARCODE_DETECTED', payload: { barcode: digits } };
    return { phase: 'PENDING_INPUT', payload: {} };
}

// ----- 모드별 바코드 검증/중복 차단 -----
function validateBarcodeByMode(barcode, mode) {
    if (!barcode) return false;
    if (mode === 'APP_CARD') return /^\d{13,24}$/.test(barcode); // 필요시 21자리 고정
    if (mode === 'COUPON')   return /^CPN-[A-Z0-9]{6,}$/.test(barcode) || /^\d{8,20}$/.test(barcode);
    return false;
}
const barcodeSeen = new Map();
function isDuplicateBarcode(barcode, msWindow = 3000) {
    const now = Date.now(), prev = barcodeSeen.get(barcode) || 0;
    barcodeSeen.set(barcode, now);
    return now - prev < msWindow;
}

// ----- 후속 처리(앱카드 승인 / 쿠폰 사용) 기본 구현 -----
// 필요하면 외부 콜백으로 갈아끼울 수 있도록 옵션화
async function defaultApproveAppCardWithBarcode({ amount, barcode, orderId }) {
    const resp = await fetch('http://127.0.0.1:13855/barcode-approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ func: 'REQ_BARCODE_APPROVE', amount, barcode, orderId, installment: '00' }),
    });
    const data = await resp.json();
    return (data && data.respCode === '00')
        ? { ok: true, type: 'BARCODE_CARD', approvalNo: data.approvalNo, approvedAt: data.approvedAt, raw: data }
        : { ok: false, reason: (data && data.message) || 'BARCODE_CARD_FAIL', raw: data };
}
async function defaultRedeemCouponWithBarcode({ barcode, orderId, userId, storeId, couponApiBase }) {
    const resp = await fetch(`${couponApiBase}/coupon/redeem`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, orderId, userId, storeId }),
    });
    const data = await resp.json();
    return (data && data.success === true)
        ? { ok: true, type: 'COUPON', couponId: data.couponId, discount: data.discount, raw: data }
        : { ok: false, reason: (data && data.message) || 'COUPON_REDEEM_FAIL', raw: data };
}

// ----- 서비스 팩토리 -----
function createVcatService({
                               wsUrl = 'ws://127.0.0.1:13855',
                               channel = 'SMTCatAgent_WEB_SAMPLE',
                               keyType = 'VNUMBER',
                               returnShape = 'compat',
                               logger = console,

                           } = {}) {
    const client = new SmTCatAgentClient({ wsUrl, channel, keyType, returnShape, logger });

    // 기존과 동일한 시그니처(호환)
    async function reqVcatWebSocket(price) {
        return client.tradeCreditApprove({ amount: String(price), tax: '0', installment: '00', sign: '3' });
    }

    // 새 플로우
    async function runVcatFlow({ mode = 'APP_CARD', price, orderId, userId, storeId }) {
        const compatRes = await reqVcatWebSocket(price);
        const { phase, payload } = classifyCompatResponse(compatRes);

        if (phase === 'APPROVED') return { ok: true, type: 'CARD', ...payload };

        if (phase === 'BARCODE_DETECTED') {
            const barcode = payload.barcode;

            if (!validateBarcodeByMode(barcode, mode)) return { ok: false, reason: 'INVALID_BARCODE_FORMAT', barcode, mode };
            if (isDuplicateBarcode(barcode))        return { ok: false, reason: 'DUPLICATE_BARCODE', barcode, mode };

            if (mode === 'APP_CARD') {
                if (!price) return { ok: false, reason: 'AMOUNT_REQUIRED' };
                return await approveAppCardWithBarcode({ amount: price, barcode, orderId });
            }
            if (mode === 'COUPON') {
                return await redeemCouponWithBarcode({ barcode, orderId, userId, storeId, couponApiBase });
            }
            return { ok: false, reason: 'UNKNOWN_MODE' };
        }

        return { ok: false, reason: 'PENDING_INPUT' };
    }

    return { client, reqVcatWebSocket, runVcatFlow };
}

module.exports = { createVcatService };
