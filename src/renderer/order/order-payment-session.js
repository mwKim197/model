(function exposeOrderPaymentSession(root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.OrderPaymentSession = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createOrderPaymentSessionApi() {
    function createPaymentSessionManager(dependencies) {
        const {
            getOrderList,
            setOrderList,
            calculateOrderTotals,
            collectUsedCoupons,
            getMileageUsed,
            addMileage,
            useMileage,
            rollbackMileage,
            useCouponApi,
            sendLogToMain,
        } = dependencies;

        const paymentSession = {
            orderId: null,
            orderAmount: 0,
            totalDiscount: 0,
            paidAmount: 0,
            usePoint: null,
            earnPoint: null,
            totalPayInfo: [],
            couponItems: [],
            couponMenuIds: [],
            couponTotal: 0,

            reset() {
                this.orderId = null;
                this.orderAmount = 0;
                this.totalDiscount = 0;
                this.paidAmount = 0;
                this.usePoint = null;
                this.earnPoint = null;
                this.totalPayInfo = [];
                this.couponItems = [];
                this.couponMenuIds = [];
                this.couponTotal = 0;
            },
        };

        function startPaymentSession(orderId, orderAmount) {
            paymentSession.reset();
            paymentSession.orderId = orderId;
            paymentSession.orderAmount = Number(orderAmount) || 0;

            const orderList = getOrderList();
            setOrderList(orderList.map(order => {
                const { couponUsed, usedCoupons, ...rest } = order;
                return rest;
            }));
        }

        function applyCouponFromOrders(orderList) {
            const { totalAmount, couponDiscount, couponLines } = calculateOrderTotals(orderList);
            paymentSession.orderAmount = totalAmount;
            paymentSession.couponItems = couponLines.filter(coupon => coupon.discount > 0);
            paymentSession.couponTotal = couponDiscount;

            const mileageUsed = getMileageUsed(paymentSession);
            paymentSession.totalDiscount = couponDiscount + mileageUsed;

            sendLogToMain("info", `쿠폰 할인 ${couponDiscount}원 적용 (총 주문금액 ${totalAmount}원)`);

            if (!Array.isArray(paymentSession.totalPayInfo)) {
                paymentSession.totalPayInfo = [];
            }

            const seenCoupons = new Set(
                paymentSession.totalPayInfo.flatMap(payInfo =>
                    payInfo.coupons?.map(coupon => coupon.couponId) || []
                )
            );

            orderList.forEach(order => {
                order.usedCoupons?.forEach(coupon => {
                    if (seenCoupons.has(coupon.couponId)) return;
                    seenCoupons.add(coupon.couponId);

                    paymentSession.totalPayInfo.push({
                        method: "쿠폰",
                        items: [
                            {
                                name: order.name,
                                discount: order.price,
                            },
                        ],
                        coupons: [
                            {
                                couponId: coupon.couponId,
                                couponCode: coupon.couponCode,
                                orderId: order.orderId,
                                name: order.name,
                                userId: order.userId,
                                menuId: order.menuId,
                                price: order.price,
                            },
                        ],
                    });
                });
            });
        }

        function accumulatePointUsage(response) {
            if (!response?.success || response.action !== "usePoints") return;

            const used = Number(response.discountAmount) || 0;
            const mileageNo = response.pointData?.mileageNo;
            if (!mileageNo) return;

            if (paymentSession.usePoint) {
                console.warn(
                    `기존 포인트 세션 갱신: ${paymentSession.usePoint.pointData?.mileageNo} -> ${mileageNo}`
                );
            }

            paymentSession.totalDiscount = used;
            paymentSession.usePoint = {
                uniqueMileageNo: response.pointData?.uniqueMileageNo ?? response.point,
                usedAmount: used,
                pointData: response.pointData ?? null,
            };

            console.log(`[포인트 사용 세션 등록 완료] mileageNo=${mileageNo}, amount=${used}`);
        }

        async function commitPointUsage() {
            console.log("paymentSession: ", JSON.stringify(paymentSession, null, 2));
            if (!paymentSession.usePoint) {
                return { success: true, committed: 0 };
            }

            const usage = paymentSession.usePoint;
            const mileageNo = usage.uniqueMileageNo;
            const totalAmount = usage.pointData?.totalAmt || 0;
            const usedAmount = usage.usedAmount;

            try {
                const result = await useMileage(mileageNo, totalAmount, usedAmount);
                console.log(`[포인트 커밋 완료] mileageNo=${mileageNo}, amount=${usedAmount}`);
                return { success: true, committed: 1, res: result };
            } catch (error) {
                console.error(`[포인트 커밋 실패] mileageNo=${mileageNo}`, error);
                throw new Error(`포인트 커밋 실패: ${error.message}`);
            }
        }

        function accumulateEarnPoint(data) {
            if (!data?.success || data.action !== "immediatePayment") return;

            const uniqueMileageNo = data.point;

            if (paymentSession.earnPoint) {
                console.warn(
                    `기존 적립 세션 갱신: ${paymentSession.earnPoint.uniqueMileageNo} -> ${uniqueMileageNo}`
                );
            }

            paymentSession.earnPoint = {
                uniqueMileageNo,
                createdAt: Date.now(),
            };

            console.log(`[적립 세션 저장 완료] mileageNo=${uniqueMileageNo}`);
        }

        async function handleMileageEarn(orderAmount, userInfo) {
            if (!paymentSession.earnPoint) {
                console.log("적립 세션 없음 - 마일리지 적립 스킵");
                return;
            }

            const { uniqueMileageNo } = paymentSession.earnPoint;
            const earnRate = userInfo?.earnMileage || 0;

            try {
                sendLogToMain(
                    "info",
                    `마일리지 적립 실행 - 번호: ${uniqueMileageNo}, 금액: ${orderAmount}, 적립률: ${earnRate}%`
                );

                const result = await addMileage(uniqueMileageNo, orderAmount, earnRate);

                console.log("마일리지 적립 완료:", result);
                sendLogToMain("info", `마일리지 적립 완료: ${uniqueMileageNo}`);
            } catch (error) {
                console.error("마일리지 적립 실패:", error);
                sendLogToMain("error", `마일리지 적립 실패: ${error.message}`);
            }
        }

        async function handleUseCoupons(orderList) {
            const coupons = collectUsedCoupons(orderList);
            if (coupons.length === 0) {
                sendLogToMain("error", "사용할 쿠폰이 없습니다.");
                return;
            }

            const result = await useCouponApi(coupons);
            sendLogToMain(result.ok ? "info" : "error", `${result.message}`);
        }

        function resetMileageUsage() {
            const couponDiscount = paymentSession.couponTotal || 0;

            paymentSession.usePoint = null;
            paymentSession.totalDiscount = couponDiscount;
            console.log("마일리지 사용 초기화 - 쿠폰 할인만 유지");
        }

        async function rollbackPointUsage(reason = "ORDER_FAIL") {
            if (!paymentSession.usePoint) {
                return { success: true, rolledBack: 0 };
            }

            const usage = paymentSession.usePoint;
            const mileageNo = usage.pointData?.mileageNo || usage.point || usage.uniqueMileageNo;
            const usedAmount = Number(usage.usedAmount) || 0;
            const totalAmount = usage.pointData?.totalAmt || 0;

            try {
                const result = await rollbackMileage(mileageNo, usedAmount, totalAmount, reason);
                console.log(`[포인트 롤백 완료] mileageNo=${mileageNo}, amount=${usedAmount}`);
                return { success: true, rolledBack: 1, res: result };
            } catch (error) {
                console.error(`[포인트 롤백 실패] mileageNo=${mileageNo}`, error);
                throw new Error(`포인트 롤백 실패: ${error.message}`);
            }
        }

        return {
            paymentSession,
            startPaymentSession,
            applyCouponFromOrders,
            accumulatePointUsage,
            commitPointUsage,
            accumulateEarnPoint,
            handleMileageEarn,
            handleUseCoupons,
            resetMileageUsage,
            rollbackPointUsage,
        };
    }

    return {
        createPaymentSessionManager,
    };
});
