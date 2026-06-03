if (!window.OrderUtils) {
    throw new Error("order-utils.js must be loaded before order.js");
}

if (!window.OrderPaymentSession) {
    throw new Error("order-payment-session.js must be loaded before order.js");
}

if (!window.OrderPaymentModal) {
    throw new Error("order-payment-modal.js must be loaded before order.js");
}

if (!window.OrderCart) {
    throw new Error("order-cart.js must be loaded before order.js");
}

if (!window.OrderInputModal) {
    throw new Error("order-input-modal.js must be loaded before order.js");
}

const {
    calculateTotalPayment,
    calculateOrderTotals,
    collectUsedCoupons,
    getMileageUsed,
    calcOrderTotal,
    findProductByName: findProductByNameFromProducts,
} = window.OrderUtils;

const { createPaymentSessionManager } = window.OrderPaymentSession;
const { createPaymentModalController } = window.OrderPaymentModal;
const { createCartController } = window.OrderCart;
const { createInputModalController } = window.OrderInputModal;

function sendLogToMain(level, message) {
    window.electronAPI.logToMain(level, message);
}

// 주문리스트
let orderList = [];

// 결제 중복 터치 방지
let isPaying = false;

// 결제 버튼 타임아웃
let paymentTimeout = null;

// polling 된 RD1 데이터
let rd1Info = {};

// 메뉴 데이터
let allProducts = [];

// 커피 메뉴주문 여부
let hasCoffee;

// 커피 예열 시간 1800초 = 30분
let preheatingTime = 1800;

let userInfo = {};

// 현재 재생 중인 오디오 객체
let currentAudio = null;

// user 데이터에저장되어있는 이미지 불러오기
let iconImage = "";

// Product Grid
const productGrid = document.getElementById('productGrid');

let totalCount = 0;
// 최대 잔수 기본 값
let limitCount = 10;

// [START] 60초 카운트 다운 기능추가
let countdownTimer = null;
let remainingSeconds = 0; // 초기 0초
const countdownDisplay = document.getElementById("countDown");

const {
    checkAndShowEmptyImage,
    addItemToOrder,
    updateOrderSummary,
    removeItemFromOrder,
    updateItemQuantity,
    removeAllItem,
    addItemToOrderWithQty,
} = createCartController({
    getOrderList: () => orderList,
    setOrderList: nextOrderList => {
        orderList = nextOrderList;
    },
    getProducts: () => allProducts,
    getIconImage: () => iconImage,
    getLimitCount: () => limitCount,
    setTotalCount: count => {
        totalCount = count;
    },
    openAlertModal: (...args) => openAlertModal(...args),
    playAudio: (...args) => playAudio(...args),
});

// Inline onclick handlers in generated order-item markup resolve through window.
window.addItemToOrder = addItemToOrder;
window.removeItemFromOrder = removeItemFromOrder;
window.updateItemQuantity = updateItemQuantity;


// 타이머 시작
function startCountdown() {
    clearCountdown();
    remainingSeconds = 62; // 초기화
    updateCountdownDisplay(); // 화면 표시 즉시 업데이트

    countdownTimer = setInterval(() => {
        remainingSeconds--;
        updateCountdownDisplay(); // 화면 업데이트

        if (remainingSeconds <= 0) {
            clearCountdown();
            removeAll();
            closePointModal(); // time out 처리
            closeTotalModal(); // time out 처리

            const allTab = document.querySelector('.menu-tab[data-category="all"]');
            if (allTab) {
                activateTab(allTab); // ← 우리가 직접 만든 함수로 호출
            }
        }
    }, 1000);
}

function activateTab(tab) {
    // 활성화된 탭 변경
    document.querySelector('.menu-tab.active')?.classList.remove('active');
    tab.classList.add('active');

    const category = tab.getAttribute('data-category');
    const filteredProducts = category === 'all'
        ? allProducts
        : allProducts.filter(product => product.category === category);

    displayProducts(filteredProducts);
}

// 타이머 리셋 (버튼 클릭 시마다 호출)
function resetCountdown() {
    startCountdown();
}

// 타이머 완전 종료 (결제 완료 시 호출)
function clearCountdown() {
    clearInterval(countdownTimer);
    countdownTimer = null;
    remainingSeconds = 0; // 초기 0초
    updateCountdownDisplay();
}

// 남은 시간 화면 표시
function updateCountdownDisplay() {
    countdownDisplay.innerText = `${remainingSeconds}`;
}
// [END] 60초 카운트 다운

// 메뉴 품절 판단
function isMenuSoldOut(menu, inventory) {
    const soldOutFlags = inventory?.flags?.soldOut || {};

    return menu.items.some(item => {
        let key;

        if (item.type === "coffee") {
            // coffee는 slot 기준
            return (
                soldOutFlags["coffee_1"] === true ||
                soldOutFlags["coffee_2"] === true
            );
        }

        key = `${item.type}_${item.value1}`;
        return soldOutFlags[key] === true;
    });
}


