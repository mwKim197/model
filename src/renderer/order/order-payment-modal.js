(function exposeOrderPaymentModal(root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.OrderPaymentModal = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createOrderPaymentModalApi() {
    function createPaymentModalController(dependencies) {
        const {
            getOrderList,
            getUserInfo,
            getGlobalDim,
            setRemainingSeconds,
            paymentSession,
            calculateOrderTotals,
            calcOrderTotal,
            getMileageUsed,
            accumulatePointUsage,
            commitPointUsage,
            accumulateEarnPoint,
            handleMileageEarn,
            handleUseCoupons,
            resetMileageUsage,
            rollbackPointUsage,
            applyCouponFromOrders,
            clearCountdown,
            resetCountdown,
            sendLogToMain,
            openAlertModal,
            closeAlertModal,
            playAudio,
            cardPayment,
            barcodePayment,
            pointPayment,
            showCouponModal,
            isCouponApplied,
            ordStart,
        } = dependencies;

        const KRW = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" });
        const asWon = value => KRW.format(Math.max(0, Math.round(Number(value) || 0)));

        async function totalPayment(data) {
            clearCountdown();
            setRemainingSeconds(99);

            const orderList = getOrderList();
            const userInfo = getUserInfo();
            let response;

            const { totalAmount } = calculateOrderTotals(orderList);
            const couponDiscount = Number(paymentSession.couponTotal) || 0;
            paymentSession.orderAmount = Math.max(0, totalAmount - couponDiscount);

            if (data?.action === "usePoints") {
                accumulatePointUsage(data);
            } else if (data?.action === "immediatePayment") {
                accumulateEarnPoint(data);
            }

            const mileageUsed = getMileageUsed(paymentSession);
            const baseAmount = paymentSession.orderAmount;
            const alreadyPaid = paymentSession.paidAmount || 0;
            const orderAmount = Math.max(0, baseAmount - mileageUsed - alreadyPaid);

            if (orderAmount <= 0) {
                try {
                    await commitPointUsage();
                } catch (error) {
                    sendLogToMain("error", `포인트 커밋 실패: ${error.message}`);
                    openAlertModal("포인트 사용 처리에 실패했습니다. 관리자에게 문의해 주세요.");
                    return;
                }

                try {
                    await handleUseCoupons(orderList);
                    await ordStart(mileageUsed, null, data, paymentSession.totalPayInfo);
                } catch (error) {
                    try {
                        await rollbackPointUsage("ORDER_FAIL");
                    } catch (rollbackError) {
                        sendLogToMain("error", `포인트 롤백 실패: ${rollbackError.message}`);
                    }
                    throw error;
                }

                paymentSession.reset();
                return;
            }

            const modal = document.getElementById("totalPayModel");
            modal.classList.remove("hidden");

            playAudio("../../assets/audio/결제 방식을 선택 해주세요.m4a");
            renderTotalPayContent(modal, orderList, paymentSession);

            const payCard = document.getElementById("payCard");
            const payBarcode = document.getElementById("payBarcode");
            const payPoint = document.getElementById("payPoint");
            const payCoupon = document.getElementById("payCoupon");

            payBarcode.classList.toggle("hidden", userInfo?.barcode === false);
            payPoint.classList.toggle(
                "hidden",
                userInfo.payType === true || paymentSession.earnPoint !== null
            );
            payCoupon.classList.toggle(
                "hidden",
                userInfo.coupon === true
                    || paymentSession.earnPoint !== null
                    || paymentSession.usePoint !== null
            );

            payCard.onclick = payBarcode.onclick = payPoint.onclick = payCoupon.onclick = null;

            const closeBtn = document.getElementById("totalPayCloseModalBtn");
            closeBtn.onclick = () => {
                modal.classList.add("hidden");
                resetCountdown();
                getGlobalDim().classList.add("hidden");
            };

            payCard.onclick = async () => {
                modal.classList.add("hidden");
                sendLogToMain("info", "카드 결제 시작");

                const payEnd = await cardPayment(orderAmount, 0);

                if (!payEnd.success) {
                    sendLogToMain("error", "카드 결제 실패");
                    await totalPayment();
                    return;
                }

                await handleMileageEarn(orderAmount, userInfo);
                await handleUseCoupons(orderList);

                const paid = Number(payEnd.cardInfo.amount || orderAmount);
                paymentSession.paidAmount += paid;
                paymentSession.totalPayInfo.push({
                    method: "카드",
                    ...payEnd.cardInfo,
                });

                await totalPayment({
                    action: "immediatePayment",
                    payMethod: "card",
                    cardInfo: payEnd.cardInfo,
                });
            };

            payBarcode.onclick = async () => {
                modal.classList.add("hidden");
                sendLogToMain("info", "바코드 결제 시작");

                const payEnd = await barcodePayment(orderAmount, 0);

                if (payEnd?.canceled) {
                    return;
                }

                if (!payEnd || !payEnd.success) {
                    const failMessage = payEnd?.message || "바코드 결제에 실패했습니다.";

                    openAlertModal(failMessage, "error");
                    sendLogToMain("error", `바코드 결제 실패: ${failMessage}`);

                    const okButton = document.getElementById("okButton");
                    okButton.replaceWith(okButton.cloneNode(true));

                    const newOkButton = document.getElementById("okButton");
                    newOkButton.onclick = async () => {
                        closeAlertModal();
                        await totalPayment();
                    };
                    return;
                }

                const payData = payEnd.message.parsedData;
                const get = key => payData.find(field => field.name === key)?.value?.trim() || "";

                const payInfo = {
                    method: get("발급사명") || "카카오페이머니",
                    payName: get("발급사명") || "카카오페이머니",
                    approvalNo: get("승인번호"),
                    amount: String(Number(get("거래금액") || "0")),
                    cardBin: get("카드Bin"),
                    approvedAt: get("승인일시"),
                    message: get("응답메시지"),
                    catId: get("승인CATID"),
                    posTraceNo: get("전문관리번호"),
                    uniqueNo: get("거래고유번호"),
                };

                if (!Array.isArray(paymentSession.totalPayInfo)) {
                    paymentSession.totalPayInfo = [];
                }

                paymentSession.totalPayInfo.push({
                    ...payInfo,
                    method: "바코드QR",
                });

                sendLogToMain("info", `바코드 결제 승인 - 금액: ${payInfo.amount}`);
                sendLogToMain("info", `[바코드 결제 상세] ${JSON.stringify(payInfo)}`);
                sendLogToMain("info", `[결제 누적 상세] ${JSON.stringify(paymentSession.totalPayInfo)}`);

                await handleMileageEarn(orderAmount, userInfo);
                await handleUseCoupons(orderList);
                await ordStart(0, payInfo, null, paymentSession.totalPayInfo);
            };

            payPoint.onclick = async () => {
                modal.classList.add("hidden");
                resetMileageUsage();

                response = await pointPayment(paymentSession.orderAmount);

                if (!Array.isArray(paymentSession.totalPayInfo)) {
                    paymentSession.totalPayInfo = [];
                }

                const pointData = response.pointData || {};
                paymentSession.totalPayInfo.push({
                    method: "마일리지",
                    mileageNo: pointData.mileageNo,
                    tel: pointData.tel,
                    uniqueMileageNo: pointData.uniqueMileageNo,
                    usedAmount: response.discountAmount ?? 0,
                    remainAmount: pointData.totalAmt ?? 0,
                    pointBalance: pointData.points ?? 0,
                });

                sendLogToMain("info", `포인트 사용 선택 - 금액: ${response.discountAmount ?? 0}`);
                sendLogToMain("info", `[포인트 응답 상세] ${JSON.stringify(response)}`);
                await totalPayment(response);
            };

            payCoupon.onclick = async () => {
                modal.classList.add("hidden");
                const result = await showCouponModal();

                if (isCouponApplied(result)) {
                    applyCouponFromOrders(orderList);
                    openAlertModal("쿠폰을 적용했습니다.");
                }

                await totalPayment();
            };
        }

        function renderTotalPayContent(modalElement, orderList, session) {
            const bodyHost = modalElement.querySelector(
                ".flex.flex-col.items-center.justify-center.w-full.h-full"
            );
            if (!bodyHost) return;

            const orderTotal = calcOrderTotal(orderList);
            const mileageUsed = getMileageUsed(session);
            const couponTotal = Number(session.couponTotal) || 0;
            const totalDiscount = couponTotal + mileageUsed;

            let couponLines = [];

            if (Array.isArray(session?.couponItems) && session.couponItems.length > 0) {
                couponLines = session.couponItems.map(couponItem => ({
                    name: couponItem.name,
                    count: couponItem.couponUsed,
                    discount: Number(couponItem.discount) || 0,
                }));
            } else if (Array.isArray(session?.couponMenuIds) && session.couponMenuIds.length > 0) {
                const couponMenuIds = new Set(session.couponMenuIds);
                couponLines = (orderList ?? [])
                    .filter(order => couponMenuIds.has(order.menuId))
                    .map(order => ({
                        name: order.name,
                        count: order.count,
                        discount: (Number(order.price) || 0) * (Number(order.count) || 0),
                    }));
            }

            const appliedAmount = Math.max(0, orderTotal - totalDiscount);

            bodyHost.innerHTML = `
    <div id="totalPayContent" class="flex w-full h-full px-4 gap-6">
      <div class="basis-[70%] bg-gray-50 rounded-xl p-4 flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-2xl font-bold">주문 내역</h3>
          </div>
          <div class="grid grid-cols-12 px-2 py-2 text-xl text-gray-500 border-b">
            <div class="col-span-7">메뉴명</div>
            <div class="col-span-2 text-center">수량</div>
            <div class="col-span-3 text-right">금액</div>
          </div>
          <div id="orderListView" class="flex-1 text-xl overflow-auto mt-2 pr-2 scroll-smooth scrollbar-hide" style="max-height: 240px"></div>
      </div>

      <div class="basis-[30%] bg-gray-50 rounded-xl p-4 flex flex-col gap-4">
        <section class="pb-24">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-2xl">쿠폰 할인</h4>
            <span id="couponTotal" class="text-xl text-gray-600">${couponTotal > 0 ? "-" + asWon(couponTotal) : ""}</span>
          </div>
          <div id="couponList" class="mt-2 space-y-1 text-gray-700">
            ${couponLines.length === 0
                ? `<div class="text-xl text-gray-400">적용된 쿠폰이 없습니다.</div>`
                : couponLines.map(line => `
                  <div class="flex items-center justify-between">
                    <div class="truncate pr-2">• ${line.name} <span class="text-gray-500">x ${line.count}</span></div>
                    <div class="text-right text-gray-600">-${asWon(line.discount)}</div>
                  </div>
                `).join("")}
          </div>
        </section>

        <section class="pt-2 border-t">
          <div class="flex items-center justify-between text-2xl">
            <h4 class="font-semibold">마일리지 할인</h4>
            <span id="mileageAmount" class="text-gray-600">${mileageUsed > 0 ? "-" + asWon(mileageUsed) : ""}</span>
          </div>
        </section>
        <section class="mt-auto pt-3 border-t">
          <div class="text-2xl text-gray-500 mb-1">총 결제금액</div>
          <div id="remainAmount" class="text-5xl font-extrabold tracking-tight text-right">${asWon(appliedAmount)}</div>
        </section>
      </div>
    </div>
  `;

            const listHost = bodyHost.querySelector("#orderListView");
            (orderList ?? []).forEach(order => {
                const priceLine = (Number(order.price) || 0) * (Number(order.count) || 0);
                const row = document.createElement("div");
                row.className = "grid grid-cols-12 px-2 py-3 border-b items-center";
                row.innerHTML = `
      <div class="col-span-7 font-medium">${order.name}</div>
      <div class="col-span-2 text-center">${order.count}</div>
      <div class="col-span-3 text-right font-semibold">${asWon(priceLine)}</div>
    `;
                listHost.appendChild(row);
            });
        }

        return {
            totalPayment,
            renderTotalPayContent,
        };
    }

    return {
        createPaymentModalController,
    };
});
