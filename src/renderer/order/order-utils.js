(function exposeOrderUtils(root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.OrderUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createOrderUtils() {
    function calculateTotalPayment(orderList = []) {
        return orderList.reduce((total, order) => {
            const used = Number(order.couponUsed) || 0;
            const count = Number(order.count) || 0;
            const price = Number(order.price) || 0;
            const payCount = Math.max(0, count - used);

            return total + payCount * price;
        }, 0);
    }

    function calculateOrderTotals(orderList = []) {
        let totalAmount = 0;
        let couponDiscount = 0;

        const couponLines = orderList.map(order => {
            const price = Number(order.price) || 0;
            const count = Number(order.count) || 0;
            const used = Number(order.couponUsed) || 0;
            const itemTotal = price * count;
            const discount = price * Math.min(count, used);
            const finalPay = itemTotal - discount;

            totalAmount += itemTotal;
            couponDiscount += discount;

            return {
                name: order.name,
                count,
                couponUsed: used,
                price,
                discount,
                finalPay,
            };
        });

        return {
            totalAmount,
            couponDiscount,
            couponLines,
        };
    }

    function collectUsedCoupons(orderList = []) {
        const couponsById = new Map();

        for (const order of orderList) {
            const { usedCoupons = [], orderId, menuId } = order;

            for (const coupon of usedCoupons) {
                if (!coupon?.couponId || couponsById.has(coupon.couponId)) {
                    continue;
                }

                couponsById.set(coupon.couponId, {
                    couponId: coupon.couponId,
                    couponCode: coupon.couponCode,
                    orderId,
                    menuId,
                });
            }
        }

        return Array.from(couponsById.values());
    }

    function getMileageUsed(paymentSession) {
        return Number(paymentSession?.usePoint?.usedAmount) || 0;
    }

    function calcOrderTotal(orderList = []) {
        return orderList.reduce((total, order) => {
            const price = Number(order.price) || 0;
            const count = Number(order.count) || 0;

            return total + price * count;
        }, 0);
    }

    function normalizeName(value) {
        return String(value || "")
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/[\(\)\[\]\{\}]/g, "")
            .replace(/[^\w가-힣]/g, "");
    }

    function nameScore(productName, query) {
        const normalizedName = normalizeName(productName);

        if (normalizedName === query) return 100;
        if (normalizedName.startsWith(query)) return 80;
        if (normalizedName.includes(query)) return 60;
        return 0;
    }

    function findProductByName(products = [], name) {
        const query = normalizeName(name);
        if (!query) return null;

        const candidates = products
            .filter(product => product && product.name)
            .map(product => ({ product, score: nameScore(product.name, query) }))
            .filter(candidate => candidate.score > 0)
            .sort((a, b) =>
                (b.score - a.score)
                || ((a.product.empty === "yes") - (b.product.empty === "yes"))
            );

        return candidates.length ? candidates[0].product : null;
    }

    return {
        calculateTotalPayment,
        calculateOrderTotals,
        collectUsedCoupons,
        getMileageUsed,
        calcOrderTotal,
        normalizeName,
        nameScore,
        findProductByName,
    };
});