// 필터된 제품을 표시하는 함수
function displayProducts(products) {
    productGrid.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card rounded-lg text-center cursor-pointer';

        // 뉴, 베스트, 이벤트, 오른쪽 배지 데이터
        const newBadge = product.state?.new; // new 배지
        const bestBadge = product.state?.best; // best 배지
        const eventBadge = product.state?.event; // event 배지
        const rightBadge = product.iceYn === "yes" ? "ice":"hot" ; // 오른쪽 배지
        const isEmpty = product.empty === "yes"; // 품절 여부

        // 뉴 배지 이미지 렌더링
        const newBadgeImage = newBadge
            ? `<img src="../../assets/basicImage/${newBadge}.png" alt="Left Badge" 
                class="absolute top-0 left-0 w-full h-full object-cover"/>`
            : '';

        // 베스트 배지 이미지 렌더링
        const bestBadgeImage = bestBadge
            ? `<img src="../../assets/basicImage/${bestBadge}.png" alt="Bottom Badge" 
                class="absolute bottom-0 left-0 w-full h-full object-cover"/>`
            : '';

        // 이벤트 배지 이미지 렌더링
        const eventBadgeImage = eventBadge
            ? `<img src="../../assets/basicImage/${eventBadge}.png" alt="Bottom Badge" 
                class="absolute bottom-0 left-0 w-full h-full object-cover"/>`
            : '';

        // 오른쪽 배지 이미지 렌더링
        const rightBadgeImage = rightBadge && (!product.cupYn || product.cupYn === "no")
            ? `<img src="../../assets/basicImage/${rightBadge}.png" alt="Right Badge" 
                class="absolute top-0 right-0 w-8 h-8 object-cover mt-1.5 mr-1.5"/>`
            : '';

        // 품절 배지 이미지 렌더링
        const emptyBadgeImage = isEmpty
            ? `<img src="../../assets/basicImage/품절.png" alt="Sold Out Badge" 
                class="absolute top-0 left-0 w-full h-full object-cover opacity-70 z-10"/>`
            : '';

        // 카드 내용 추가
        card.innerHTML = `
        <div class="relative bg-black bg-opacity-10 w-[200px] aspect-square overflow-hidden rounded-2xl">
            <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover rounded-2xl"/>
             <!-- 겹쳐지는 이미지 -->
            ${newBadgeImage} <!-- 뉴 배지 -->
            ${bestBadgeImage} <!-- 베스트 배지 -->
            ${eventBadgeImage} <!-- 이벤트 배지 -->
            ${rightBadgeImage} <!-- 오른쪽 배지 -->
            ${emptyBadgeImage} <!-- 품절 배지 -->
        </div>
        <div class="mt-1">
            <span class="auto-shrink-text whitespace-nowrap block mx-auto">${product.name}</span>
            <span class="block text-gray-600 text-[1rem] text-right pr-4">${`₩ ` + product.price.toLocaleString()}</span>
        </div>
        <!-- 주문 버튼 -->
        <button 
            id="${product.menuId}" 
            class="prevent-double-click ${isEmpty ? 'disabled:opacity-50' : ''}" 
            ${isEmpty ? 'disabled' : ''} 
            onclick="${!isEmpty ? `addItemToOrder('${product.menuId}')` : ''}">
        </button>
    `;

        // 부모 컨테이너에 추가
        productGrid.appendChild(card);
        // 초기 크기 조정
        // 🔥 글자 크기 개별 조정 호출 (여기서 200px로 고정)
        const textElement = card.querySelector('.auto-shrink-text');
        adjustTextSize(textElement, 200);

        // 클릭 이벤트 처리 (품절 상태에서는 동작하지 않도록 추가 검증)
        if (!isEmpty) {
            card.addEventListener('click', () => {
                addItemToOrder(product.menuId).then();
            });
        } else {
            card.classList.add('cursor-not-allowed'); // 품절 상태일 때 커서 비활성화
        }
    });
}

// 개별적으로 적용 가능한 최종 조정 함수
function adjustTextSize(textElement, fixedWidth = 200) {
    let fontSize = 20; // 초기 폰트 크기
    textElement.style.fontSize = fontSize + "px";
    textElement.style.display = 'inline-block';
    textElement.style.transformOrigin = 'left center';

    const textWidth = textElement.scrollWidth;

    if (textWidth > fixedWidth) {
        const scale = fixedWidth / textWidth;
        textElement.style.transform = `scale(${scale})`;
    } else {
        textElement.style.transform = '';
    }
}

// 창 리사이징 시 재조정
window.addEventListener('resize', () => {
    document.querySelectorAll('.auto-shrink-text').forEach(el => adjustTextSize(el, 200));
})

// 초기 실행
checkAndShowEmptyImage();

const alertModal = document.getElementById('alertModal');
const alertModalText = document.getElementById('alertModalText');
const okButton = document.getElementById('okButton');

// 모달 열기 함수
const openAlertModal = (text, type = "info") => {
    // 줄바꿈(\n)을 <br>로 변환
    alertModalText.innerHTML = text.replace(/\n/g, "<br>");

    // 기존 색 제거
    alertModalText.classList.remove("text-red-600", "text-green-600", "text-black-900");

    if (type === "error") {
        alertModalText.classList.add("text-red-600");
    } else if (type === "success") {
        alertModalText.classList.add("text-green-600");
    } else if (type === "info") {
        alertModalText.classList.add("text-black-900");
    }

    alertModal.classList.remove('hidden');
};

// 모달 닫기
const closeAlertModal = () => {
    alertModal.classList.add('hidden');
};

// 확인 버튼 클릭 이벤트
okButton.addEventListener('click', () => {
    console.log('Alert 확인 버튼 클릭');
    closeAlertModal();
    // 필요한 추가 로직 실행
});

// 모든아이템 제거
const removeAll = () => {
    removeAllItem();
    checkAndShowEmptyImage();
    closeModal();
}

// 토탈결제 모달 닫기
const closeTotalModal = () => {
    const modal = document.getElementById('totalPayModel');
    // 입력폼 초기화
    resetInput();
    modal.classList.add("hidden"); // 모달 숨기기
    globalDim.classList.add("hidden"); // 딤 숨기기
    isPaying = false;
}

// 포인트 모달 닫기
const closePointModal = () => {
    const modal = document.getElementById("pointModal");

    // 입력폼 초기화
    resetInput();
    modal.classList.add("hidden"); // 모달 숨기기
    globalDim.classList.add("hidden"); // 딤 숨기기
    isPaying = false;
}
// confirm 모달
const confirmModal = document.getElementById('confirmModal');
const cancelButton = document.getElementById('cancelButton');
const confirmButton = document.getElementById('confirmButton');

function openModal(message, onConfirm, onCancel) {
    return new Promise((resolve) => {
        const modalMessage = confirmModal.querySelector('h2');
        modalMessage.innerHTML = message;
        confirmModal.classList.remove('hidden');

        confirmButton.onclick = () => {
            closeModal();
            if (typeof onConfirm === "function") onConfirm();
            resolve(true);
        };

        cancelButton.onclick = () => {
            closeModal();
            if (typeof onCancel === "function") onCancel();
            resolve(false);
        };
    });
}

// confirm 모달

// 모달 닫기 함수
const closeModal = () => {
    confirmModal.classList.add('hidden'); // 모달 숨기기
};

// ✅ 쿠폰 입력 모달도 Promise로
async function showCouponModal() {
    playAudio('../../assets/audio/쿠폰번호를 입력 하시거나 바코드스캔을 눌러 쿠폰을 스캔 해주세요.m4a');
    return await updateDynamicContent2("couponInput", {});
}

// 메뉴 탭 클릭 시 제품 필터링
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.getElementById('menu-nav'); // 부모 요소
    nav.addEventListener('click', (event) => {
        const tab = event.target.closest('.menu-tab'); // 클릭한 요소 확인
        if (!tab) return; // menu-tab이 아니면 무시

        // 활성화된 탭 변경
        document.querySelector('.menu-tab.active')?.classList.remove('active');
        tab.classList.add('active');

        // 카테고리 필터링
        const category = tab.getAttribute('data-category');
        const filteredProducts = category === 'all'
            ? allProducts
            : allProducts.filter(product => product.category === category);

        if (!filteredProducts.length) {
            console.warn(`해당 카테고리에 제품이 없습니다: ${category}`);
        }

        displayProducts(filteredProducts);
    });
});

