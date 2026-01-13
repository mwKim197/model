const log = require("../../logger");

const INVENTORY_CALC_URL =
    "https://api.narrowroad-model.com/model_inventory_calculate?func=calculate-inventory";

/**
 * 머신1용: 재고 계산 요청 (비차단)
 * - 계산은 Lambda가 주권
 * - 실패해도 주문 영향 없음
 */
async function requestInventoryCalculation({ userId, orderList }) {
    if (!userId || !Array.isArray(orderList) || orderList.length === 0) {
        log.warn("[inventory] 파라미터 부족으로 계산 요청 스킵");
        return;
    }

    try {
        fetch(INVENTORY_CALC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, orderList })
        });
    } catch (e) {
        log.warn("[inventory] 계산 요청 실패 (머신1 영향 없음)", e.message);
    }
}

module.exports = {
    requestInventoryCalculation
};