// 결제
async function startPayment() {

    if (!Array.isArray(orderList) || orderList.length === 0) {
        openAlertModal && openAlertModal("상품을 선택해 주세요");
        return { ok: false, reason: 'EMPTY_ORDER' };
    }
    if (isPaying) return { ok: false, reason: 'ALREADY_PAYING' };

    isPaying = true;

    // 주문시작전 세션초기화
    startPaymentSession(null, 0);

    try {
        //await payment(); // 💳 + 제조 프로세스 포함
        await totalPayment(); // 💳 + 제조 프로세스 포함
        console.log('✅ 결제 및 제조 요청 완료');

        // 제조 완료까지 잠금 유지하고 싶으면 타임아웃/신호에 맞춰 해제
        setTimeout(() => {
            isPaying = false;
            const anyModalOpen = document.querySelectorAll('#dynamicContent:not(.hidden), #pointModal:not(.hidden), #alertModal:not(.hidden)').length > 0;
            if (!anyModalOpen) {
                globalDim.classList.add('hidden');
            } else {
                console.log('⚠️ 다른 모달이 열려 있어서 globalDim 유지');
            }
        }, 3000);

        return { ok: true };
    } catch (e) {
        console.error('[ERROR] 결제 실패:', e);
        sendLogToMain && sendLogToMain('error', `결제 실패: ${JSON.stringify(e)}`);

        const message = (e && e.message) || "결제 실패: 다시 시도해 주세요";
        openAlertModal && openAlertModal(message, "error");

        isPaying = false;
        globalDim && globalDim.classList.add('hidden');
        return { ok: false, reason: 'PAYMENT_ERROR', error: message };
    } finally {
        isPaying = false;
    }
}

// 결제 이벤트
document.getElementById('payment').addEventListener('click', async () => {
    await startPayment();
});

// 세자리 콤마 숫자로 변경
const cleanNumber = (value) => Number(String(value).replace(/,/g, ''));

// 적립 마일리지 사용등록 (마일리지 금액 수정, 마일리지이용내역등록)
const addMileage = async (mileageNo, totalAmtNum, earnRate) => {
    const totalAmt = cleanNumber(totalAmtNum);
    const pointsToAdd = Math.round((totalAmt * earnRate) / 100);
    const note = `결제 금액 ${totalAmt}원에 대한 ${earnRate}% 적립`;
    return await window.electronAPI.updateMileageAndLogHistory(mileageNo, totalAmt, pointsToAdd, 'earn', note);
};

// 사용 마일리지 사용등록 (마일리지 금액 수정, 마일리지이용내역등록)
const useMileage = async (mileageNo, totalAmtNum, pointsToUseNum) => {
    const totalAmt = cleanNumber(totalAmtNum);
    const pointsToUse = cleanNumber(pointsToUseNum);
    const note = `사용자 요청으로 ${pointsToUse}포인트 사용`;

    return await window.electronAPI.updateMileageAndLogHistory(mileageNo, totalAmt, -pointsToUse, 'use', note);
};

// 롤백 마일리지 사용등록 (마일리지 금액 수정, 마일리지이용내역등록)
const rollbackMileage = async (mileageNo, totalAmtNum, earnRate, rollBackPointNum) => {
    const totalAmt = cleanNumber(totalAmtNum);
    const rollBackPoint = cleanNumber(rollBackPointNum);
    const pointsToAdd = rollBackPoint || -(Math.round((totalAmt * earnRate) / 100));
    const note = `카드 결제 실패로 인해 ${Math.abs(pointsToAdd)}포인트 롤백`;
    return await window.electronAPI.updateMileageAndLogHistory(mileageNo, totalAmt, Number(pointsToAdd), 'rollback', note);
};

//-----------------통합결제--------------------//
const {
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
} = createPaymentSessionManager({
    getOrderList: () => orderList,
    setOrderList: nextOrderList => {
        orderList = nextOrderList;
    },
    calculateOrderTotals,
    collectUsedCoupons,
    getMileageUsed,
    addMileage,
    useMileage,
    rollbackMileage,
    useCouponApi: (...args) => useCouponApi(...args),
    sendLogToMain,
});

const {
    totalPayment,
    renderTotalPayContent,
} = createPaymentModalController({
    getOrderList: () => orderList,
    getUserInfo: () => userInfo,
    getGlobalDim: () => globalDim,
    setRemainingSeconds: seconds => {
        remainingSeconds = seconds;
    },
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
    cardPayment: (...args) => cardPayment(...args),
    barcodePayment: (...args) => barcodePayment(...args),
    pointPayment: (...args) => pointPayment(...args),
    showCouponModal: (...args) => showCouponModal(...args),
    isCouponApplied: result => result?.action === ACTIONS.COUPON_APPLIED,
    ordStart: (...args) => ordStart(...args),
});

//-----------------바코드스캔--------------------//
const getBarcodeScanModal = async () => {
    const modal = document.getElementById('barcodeModal');
    const barcodeModalCloseBtn = document.getElementById('barcodeModalCloseBtn');
    modal.classList.remove('hidden'); // 모달 열기

    barcodeModalCloseBtn.onclick = () => {
        stopBarcode();
        modal.classList.add('hidden');
    };
    playAudio('../../assets/audio/바코드 또는 큐알코드를 단말기에 스캔 해주세요.m4a');
    try {
        const result = await getBarcode(); // 바코드 읽기 대기

        //  모달 닫기
        modal.classList.add('hidden');

        //  값 그대로 리턴 (성공/실패 여부 판단은 호출하는 쪽에서)
        return result?.barcode || '';
    } catch (err) {

        //  에러 나도 모달 닫기
        modal.classList.add('hidden');
        return '';
    }
};
//-----------------바코드스캔--------------------//
//-----------------쿠폰조회--------------------//
// ✅ 공통 헬퍼 (non-throw) - 쿠폰 조회 + 사용여부 판단
const getCouponApi = async (barcode) => {
    try {
        const res = await window.electronAPI.getCoupon(barcode);
        const statusCode = Number(res?.statusCode) || 0;

        let body = {};
        try {
            body =
                typeof res?.body === "string"
                    ? JSON.parse(res.body)
                    : res?.body || {};
        } catch (_) {
            body = {};
        }

        const ok = statusCode >= 200 && statusCode < 300;

        // ✅ 1) 서버 통신 실패한 경우
        if (!ok) {
            return {
                ok: false,
                statusCode,
                code: body?.code || "COUPON_ERROR",
                message:
                    body?.message ||
                    "쿠폰을 조회하는 중 오류가 발생했습니다.",
            };
        }

        // ✅ 2) 쿠폰 데이터 자체 없음
        if (!body?.item) {
            return {
                ok: false,
                statusCode,
                code: "COUPON_NOT_FOUND",
                message: "해당 쿠폰을 찾을 수 없습니다.",
            };
        }

        // ✅ 3) count가 0이면 이미 사용된 쿠폰으로 간주
        if (Number(body.item.count) <= 0) {
            return {
                ok: false,
                statusCode: 200, // 조회는 성공이지만 사용불가
                code: "COUPON_ALREADY_USED",
                message: "이미 사용된 쿠폰입니다.",
                item: body.item,
            };
        }

        // ✅ 4) 유효한 쿠폰 (count > 0)
        return {
            ok: true,
            statusCode,
            code: "COUPON_VALID",
            message: "사용 가능한 쿠폰입니다.",
            item: body.item,
        };
    } catch (err) {
        // ✅ IPC 통신 실패 등
        return {
            ok: false,
            statusCode: 0,
            code: "IPC_ERROR",
            message: err?.message || "쿠폰 조회 중 내부 통신 오류",
        };
    }
};
//-----------------바코드조회--------------------//
//-----------------바코드사용--------------------//
// ✅ 쿠폰 사용 API (non-throw, getCouponApi와 동일한 구조)
const useCouponApi = async (couponArray) => {
    try {
        // ✅ electron preload → main → Lambda 호출
        const res = await window.electronAPI.useCoupon(couponArray);
        const statusCode = Number(res?.statusCode) || 0;

        let body = {};
        try {
            body = typeof res?.body === 'string'
                ? JSON.parse(res.body)
                : (res?.body || {});
        } catch (_) {
            body = {};
        }

        const ok = statusCode >= 200 && statusCode < 300;
        // body는 { success, message, updatedCount, failedList, ... } 구조
        return { ok, statusCode, ...body };
    } catch (err) {
        // IPC 오류 포함 — 절대 throw 안 함
        return {
            ok: false,
            statusCode: 0,
            code: "IPC_ERROR",
            message: err?.message || "쿠폰 사용 중 내부 통신 오류"
        };
    }
};
//-----------------바코드사용--------------------//

// 통합 결제
const payment = async () => {
    let payType; // 결제 타입 기본값 포인트 결제
    let earnRate = userInfo.earnMileage; // 적립률
    let response = 0;
    let price = 0;

    orderList.map((order) => {
        price += Number(order.price) * order.count; // 수량만큼 가격 계산
    });

    const orderAmount = price; // 주문 금액

    // 결제 타입 지정 userInfo.payType == true "마일리지 미사용"
    if (userInfo.payType) {

        // 현재 결제 방식이 마일리지를 제외한 카드 밖에없어서 강제 카드 넣기. 추후 바코드 추가
        payType = ACTIONS.USE_CARD;
    } else {
        response = await pointPayment(orderAmount); // 포인트 모달 띄우기 및 포인트 사용 금액 반환
        sendLogToMain('info', `포인트 : ${JSON.stringify(response)}`);
        payType = response.action;

        // 결제 취소
        if (payType === "exit") return;
    }

    // 카드결제
    if (payType === ACTIONS.USE_CARD) {
        sendLogToMain('info', `카드 결제 시작`);
        // 포인트 없을 경우 바로 카드결제
        const payEnd = await cardPayment(orderAmount, 0);

        if (payEnd.success) {
            await ordStart(0, payEnd.cardInfo); // 주문 시작
        } else {
            sendLogToMain('error', `카드 결제가 실패했습니다.`);
            console.error("카드 결제가 실패했습니다.");
        }
    }

    // 포인트 즉시결제 타입
    if (payType === ACTIONS.IMMEDIATE_PAYMENT) {

        // 포인트 번호가 있을경우 적립
        if (response.point) {
            sendLogToMain('info', `적립 마일리지번호: ${response.point}`);
            const payEnd = await cardPayment(orderAmount, 0);

            if (payEnd.success) {
                sendLogToMain('info', `마일리지 적립 실행 - 번호: ${response.point}, 결제금액: ${orderAmount}, 적립률 : ${earnRate}`);
                await addMileage(response.point, orderAmount, earnRate);
                
                try {
                    await ordStart(0, payEnd.cardInfo, response.pointData); // 주문 시작
                } catch (e) {
                    // 주문에러발생시 마일리치 롤백
                    sendLogToMain('error', `마일리지 적립 롤백 (주문 에러)- 번호: ${response.point}, 결제금액: ${orderAmount}, 적립률 : ${earnRate}`);
                    await rollbackMileage(response.point, orderAmount, earnRate);
                }
            } else {
                console.error("카드 결제가 실패했습니다.");
            }

        } else {
            sendLogToMain('info', `포인트 미적립 결제 시작`);
            // 포인트 없을 경우 바로 카드결제
            const payEnd = await cardPayment(orderAmount, 0);

            if (payEnd.success) {
                await ordStart(0, payEnd.cardInfo); // 주문 시작
            } else {
                console.error("카드 결제가 실패했습니다.");
            }
        }
    }

    // 포인트 결제
    if (payType === ACTIONS.USE_POINTS) {
        try {
            if (response.point && response.discountAmount ) {

                // 카드 결제 처리
                const discountAmount = response.discountAmount || 0;
                const totalAmount = orderAmount - discountAmount;

                if (totalAmount > 0) {
                    sendLogToMain('info', `포인트 잔액 카드결제 - 적립 마일리지번호: ${response.point}`);
                    const payEnd = await cardPayment(orderAmount, response.discountAmount);

                    if (payEnd.success) {
                        // 포인트 결제 시도
                        sendLogToMain('info', `포인트 결제 실행 - 번호: ${response.point}, 결제금액: ${orderAmount}, 사용포인트 : ${response.discountAmount}`);
                        const pointResult = await useMileage(response.point, orderAmount, response.discountAmount);

                        if (!pointResult.success) {
                            console.error("포인트 결제 실패:", pointResult.message);
                            throw new Error("포인트 결제가 실패했습니다.");
                        }

                        console.log("포인트 결제 성공:", response.discountAmount);

                        // 카드 결제 마일리지 적립
                        sendLogToMain('info', `마일리지 적립 실행 - 번호: ${response.point}, 결제금액: ${orderAmount}, 적립률 : ${earnRate}`);
                        await addMileage(response.point, totalAmount, earnRate);

                        try {
                            await ordStart(response.discountAmount, payEnd.cardInfo, response.pointData); // 주문 시작
                        } catch (e) {
                            // 주문에러발생시 마일리치 롤백
                            sendLogToMain('error', `마일리지 적립 롤백 (주문 에러)- 번호: ${response.point}, 결제금액: ${orderAmount}, 적립률 : ${earnRate}`);
                            await rollbackMileage(response.point, totalAmount, earnRate);
                        }
                    } else {
                        /*sendLogToMain('error', `마일리지 사용 롤백 (주문 에러)- 번호: ${response.point}, 결제금액: ${orderAmount}, 롤백포인트 : ${response.discountAmount}`);
                        // 포인트 사용후 카드결제 실패시 사용포인트 롤백
                        await rollbackMileage(response.point, totalAmount, earnRate ,response.discountAmount);*/
                        console.error("카드 결제가 실패했습니다.");
                    }
                } else {
                    // 포인트 결제 시도
                    sendLogToMain('info', `포인트 결제 실행 - 번호: ${response.point}, 결제금액: ${orderAmount}, 사용포인트 : ${response.discountAmount}`);
                    const pointResult = await useMileage(response.point, orderAmount, response.discountAmount);

                    if (!pointResult.success) {
                        console.error("포인트 결제 실패:", pointResult.message);
                        throw new Error("포인트 결제가 실패했습니다.");
                    }

                    console.log("포인트 결제 성공:", response.discountAmount);
                    sendLogToMain('info', `포인트 전액결제완료 - 결제포인트: ${response.discountAmount}`);
                    await ordStart(response.discountAmount, null, response.pointData); // 주문 시작
                }
            }

        } catch (error) {
            sendLogToMain('error', `결제 중 오류 발생: ${error.message}`);
            console.error("결제 중 오류 발생:", error.message);
        }
    } else {
        console.error("포인트 결제가 사용되지 않았습니다.");
        sendLogToMain('error', `포인트 결제가 사용되지 않았습니다.`);
    }

};

/**
 * ACTIONS 구분값 (결제 상태 관리)
 * @readonly
 * @enum {string}
 */
const ACTIONS = {
    /*즉시결제*/
    IMMEDIATE_PAYMENT: "immediatePayment",
    /*통합결제 취소*/
    EXIT: "exit",
    /*포인트결제*/
    USE_POINTS: "usePoints",
    /*카드결제*/
    USE_CARD: "useCard",
    /*바코드 결제*/
    USE_BARCODE: "useBarcode",
    /*적립완료*/
    ACCUMULATION_COMPLETED: "accumulationCompleted",
    /* 쿠폰 적용 완료*/
    COUPON_APPLIED: "coupunApplied",
};

// 포인트/쿠폰 입력 모달
const {
    pointPayment,
    createInputTemplate,
    createPhoneInputTemplate,
    updateInputDisplay,
    setupNumberButtons,
    resetInput,
    updateDynamicContent,
    updateDynamicContent2,
} = createInputModalController({
    ACTIONS,
    getUserInfo: () => userInfo,
    getGlobalDim: () => globalDim,
    getOrderList: () => orderList,
    setIsPaying: value => {
        isPaying = value;
    },
    electronAPI: window.electronAPI,
    playAudio: (...args) => playAudio(...args),
    resetCountdown: (...args) => resetCountdown(...args),
    openAlertModal: (...args) => openAlertModal(...args),
    openModal: (...args) => openModal(...args),
    cleanNumber,
    getBarcodeScanModal: (...args) => getBarcodeScanModal(...args),
    getCouponApi: (...args) => getCouponApi(...args),
});

const cardPayment = async (orderAmount, discountAmount) => {

    // 리셋 타이머 종료
    clearCountdown();

    playAudio('../../assets/audio/카드결제를 선택하셨습니다 카드를 단말기에 넣어주세요.mp3');

    const totalAmount = orderAmount - discountAmount; // 전체 금액 계산

    // 모달금액 세팅
    document.getElementById('orderAmount').textContent = `주문금액: W ${orderAmount.toLocaleString()}원`;
    document.getElementById('discountAmount').textContent = `포인트사용 금액: W ${discountAmount.toLocaleString()}원`;
    document.getElementById('totalAmount').textContent = `전체금액: W ${totalAmount.toLocaleString()}원`;

    // 모달
    const modal = document.getElementById('modal');

    // 열기
    globalDim.classList.remove('hidden');
    modal.classList.remove('hidden');
    try {
        // 0.1초 대기 후 결제 API 호출
        const result = await new Promise((resolve) => {
            setTimeout(async () => {
                let res;

                if (userInfo?.vcat) {
                    console.log("VCAT");
                    res = await window.electronAPI.reqVcatWebSocket(totalAmount);
                } else {
                    console.log("NVCAT");
                    res = await window.electronAPI.reqVcatHttp(totalAmount);
                }
                sendLogToMain('info', `카드 결제 요청 성공 결과: ${JSON.stringify(res)}`);
                console.log("res", res);

                resolve(res); // 결제 결과 반환
            }, 100);
        });


        // 결제 성공 여부 확인
        if (result.success) {
            let cardInfo = {};
            const cardInfoRaw = result.message; // 전체 카드결제 데이터
            const parsed = cardInfoRaw.parsedData;

            const getValue = (key) => parsed.find((item) => item.name === key)?.value || "";

            cardInfo = {
                approvalNo: getValue("승인번호"),                // 승인번호
                approvalDateTime: formatDate(getValue("승인일시")), // 승인일시 변환
                issuerName: getValue("발급사명"),                 // 카드사명
                acquirerName: getValue("매입사명"),               // 매입사명
                cardBin: getValue("카드Bin"),                     // 카드 BIN
                amount: parseInt(getValue("거래금액"), 10),       // 결제금액
                responseMessage: getValue("응답메시지"),          // 응답메시지
            };

            sendLogToMain('info', `💳 최종 카드 정보: ${JSON.stringify(cardInfo)}`);
            sendLogToMain('info', `결제 성공 - 결제 금액:  ${totalAmount}`);
            sendLogToMain('info', `주문 목록 ${JSON.stringify(orderList)}`);
            sendLogToMain('info', `결제 카드 정보: ${JSON.stringify(cardInfo)}`);

            // 모달 닫기
            modal.classList.add('hidden');
            globalDim.classList.add('hidden');
            playAudio('../../assets/audio/결제가 완료되었습니다 카드를 꺼내주세요.mp3');

            return {
                success: true,
                cardInfo,  // ✅ 카드 정보도 함께 반환
            };

        } else {
            // 결제 실패 처리
            modal.classList.add('hidden');
            globalDim.classList.add('hidden');
            // 결제실패시 60초 카운트다운 시작
            resetCountdown();
            openAlertModal(`결제에 실패하였습니다. 다시 시도해주세요.`, "error");
            sendLogToMain('error', `카드 결제 실패: ${JSON.stringify(result)}`);
            return false;
        }
    } catch (error) {
        // 오류 처리
        modal.classList.add('hidden');
        globalDim.classList.add('hidden');
        // 결제오류시 60초 카운트다운 시작
        resetCountdown();
        openAlertModal("결제 처리 중 오류가 발생했습니다.", "error");
        sendLogToMain('error', `카드 결제 오류: ${error.message}`);
        removeAllItem(); // 주문 목록삭제
        checkAndShowEmptyImage();
        return false;
    }
}

const requestEmployeeCardId = async () => {
    // RF 조회
    const res = await window.electronAPI.requestEmployeeCardId(); // nvcat

    console.log(res);
    return res;
}

const getBarcode = async () => {
    // 바코드 조회
    const res = await window.electronAPI.reqBarcodeHTTP(); // nvcat
    // vcat const res = await window.electronAPI.runVcatFlow();
    console.log(res);
    return res;
}

const stopBarcode = async () => {
    // 바코드 스캔취소
    const res = await window.electronAPI.stopBarcode_HTTP(); // nvcat
    console.log(res);
    return res;
}

// 바코드 조회 및 결제
const barcodePayment = async (orderAmount, discountAmount = 0) => {
    clearCountdown();

    const totalAmount = orderAmount - discountAmount;
    const barcodeModal = document.getElementById('barcodeModal');
    const barcodeModalCloseBtn = document.getElementById('barcodeModalCloseBtn');

    globalDim.classList.remove('hidden');
    barcodeModal.classList.remove('hidden');

    // Promise를 밖으로 빼기 위해 변수 선언
    let resolvePromise;

    // 결제 Promise 생성
    const payPromise = new Promise((resolve) => {
        resolvePromise = resolve;
    });

    // ❗ 닫기 버튼 클릭 시 → 즉시 취소 반환
    barcodeModalCloseBtn.onclick = () => {
        stopBarcode();
        barcodeModal.classList.add('hidden');
        globalDim.classList.add('hidden');

        resolvePromise({
            success: false,
            canceled: true,
            message: "사용자가 바코드 결제를 취소했습니다."
        });
    };

    playAudio('../../assets/audio/바코드 또는 큐알코드를 단말기에 스캔 해주세요.m4a');

    // 0.1초 후 결제 요청
    setTimeout(async () => {
        try {
            const result = await window.electronAPI.reqPayproBarcode(totalAmount);
            resolvePromise(result);
        } catch (error) {
            resolvePromise({ success: false, message: "바코드 결제 오류 발생" });
        }
    }, 100);

    // 최종 결과 Wait
    const result = await payPromise;

    // ⬇️ Cancel이면 호출부에서 처리하게 바로 return
    if (result.canceled) {
        sendLogToMain('info', `barcodePayment: 사용자 취소`);
        return result;
    }

    // 성공/실패 UI 처리
    barcodeModal.classList.add('hidden');
    globalDim.classList.add('hidden');

    if (result.success) {
        sendLogToMain('info', `barcodePayment 시작지점: 바코드결제성공`);
    } else {
        sendLogToMain('error', `barcodePayment 시작지점: 바코드결제실패`);
    }

    return result;
};

// 30분이 지났는지 체크하는 함수
function isOver30Minutes() {
    if (!hasCoffee) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    const elapsed = currentTime - hasCoffee;
    return elapsed > preheatingTime; // 1800초 = 30분
}

// 주문 시작
const ordStart = async (point = 0, payInfo, pointData, totalPayInfo) => {

    /* [TODO]커피 예열 임시 제거 겨울까지 테스트이후 다시 프로세스 정리후 적용예정 2025-05-30
    const chkCoffee = orderList.some(menu =>
        menu.item.some(i => i.type === "coffee")
    );

    if (chkCoffee) {

        if (isOver30Minutes()) {
            console.log("30분지남");

            // 커피 예열
            await coffeePreheating();
        }
        hasCoffee = Math.floor(Date.now() / 1000);
    }
    */

    // 리셋 타이머 종료
    clearCountdown();
    try {

        const ordInfo = {
            point: point,
            orderList: orderList,
            payInfo,
            pointData,
            totalPayInfo,
        }
        await window.electronAPI.setOrder(ordInfo); // 주문 처리
        removeAllItem(); // 주문 목록 삭제
        checkAndShowEmptyImage();

        const allTab = document.querySelector('.menu-tab[data-category="all"]');

        if (allTab) {
            activateTab(allTab); // ← 우리가 직접 만든 함수로 호출
        }
    } catch (error) {
        console.error("ordStart 에러 발생:", error.message);

        removeAllItem(); // 주문 목록 삭제
        checkAndShowEmptyImage();

        const allTab = document.querySelector('.menu-tab[data-category="all"]');

        if (allTab) {
            activateTab(allTab); // ← 우리가 직접 만든 함수로 호출
        }
        throw error; // 에러를 다시 던져서 상위 호출부에서 롤백 처리 가능
    }
};


/* 버튼 비동기 처리 0.2 초대기*/
// 플래그 객체로 버튼 ID별 상태 관리
const buttonFlags = {};

// 이벤트 위임을 통해 모든 버튼 처리
document.getElementById("buttonContainer").addEventListener("click", async (event) => {
    const button = event.target;

    // 60초 카운트다운시작
    startCountdown();

    // 특정 클래스(`prevent-double-click`)만 처리
    if (!button.classList.contains("prevent-double-click")) return;

    const buttonId = button.innerText; // 버튼의 고유 ID 또는 다른 구분자
    if (buttonFlags[buttonId]) return; // 중복 클릭 방지

    try {
        buttonFlags[buttonId] = true; // 상태 설정
        button.disabled = true; // 버튼 비활성화
        console.log(`${buttonId} 작업 시작`);

        // 비동기 작업 시뮬레이션
        await new Promise(resolve => setTimeout(resolve, 200)); // 0.2초 대기
        console.log(`${buttonId} 작업 완료`);
    } catch (error) {
        console.error(`${buttonId} 작업 중 에러 발생:`, error);
    } finally {
        buttonFlags[buttonId] = false; // 상태 초기화
        button.disabled = false; // 버튼 활성화
    }
});

// 카드 승인일자 날짜포멧
function formatDate(yyMMddHHmmss) {
    if (!yyMMddHHmmss || yyMMddHHmmss.length !== 12) return "";
    const year = "20" + yyMMddHHmmss.slice(0, 2);
    const month = yyMMddHHmmss.slice(2, 4);
    const day = yyMMddHHmmss.slice(4, 6);
    const hour = yyMMddHHmmss.slice(6, 8);
    const minute = yyMMddHHmmss.slice(8, 10);
    const second = yyMMddHHmmss.slice(10, 12);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function getCurrentFormattedTime() {
    const now = new Date();

    // 연도
    const year = now.getFullYear();

    // 월 (0부터 시작하므로 1을 더함)
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // 일
    const day = String(now.getDate()).padStart(2, '0');

    // 시간
    const hours = String(now.getHours()).padStart(2, '0');

    // 분
    const minutes = String(now.getMinutes()).padStart(2, '0');

    // 초
    const seconds = String(now.getSeconds()).padStart(2, '0');

    // 형식에 맞게 조합
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// RD1 데이터를 업데이트하는 콜백 함수
function getPollingData(data) {
    console.log('Polling Data Received:', data); // RD1 상태 확인용 로그
    rd1Info = data; // RD1 데이터를 전역 변수 또는 상태에 저장
}

// Electron의 API를 통해 메인 프로세스에서 RD1 데이터를 수신
window.electronAPI.updateSerialData(getPollingData);

// 시간, 보일러 온도 업데이트
function updateTime() {
    const currentTimeElement = document.getElementById('current-time');
    //const currentTemperatureElement = document.getElementById('current-temperature');
    currentTimeElement.textContent = getCurrentFormattedTime();
    //currentTemperatureElement.textContent = rd1Info.boilerTemperature;
}

// 1초마다 시간 업데이트
setInterval(updateTime, 1000);

// 현재 시간 가져오기 (KST 기준)
function getCurrentHour() {
    const now = new Date();
    return now.getHours(); // 24시간 형식의 현재 시각
}

// 매 정각, 30분 ture
function isEvery30Minutes() {
    const now = new Date();
    const minute = now.getMinutes();
    return minute === 0 || minute === 30;
}


// 자동 세척 동작
async function handlerWash() {
    const currentHour = getCurrentHour();
    const washTime = userInfo?.washTime ? userInfo.washTime : 4; // 사용자 세척 시간 기본 4시
    const today = new Date().toISOString().split('T')[0];
    const lastWash = await window.electronAPI.getLastWashDate();

    // 자동운전상태 정지 - 커피 프로세스 미동작시, 자동세척 오늘 실행된적 없을시, 화면 터치 시간 0일시(터치 동작 없을시)
    if (rd1Info.autoOperationState === "정지" && lastWash !== today && remainingSeconds === 0) {

        // `washTime`과 현재 시간이 일치하면 세척 실행
        if (parseInt(washTime, 10) === currentHour) {
            console.log(`[INFO] 🧼 오늘 세척 아직 안함. 세척 시작 시간 ${washTime}시`);
            await window.electronAPI.setLastWashDate(today); // ✅ 기록 저장
            const data = [
                { "type": "coffee" },
                { "type": "garucha", "value1": "1" },
                { "type": "garucha", "value1": "2" },
                { "type": "garucha", "value1": "3" },
                { "type": "garucha", "value1": "4" },
                { "type": "garucha", "value1": "5" },
                { "type": "garucha", "value1": "6" },
                { "type": "syrup", "value1": "1" },
                { "type": "syrup", "value1": "2" },
                { "type": "syrup", "value1": "3" },
                { "type": "syrup", "value1": "5" },
                { "type": "syrup", "value1": "6" },
            ];

            // 전체 세척 동작 수행
            await window.electronAPI.adminUseWash(data);

            // 머신 재시작
            await window.electronAPI.requestAppRestart();

            console.log('[INFO] 세척 완료');
        }
    }
}

// 커피 예열 동작
async function coffeePreheating() {
    if (userInfo?.warmUp === true) {
        sendLogToMain('info', `예열시작`);
        if (rd1Info.autoOperationState === "정지" && remainingSeconds === 0) {
            if (isEvery30Minutes()) {
                // 커피 예열
                await window.electronAPI.coffeePreheating();

                sendLogToMain('info', `예열완료`);
            }

        }
    } else {
        sendLogToMain('info', `예열안탐`);
    }
}

setInterval(coffeePreheating, 1000 * 60); // 예열 1분 테스트


// 세척 확인 스케줄링
setInterval(handlerWash, 1000 * 60 * 5); // 5분 간격으로 세척 확인

// 매장명, 비상연락쳐 업데이트
function updateStoreInfo() {
    const currentStoreNameElement = document.getElementById('storeName');
    const currentTelElement = document.getElementById('tel');
    currentStoreNameElement.textContent = userInfo.storeName;
    currentTelElement.textContent = userInfo.tel;
}

// 동적으로 메뉴 생성 함수
function generateMenu(categories) {
    const nav = document.getElementById('menu-nav'); // <nav> 요소 가져오기

    categories.forEach((category, index) => {
        const menuTab = document.createElement('div');
        menuTab.className = `menu-tab flex-1 text-center py-2 hover:bg-gray-200 transition-colors whitespace-nowrap duration-200  ${index === 0 ? 'active' : ''}`;
        menuTab.setAttribute('data-category', category.item || category.item4); // item 또는 item4 사용
        menuTab.textContent = category.name; // 메뉴 이름 설정
        nav.appendChild(menuTab);
    });
}

function playAudio(audioSrc) {
    // ✅ 기존 재생 중인 오디오가 있다면 정지
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }

    // ✅ 새로운 오디오 객체 생성 및 재생
    currentAudio = new Audio(audioSrc);
    currentAudio.play().catch((err) => {
        console.error('Audio play error:', err);
    });
}

function setVersion(version) {
    document.getElementById('version').textContent = "v" + version;
}

///////////////////// 음성호출 API /////////////////////
// ✅ allProducts에서 이름으로 최적 후보 1개 찾기 (품절 아닌 것 우선)
function findProductByName(name) {
    return findProductByNameFromProducts(allProducts, name);
}

// 3) "메뉴명 + 수량"으로 담기
async function addItemByMenuName(menuName, qty = 1) {
    const product = findProductByName(menuName);
    if (!product) {
        openAlertModal && openAlertModal(`"${menuName}" 상품을 찾지 못했습니다.`);
        return false;
    }
    if (product.empty === 'yes') {
        openAlertModal && openAlertModal(`"${product.name}" 는 품절입니다.`);
        return false;
    }
    await addItemToOrderWithQty(product.menuId, qty);
    return true;
}

// 서버에서 메뉴 추가 호출
window.electronAPI.on("order-add-item", async (data) => {
    console.log("👉 서버에서 addItemByMenuName 호출 요청:", data);
    await addItemByMenuName(data.menuName, data.qty || 1);
});

// 서버에서 결제 시작 호출
window.electronAPI.on("order-start-payment", async () => {
    console.log("👉 서버에서 startPayment 호출 요청");
    await startPayment();
});

///////////////////// 음성호출 API /////////////////////
///////////////////// 바코드 스캔 //////////////////////
// 바코드 입력 버퍼
let barcodeBuffer = "";
let lastTime = Date.now();
let isRemoteScanActive = false; // ✅ 서버 스캔 모드 플래그

// 바코드 입력 이벤트 등록
document.addEventListener("keydown", (e) => {

    // 🚫 원격 스캔 중 or 결제 중이면 스캔 무시
    if (isRemoteScanActive || isPaying) {
        console.warn("🔒 스캔 차단됨: 결제 중이거나 서버 제어 중입니다.");
        return;
    }
    const now = Date.now();

    // 입력 속도 판별 (사람 타이핑 vs 스캐너)
    if (now - lastTime > 50) barcodeBuffer = "";

    if (e.key === "Enter") {
        const code = barcodeBuffer.trim();
        if (code) handleBarcode(code);
        barcodeBuffer = "";
    } else if (/^[0-9a-zA-Z]$/.test(e.key)) {
        barcodeBuffer += e.key;
    }

    lastTime = now;
});

// 바코드 처리 함수
async function handleBarcode(code) {
    console.log("📦 바코드 스캔됨:", code);

    const product = allProducts.find(p => p.barcode === code);

    if (!product) {
        openAlertModal && openAlertModal(`등록되지 않은 바코드입니다: ${code}`);
        console.warn("해당 바코드 상품 없음:", code);
        return;
    }

    if (product.empty === "yes") {
        openAlertModal && openAlertModal(`"${product.name}" 는 품절입니다.`);
        return;
    }

    // 기존 addItemToOrderWithQty() 재사용
    await addItemToOrderWithQty(product.menuId, 1);
}

window.electronAPI.on("order-barcode-scan", async () => {
    console.log("📡 서버에서 바코드 스캔 요청 수신");

    // 🔒 서버 스캔 중에는 로컬 handleBarcode 비활성화
    isRemoteScanActive = true;

    let buffer = "";
    let lastTime = Date.now();

    const handler = (e) => {
        const now = Date.now();
        if (now - lastTime > 50) buffer = "";

        if (e.key === "Enter") {
            const code = buffer.trim();
            document.removeEventListener("keydown", handler);
            console.log("✅ 바코드 스캔 완료:", code);

            // main.js 로 전송
            window.electronAPI.send("barcode-scanned", { barcode: code });
        } else if (/^[0-9a-zA-Z]$/.test(e.key)) {
            buffer += e.key;
        }

        lastTime = now;
    };

    document.addEventListener("keydown", handler);
});


const globalDim = document.getElementById("globalDim");

const observer = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
        if (m.type === "attributes" && m.attributeName === "class") {
            const hidden = globalDim.classList.contains("hidden");
            if (hidden) {
                console.log(`🔍 globalDim 상태 변경됨 → hidden=${hidden}`, globalDim.className);
                console.trace(); // 호출 경로 추적
            }
        }
    });
});

observer.observe(globalDim, { attributes: true });

// 제고 품절 처리
function applySoldOutToAllProducts(allProducts, inventory) {
    const soldOutFlags = inventory?.flags?.soldOut || {};

    const coffee1SoldOut = soldOutFlags["coffee_1"] === true;
    const coffee2SoldOut = soldOutFlags["coffee_2"] === true;
    const cupPaperSoldOut = soldOutFlags["cup_paper"] === true;
    const cupPlasticSoldOut = soldOutFlags["cup_plastic"] === true;

    allProducts.forEach(product => {
        const isSoldOut = (product.items || []).some(item => {
            if (item.type === "coffee") {
                const bean1 = Number(item.value1 || 0);
                const bean2 = Number(item.value2 || 0);

                if (coffee1SoldOut && bean1 > 0) return true;
                if (coffee2SoldOut && bean2 > 0) return true;

                return false;
            }

            // syrup, garucha는 value1이 slot 번호
            const key = `${item.type}_${item.value1}`;
            return soldOutFlags[key] === true;
        });

        // 🧋 컵 품절 체크 (중요!)
        let cupSoldOut = false;
        if (product.cupYn === "no") {
            if (product.cup === "paper" && cupPaperSoldOut) {
                cupSoldOut = true;
            }
            if (product.cup === "plastic" && cupPlasticSoldOut) {
                cupSoldOut = true;
            }
        }

        // 최종 판정
        product.empty = (isSoldOut || cupSoldOut) ? "yes" : product.empty;
    });
}

///////////////////// 바코드 스캔 //////////////////////
async function fetchData() {
    try {
        const basePath = await window.electronAPI.getBasePath();
        // config 업데이트
        await window.electronAPI.fetchAndSaveUserInfo();
        const allData = await window.electronAPI.getMenuInfoAll();
        userInfo = await window.electronAPI.getUserData() ?? {};
        const version = await window.electronAPI.getVersion();

        setVersion(version);
        
        // 로고 세팅
        const userLogo = document.getElementById('userLogo');
        if (userInfo?.logoUrl) {
            userLogo.innerHTML = `
                <div class="flex items-center justify-center pt-4 pb-2 mb-4">
                    <img src="${userInfo.logoUrl}" alt="logo" class="w-48" />
                </div> 
            `;
        }
        
        // 아이콘이미지 세팅
        iconImage = userInfo?.iconUrl;
        // 아이콘 이미지 호출
        checkAndShowEmptyImage();

        preheatingTime = userInfo?.preheatingTime ?? 1800;
        limitCount = userInfo?.limitCount ?? 10;

        // 이미지 받아오기
        await window.electronAPI.downloadAllFromS3WithCache("model-narrow-road", `model/${userInfo.userId}`);
        // 데이터가 올바르게 로드되었는지 확인
        if (!allData || !Array.isArray(allData.Items)) {
            openAlertModal("메뉴를 등록해 주세요.", "error");
        }

        if (!userInfo) {
            throw new Error('유저정보조회에 실패했습니다.');
        }



        // 매장명, 비상연락처
        updateStoreInfo();
        // 메뉴 생성 실행
        generateMenu(userInfo.category);

        // 정렬
        allProducts = allData.Items.sort((a, b) => a.no - b.no);

        // 재고 사용여부
        const useInventoryCheck = userInfo?.inventoryCheckEnabled !== false;

        if (useInventoryCheck) {
            try {
                // 제고 조회
                const inventory = await window.electronAPI.getInventoryStatus(userInfo.userId);

                if (inventory?.ok) {
                    applySoldOutToAllProducts(allProducts, inventory);
                } else {
                    console.warn("⚠️ 재고 조회 실패 (무시하고 진행)");
                }

            } catch (e) {
                console.warn("⚠️ 재고 API 오류 (무시)", e);
            }
        }

        // 품절 제외하고 렌더링
        allProducts = allProducts.filter(p => p.empty === "no");

        // 초기 데이터 로드
        displayProducts(allProducts);

    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
    }
}

fetchData().then();  // 함수 호출

