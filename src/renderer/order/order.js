function sendLogToMain (level, message) {
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

// 타이머 시작
function startCountdown() {
    clearCountdown();
    remainingSeconds = 60; // 초기화
    updateCountdownDisplay(); // 화면 표시 즉시 업데이트

    countdownTimer = setInterval(() => {
        remainingSeconds--;
        updateCountdownDisplay(); // 화면 업데이트

        if (remainingSeconds <= 0) {
            clearCountdown();
            removeAll();
            closePointModal();

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

// 가이드 이미지 추가
function checkAndShowEmptyImage() {
    const orderGrid = document.getElementById('orderGrid');

    const gridImg = iconImage ? iconImage : "../../assets/basicImage/가이드.png";
    // 빈 상태인지 확인
    if (orderGrid.children.length === 0) {
        orderGrid.innerHTML = `
            <div class="empty-image flex items-center justify-center h-full">
                <img src="${gridImg}" alt="No items available" class="w-96 h-auto" />
            </div>
        `;
    }
}

// 아이템 등록
function addOrderItem(orderItem) {
    const orderGrid = document.getElementById('orderGrid');

    // orderGrid에 이미지가 표시 중이면 제거
    const emptyImage = orderGrid.querySelector('.empty-image');
    if (emptyImage) {
        emptyImage.remove();
    }

    // 주문 항목 추가
    orderGrid.appendChild(orderItem);
}


// 초기 실행
checkAndShowEmptyImage();

// 상품 장바구니 추가
async function addItemToOrder(menuId) {
    if(totalCount > (limitCount - 1)) return openAlertModal(`${limitCount}개 이상 주문 할 수 없습니다.`);
    // 상품 검색
    const product = allProducts.find(p => p.menuId === menuId);

    if (!product) {
        console.error(`Product not found for menuId: ${menuId}`);
        return;
    }

    playAudio('../../assets/audio/음료를 선택하셨습니다.mp3');

    // 기존 항목 검색
    const existingOrder = orderList.find(order => order.menuId === product.menuId);

    if (existingOrder) {
        // 이미 존재하면 수량 증가
        existingOrder.count += 1;

        // UI 업데이트 - 수량 및 금액
        const orderItem = document.querySelector(`[data-order-id="${existingOrder.orderId}"]`);
        if (orderItem) {
            // 수량 업데이트
            const quantitySpan = orderItem.querySelector('.quantity');
            const itemTotalElement = orderItem.querySelector('.item-total');
            if (quantitySpan) {
                quantitySpan.textContent = existingOrder.count;
            }
            if (itemTotalElement) {
                itemTotalElement.textContent = (existingOrder.count * existingOrder.price).toLocaleString();
            }
        }

        // 주문 요약 업데이트
        updateOrderSummary();
        return; // 새로운 항목 추가를 중단
    }

    // 주문 항목 추가
    const orderId = `${product.menuId}-${product.userId}`;
    orderList.push({
        orderId,
        userId: product.userId,
        menuId: product.menuId,
        price: Number(product.price),
        item: product.items,
        name: product.name,
        count: 1,
    });

    // UI 업데이트
    const orderItem = document.createElement('div');
    orderItem.className = 'order-item bg-black bg-opacity-10 p-2 rounded-lg flex justify-between items-center w-full min-h-24';
    orderItem.setAttribute('data-order-id', orderId); // 고유 ID 설정
    orderItem.innerHTML = `
        <div class="w-full flex space-x-4">
            <div class="flex flex-col items-center">
                <!-- 이미지 -->
                <img src="${product.image}" alt="${product.name}" class="w-14 h-14 rounded-md">
                <!-- 버튼 그룹 -->
                <div class="flex items-center space-x-2 mt-2">
                    <button class="prevent-double-click h-6 text-white rounded-lg" 
                        onclick="updateItemQuantity(this, -1, '${orderId}')">
                    <img class="h-6" src="../../assets/basicImage/20241208_153430.png" alt="manus" />    
                    </button>
                    <span class="quantity h-6 rounded-lg text-center">1</span>
                    <button class="prevent-double-click h-6 text-white rounded-lg" 
                        onclick="updateItemQuantity(this, 1, '${orderId}')">
                    <img class="h-6" src="../../assets/basicImage/20241208_153438.png" alt="plus" />    
                    </button>
                </div>
            </div>
            <div class="flex-1">
                <!-- 상품명 및 가격 -->
                <div class="flex justify-between items-center">
                    <h3 class=" text-xl">${product.name}</h3>
                    <p class="text-gray-600 text-xl ">₩<span class="item-total" data-order-id="${orderId}">${product.price.toLocaleString()}</span></p>
                </div>
            </div>
            <!-- 삭제 버튼 -->
            <button class="text-red-500 text-sm h-5" onclick="removeItemFromOrder(this, '${orderId}')">
                <img class="h-6" src="../../assets/basicImage/20241208_154625.png" alt="delete" />
            </button>
        </div>

    `;
    addOrderItem(orderItem);
    //orderGrid.appendChild(orderItem);

    // 주문 요약 업데이트
    updateOrderSummary();
}

// 주문한 아이템 추가
function updateOrderSummary() {
    // 총 금액 및 총 개수 계산
    const totalPrice = orderList.reduce((sum, order) => sum + (Number(order.price) * order.count), 0);
    totalCount = orderList.reduce((sum, order) => sum + order.count, 0);

    // 하단 버튼 영역의 요소 업데이트
    const priceElement = document.getElementById("totalAmt");
    const countElement = document.getElementById("totalCount");

    if (priceElement) {
        priceElement.textContent = `₩   ${totalPrice.toLocaleString()}`;
    }
    if (countElement) {
        countElement.textContent = `${totalCount}개`;
    }
}

// 아이템 삭제
function removeItemFromOrder(button, orderId) {
    // 주문 목록에서 삭제
    const index = orderList.findIndex(o => o.orderId === orderId);
    if (index > -1) {
        orderList.splice(index, 1);
    }

    // UI에서 삭제
    const orderItem = button.closest('.order-item');
    if (orderItem) {
        orderItem.remove();
    }

    // 주문 요약 업데이트
    updateOrderSummary();
    checkAndShowEmptyImage();
}

// 수량추가
function updateItemQuantity(button, delta, orderId) {
    if(totalCount > (limitCount - 1) && delta > 0) return openAlertModal(`${limitCount}개 이상 주문 할 수 없습니다.`);
    const order = orderList.find(o => o.orderId === orderId);
    if (!order) {
        console.error(`Order not found for ID: ${orderId}`);
        return;
    }

    // 수량 업데이트
    order.count += delta;

    // 수량 제한
    if (order.count < 1) {
        order.count = 1;
        console.warn("Quantity cannot be less than 1");
    }

    // UI 업데이트
    const orderItem = button.closest('.order-item');
    if (orderItem) {
        const quantitySpan = orderItem.querySelector('.quantity');
        const itemTotalElement = orderItem.querySelector(`.item-total[data-order-id="${orderId}"]`);

        if (quantitySpan) {
            quantitySpan.textContent = order.count; // 수량 업데이트
        }
        if (itemTotalElement) {
            itemTotalElement.textContent = (order.count * order.price).toLocaleString(); // 금액 업데이트
        }
    }

    // 주문 요약 업데이트
    updateOrderSummary();
}

const alertModal = document.getElementById('alertModal');
const alertModalText = document.getElementById('alertModalText');
const okButton = document.getElementById('okButton');

// 모달 열기 함수
const openAlertModal = (text, type = "info") => {
    alertModalText.innerText = text;

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

// 포인트 모달 닫기
const closePointModal = () => {
    const modal = document.getElementById("pointModal");
    const globalDim = document.getElementById('globalDim');

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

// ✅ 확인/취소 모달을 Promise로
function openModalPromise(message) {
    return new Promise((resolve) => {
        const confirmModal = document.getElementById('confirmModal');
        const confirmButton = document.getElementById('confirmButton');
        const cancelButton = document.getElementById('cancelButton');

        if (!confirmModal || !confirmButton || !cancelButton) {
            console.error("모달 요소를 찾을 수 없습니다.");
            resolve(false);
            return;
        }

        // 메시지 설정
        const modalMessage = confirmModal.querySelector('h2');
        modalMessage.innerHTML = message;
        confirmModal.classList.remove('hidden');

        // 기존 이벤트 제거
        confirmButton.replaceWith(confirmButton.cloneNode(true));
        cancelButton.replaceWith(cancelButton.cloneNode(true));

        const updatedConfirmButton = document.getElementById('confirmButton');
        const updatedCancelButton = document.getElementById('cancelButton');

        updatedConfirmButton.onclick = () => {
            confirmModal.classList.add('hidden');
            resolve(true);  // ✅ 확인 시 true
        };
        updatedCancelButton.onclick = () => {
            confirmModal.classList.add('hidden');
            resolve(false); // ✅ 취소 시 false
        };
    });
}

// ✅ 포인트 입력 모달도 Promise로
async function showPointModal() {
    return await updateDynamicContent2("pointInput", {});
}

// ✅ 쿠폰 입력 모달도 Promise로
async function showCouponModal() {
    return await updateDynamicContent2("couponInput", {});
}

function removeAllItem() {
    orderList = [];

    // UI에서 모든 주문 항목 삭제
    const orderGrid = document.getElementById('orderGrid');
    if (orderGrid) {
        orderGrid.innerHTML = ''; // 모든 하위 요소 제거
    }
    updateOrderSummary();
    console.log('모든 주문 항목이 삭제되었습니다.');
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
document.getElementById('payment').addEventListener('click', async () => {
    const globalDim = document.getElementById('globalDim');

    if (orderList.length === 0) {
        return openAlertModal("상품을 선택해 주세요");
    }

    if (isPaying) return; // 중복 클릭 방지
    isPaying = true;

    globalDim.classList.remove('hidden'); // ✅ UI 잠금 시작
    // 주문시작전 세션초기화
    startPaymentSession(null, 0);

    try {
        //await payment(); // 💳 + 제조 프로세스 포함
        await totalPayment(); // 💳 + 제조 프로세스 포함
        console.log('✅ 결제 및 제조 요청 완료');

        // ✅ 제조가 끝날 때까지 잠금 유지하고 싶으면 아래 timeout 설정
        setTimeout(() => {
            isPaying = false;
            globalDim.classList.add('hidden');
        }, 3 * 1000); // 예: 3초 후 해제

    } catch (e) {
        console.error('[ERROR] 결제 실패:', e);
        sendLogToMain('error', `결제 실패: ${JSON.stringify(e)}`);

        // ✅ 에러 메시지를 알림에 사용
        const message = e?.message || "결제 실패: 다시 시도해 주세요";
        openAlertModal(message, "error");

        isPaying = false;
        globalDim.classList.add('hidden'); // ❗ 실패 시도 UI 해제 필요
    }
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

//----------------쿠폰결제 금액계산-------------------//
const calculateTotalPayment = (orderList) => {
    let total = 0;

    orderList.forEach(order => {
        const used = order.couponUsed || 0;
        const count = order.count || 0;
        const payCount = Math.max(0, count - used); // 쿠폰 사용분 제외

        total += payCount * order.price;
    });

    return total;
};
//----------------쿠폰결제 금액계산-------------------//
//----------------쿠폰사용처라 -------------------//
function collectUsedCoupons(orderList) {
    const map = new Map(); // couponId 기준 dedupe
    for (const order of (orderList || [])) {
        const { usedCoupons = [], orderId, menuId } = order;
        for (const c of usedCoupons) {
            if (!c?.couponId) continue;
            if (!map.has(c.couponId)) {
                map.set(c.couponId, {
                    couponId: c.couponId,
                    couponCode: c.couponCode,
                    orderId,
                    menuId,
                });
            }
        }
    }
    return Array.from(map.values());
}
//----------------쿠폰사용처라 -------------------//
//-----------------통합결제--------------------//
// 결제 세션
const paymentSession = {
    orderId: null,
    orderAmount: 0,    // 원 주문금액(포인트/쿠폰 적용 전)
    totalDiscount: 0,  // 포인트/쿠폰 누적 할인
    usePointList: [],  // [{ uniqueMileageNo, usedAmount, pointData }]
    reset() {
        this.orderId = null;
        this.orderAmount = 0;
        this.totalDiscount = 0;
        this.usePointList = [];
    }
};

// 주문 시작 전에 세션 초기화
function startPaymentSession(orderId, orderAmount) {
    paymentSession.reset();
    paymentSession.orderId = orderId;
    paymentSession.orderAmount = Number(orderAmount) || 0;
}

// 포인트 누적
function accumulatePointUsage(resp) {
    if (!resp?.success || resp.action !== 'usePoints') return;
    const used = Number(resp.discountAmount) || 0;

    // mileageNo 추출
    const mileageNo = resp.pointData?.mileageNo;
    if (!mileageNo) return;

    // 이미 같은 mileageNo 가 있는지 확인
    const alreadyUsed = paymentSession.usePointList.some(
        (item) => item.pointData?.mileageNo === mileageNo
    );

    if (alreadyUsed) {
        openAlertModal(`이미 사용된 마일리지 번호입니다: ${mileageNo}`);
        return; // 중복 방지
    }

    console.log(resp);
    paymentSession.totalDiscount += used;
    paymentSession.usePointList.push({
        uniqueMileageNo: resp.pointData?.uniqueMileageNo ?? resp.point,
        usedAmount: used,
        pointData: resp.pointData ?? null,
    });
}

// 세션포인트(마일리지) 사용처리
async function commitPointUsages() {
    if (!paymentSession.usePointList.length) return { success: true, committed: 0 };

    const results = [];

    for (const u of paymentSession.usePointList) {
        const mileageNo = u.pointData?.mileageNo || u.point || u.uniqueMileageNo;
        const totalAmtNum = u.pointData?.totalAmt || 0;
        const usedAmount = u.usedAmount;

        try {
            const res = await useMileage(mileageNo, totalAmtNum, usedAmount);
            results.push({ ok: true, mileageNo, usedAmount, res });
        } catch (err) {
            results.push({ ok: false, mileageNo, usedAmount, error: err });
        }
    }

    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
        console.error("포인트 커밋 실패", failed);
        throw new Error(`포인트 커밋 실패: ${failed.length}/${results.length}`);
    }

    return { success: true, committed: results.length };
}

// 세션 포인트(마일리지) 사용 롤벡처리
async function rollbackPointUsages(reason = 'ORDER_FAIL') {
    if (!paymentSession.usePointList.length) return { success: true, rolledBack: 0 };

    const results = await Promise.all(
        paymentSession.usePointList.map(async (u, idx) => {
            const mileageNo   = u.pointData?.mileageNo || u.point || u.uniqueMileageNo;
            const usedAmount  = Number(u.usedAmount) || 0;
            const totalAmtNum = u.pointData?.totalAmt || 0;

            try {
                const res = await rollbackUseMileage(mileageNo, usedAmount, totalAmtNum, reason);
                return { ok: true, mileageNo, usedAmount, res };
            } catch (e) {
                return { ok: false, mileageNo, usedAmount, error: e, index: idx };
            }
        })
    );

    const failed = results.filter(r => !r.ok);
    if (failed.length) {
        console.error('[ROLLBACK POINTS] 일부 실패', failed);
        throw new Error(`포인트 롤백 실패: ${failed.length}/${results.length}`);
    }
    return { success: true, rolledBack: results.length };
}

const totalPayment = async (data) => {

    // 리셋 타이머 종료
    clearCountdown();
    let earnRate = userInfo.earnMileage; // 적립률
    let payType; // 결제 타입 기본값 포인트 결제
    let response;

    if (data?.action === 'usePoints') {
        accumulatePointUsage(data);
    }


    const orderAmount = Math.max(
        0,
        Number(calculateTotalPayment(orderList, 0)) - paymentSession.totalDiscount
    );

    if (orderAmount <= 0) {

        try {
            // 포인트 사용 내역 커밋
            await commitPointUsages();
        } catch (e) {
            sendLogToMain('error', `포인트 커밋 실패: ${e.message}`);
            openAlertModal('포인트 사용 처리에 실패했습니다. 관리자에게 문의해 주세요.');
            return;
        }
        // 카드 적립 없음 → 바로 주문 시작
        try {
            await ordStart();
        } catch (e) {
            // 포인트 롤벡처리
            try { await rollbackPointUsages('ORDER_FAIL'); } catch (re) {
                sendLogToMain('error', `포인트 롤백 실패: ${re.message}`);
            }
            throw e;
        }
        paymentSession.reset();
        return;
    }

    // 모달
    const modal = document.getElementById('totalPayModel');
    // 열기
    modal.classList.remove('hidden');

    // ✅ 본문 렌더(좌70/우30) — orderList, paymentSession 사용
    renderTotalPayContent(modal, orderList, paymentSession);


    const payCard = document.getElementById('payCard');
    const payBarcode = document.getElementById('payBarcode');
    const payPoint = document.getElementById('payPoint');
    const payCoupon = document.getElementById('payCoupon');


    // 바코드 fasle 일때만안보이기
    if (userInfo?.barcode !== false) {
        payBarcode.classList.remove("hidden");
    } else {
        payBarcode.classList.add("hidden");
    }

    // 마일리지 fasle 일때만안보이기
    if (userInfo.mileage !== false) {
        payPoint.classList.remove("hidden");
    } else {
        payPoint.classList.add("hidden");
    }

    // 쿠폰 fasle 일때만안보이기
    if (userInfo.coupon !== false) {
        payCoupon.classList.remove("hidden");
    } else {
        payCoupon.classList.add("hidden");
    }

    payCard.onclick = payBarcode.onclick = payPoint.onclick = payCoupon.onclick = null;
    const globalDim = document.getElementById('globalDim');
    const closeBtn = document.getElementById("totalPayCloseModalBtn");
    closeBtn.onclick = null;
    closeBtn.onclick = () => { modal.classList.add('hidden'); resetCountdown(); globalDim.classList.add('hidden'); };

    payCard.onclick = async () => {
        modal.classList.add('hidden');
        sendLogToMain('info', `카드 결제 시작`);

        const payEnd = await cardPayment(orderAmount, 0);

        if (!payEnd.success) {
            sendLogToMain('error', `카드 결제 실패`);
            return;
        }

        // 호출부
        const wantMileage = await openModalPromise("마일리지를 적립하시겠습니까?");
        if (wantMileage) {
            const mileageDone = await showPointModal(); // pointInput 플로우
            if (mileageDone?.success && mileageDone.action === ACTIONS.ACCUMULATION_COMPLETED) {
                sendLogToMain('info', `마일리지 적립 실행 - 번호: ${mileageDone.point}, 결제금액: ${orderAmount}, 적립률 : ${earnRate}`);
                await addMileage(mileageDone.point, orderAmount, earnRate);
            }
        }
        await ordStart(0, payEnd.cardInfo);
    };

    payPoint.onclick = async () => {
        // 통합결제 모달 닫기
        modal.classList.add('hidden');

        response = await pointPayment(orderAmount); // 포인트 모달 띄우기 및 포인트 사용 금액 반환

        sendLogToMain('info', `포인트 : ${JSON.stringify(response)}`);
        payType = response.action;
        await totalPayment(response);
    };
    payBarcode.onclick = async () => {
        modal.classList.add('hidden');
        sendLogToMain('info', `바코드 결제 시작`);

        const payEnd = await barcodePayment(orderAmount, 0);

        if (!payEnd.success) {
            sendLogToMain('error', `바코드 결제 실패`);
            return;
        }

        // 호출부
        const wantMileage = await openModalPromise("마일리지를 적립하시겠습니까?");
        if (wantMileage) {
            const mileageDone = await showPointModal(); // pointInput 플로우
            if (mileageDone?.success && mileageDone.action === ACTIONS.ACCUMULATION_COMPLETED) {
                sendLogToMain('info', `마일리지 적립 실행 - 번호: ${mileageDone.point}, 결제금액: ${orderAmount}, 적립률 : ${earnRate}`);
                await addMileage(mileageDone.point, orderAmount, earnRate);
            }
        }
        await ordStart(0, payEnd.cardInfo);

    };
    payCoupon.onclick = async () => {
        modal.classList.add('hidden');                // 통합결제 모달 닫고
        const result = await showCouponModal();       // updateDynamicContent2("couponInput")

        if (result?.action === ACTIONS.COUPON_APPLIED) {
            openAlertModal("쿠폰을 적용했습니다.");
        }

        await totalPayment();                       // 다시 결제 모달 열기
    };
}

// 마일리지 사용 합계 추출 (usePointList 우선)
function getMileageUsed(ps) {
    if (Array.isArray(ps?.usePointList)) {
        return ps.usePointList.reduce((s, it) => s + (Number(it.usedAmount) || 0), 0);
    }
    return Number(ps?.mileageUsed ?? ps?.pointUsed ?? 0);
}

// 모달 결제 START
// 통화 포맷 (₩ 1,000 같은 형태)
const KRW = new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' });
const asWon = n => KRW.format(Math.max(0, Math.round(Number(n) || 0)));

function calcOrderTotal(list) {
    return (list ?? []).reduce((sum, o) => {
        const price = Number(o.price) || 0;
        const cnt = Number(o.count) || 0;
        return sum + price * cnt;
    }, 0);
}

/**
 * 통합결제 모달 내부(본문) 구성 & 렌더링
 * - 좌: 주문 목록(name, count, price)
 * - 우: 쿠폰 할인(메뉴+수량), 마일리지 할인(금액), 적용금액, 남은 결제금액
 *
 * paymentSession 가질 수 있는 값(관례):
 *  - totalDiscount: 총 할인(쿠폰+마일리지)
 *  - mileageUsed(또는 pointUsed): 마일리지 사용 금액
 *  - couponItems: [{menuId, name, count, discount}]  // 선택(있으면 사용)
 *  - couponMenuIds: [menuId, ...]                    // 선택(없으면 전체할인 가정)
 */
function renderTotalPayContent(modalEl, orderList, paymentSession) {
    // 모달 본문 컨테이너(네가 넣어둔 “메뉴 데이터 넣기” 영역)를 찾아서 교체
    const bodyHost = modalEl.querySelector('.flex.flex-col.items-center.justify-center.w-full.h-full');
    if (!bodyHost) return;

    // ------ 데이터 준비 ------
    const orderTotal = calcOrderTotal(orderList);
    const mileageUsed = getMileageUsed(paymentSession);

    // 쿠폰 할인 파트: 우선순위
    // 1) couponItems 배열이 있으면 거기 discount 합산
    // 2) 없고 couponMenuIds 있으면 해당 메뉴 “전액 할인” 가정(필요시 부분할인으로 바꿔)
    let couponTotal = 0;
    let couponLines = [];

    if (Array.isArray(paymentSession?.couponItems) && paymentSession.couponItems.length > 0) {
        couponLines = paymentSession.couponItems.map(ci => ({
            name: ci.name,
            count: ci.count,
            discount: Number(ci.discount) || 0,
        }));
        couponTotal = couponLines.reduce((s, r) => s + r.discount, 0);
    } else if (Array.isArray(paymentSession?.couponMenuIds) && paymentSession.couponMenuIds.length > 0) {
        const set = new Set(paymentSession.couponMenuIds);
        couponLines = (orderList ?? [])
            .filter(o => set.has(o.menuId))
            .map(o => {
                const discount = (Number(o.price) || 0) * (Number(o.count) || 0); // 전액 할인 가정
                return { name: o.name, count: o.count, discount };
            });
        couponTotal = couponLines.reduce((s, r) => s + r.discount, 0);
    } else if (couponTotal === 0 && Number(paymentSession?.totalDiscount) > 0) {
        const derived = Number(paymentSession.totalDiscount) - mileageUsed;
        if (derived > 0) {
            couponTotal = derived;
            // couponLines는 비워둠(합계만 헤더에 표시)
        }
    } else {
        couponLines = []; // 적용된 쿠폰 없음
        couponTotal = 0;
    }

    // 총 할인은 paymentSession.totalDiscount를 신뢰하되,
    // 없으면 couponTotal + mileageUsed로 계산
    const totalDiscount = Number(paymentSession?.totalDiscount ?? (couponTotal + mileageUsed)) || 0;

    // 적용금액 & 남은 결제금액 (네 로직과 맞추기 위해 동일 값 사용)
    const appliedAmount = Math.max(0, orderTotal - totalDiscount);
    const remainAmount  = appliedAmount;

    // ------ 마크업 그리기 ------
    bodyHost.innerHTML = `
    <div id="totalPayContent" class="flex w-full h-full px-4 gap-6">
      <!-- 좌측: 주문 목록 (70%) -->
      <div class="basis-[70%] bg-gray-50 rounded-xl p-4 overflow-auto">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-xl font-bold">주문 내역</h3>
          <div id="orderTotal" class="text-lg font-semibold">${asWon(orderTotal)}</div>
        </div>

        <div class="grid grid-cols-12 px-2 py-2 text-sm text-gray-500 border-b">
          <div class="col-span-7">메뉴명</div>
          <div class="col-span-2 text-center">수량</div>
          <div class="col-span-3 text-right">금액</div>
        </div>
        <div id="orderListView"></div>
      </div>

      <!-- 우측: 할인/적용금액 (30%) -->
      <div class="basis-[30%] bg-gray-50 rounded-xl p-4 flex flex-col gap-4">
        <section>
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-lg">쿠폰 할인</h4>
            <span id="couponTotal" class="text-sm text-gray-600">${couponTotal > 0 ? '-' + asWon(couponTotal) : ''}</span>
          </div>
          <div id="couponList" class="mt-2 space-y-1 text-sm text-gray-700">
            ${couponLines.length === 0
        ? `<div class="text-gray-400">적용된 쿠폰이 없습니다.</div>`
        : couponLines.map(r => `
                  <div class="flex items-center justify-between">
                    <div class="truncate pr-2">• ${r.name} <span class="text-gray-500">x ${r.count}</span></div>
                    <div class="text-right text-gray-600">-${asWon(r.discount)}</div>
                  </div>
                `).join('')}
          </div>
        </section>

        <section class="pt-2 border-t">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-lg">마일리지 할인</h4>
            <span id="mileageAmount" class="text-sm text-gray-600">${mileageUsed > 0 ? '-' + asWon(mileageUsed) : ''}</span>
          </div>
        </section>

        <section class="pt-2 border-t">
          <div class="flex items-center justify-between">
            <h4 class="font-semibold text-lg">적용금액</h4>
            <span id="appliedAmount" class="text-base font-bold">${asWon(appliedAmount)}</span>
          </div>
        </section>

        <section class="mt-auto pt-3 border-t">
          <div class="text-sm text-gray-500 mb-1">남은 결제금액</div>
          <div id="remainAmount" class="text-2xl font-extrabold tracking-tight">${asWon(remainAmount)}</div>
        </section>
      </div>
    </div>
  `;

    // 주문 목록 렌더
    const listHost = bodyHost.querySelector('#orderListView');
    (orderList ?? []).forEach(o => {
        const priceLine = (Number(o.price) || 0) * (Number(o.count) || 0);
        const row = document.createElement('div');
        row.className = 'grid grid-cols-12 px-2 py-3 border-b items-center';
        row.innerHTML = `
      <div class="col-span-7 font-medium">${o.name}</div>
      <div class="col-span-2 text-center">${o.count}</div>
      <div class="col-span-3 text-right font-semibold">${asWon(priceLine)}</div>
    `;
        listHost.appendChild(row);
    });
}

// 모달결제 END
//-----------------통합결제--------------------//
//-----------------쿠폰조회--------------------//
const openCouponInputModal = async () => {
    const modal = document.getElementById('couponInputModal');
    modal.classList.remove('hidden');

    const barcodeInput = document.getElementById("couponNumberInput");
    document.getElementById("couponBarcodeBtn").onclick = null;
    document.getElementById("couponCheckBtn").onclick = null;
    document.getElementById("closeCouponInputModal").onclick = null;
    barcodeInput.value = "";

    // 바코드 스캔
    document.getElementById("couponBarcodeBtn").onclick = async () => {
        const barcodeScan = await getBarcodeScanModal();
        barcodeInput.value = barcodeScan || "";
    };

    // 쿠폰 조회 및 즉시 적용
    document.getElementById("couponCheckBtn").onclick = async () => {
        const couponCode = barcodeInput.value.trim();
        if (!couponCode) {
            openAlertModal("쿠폰 번호를 입력하세요.", "error");
            return;
        }

        const result = await getBarcodeApi(couponCode);
        if (!result.ok || !result.item) {
            openAlertModal(result.message || "쿠폰 조회 실패", "error");
            return;
        }

        const couponItem = couponResult.item;
        const menuId = parseInt(couponItem.menuId, 10);

        // 적용 가능한 주문 찾기 (쿠폰 사용 가능 여부 체크)
        const matchedOrder = orderList.find(order => {
            if (order.menuId !== menuId) return false;

            // 아직 사용 가능한 쿠폰 슬롯 있는지
            const used = order.couponUsed || 0;
            if (used >= order.count) return false;

            // 중복 쿠폰 방지
            const alreadyUsed = (order.usedCoupons || [])
                .some(coupon => coupon.couponId === couponItem.couponId);

            if (alreadyUsed) {
                openAlertModal("이미 사용한 쿠폰입니다.", "error");
                return;
            }

            return true;
        });

        if (!matchedOrder) {
            openAlertModal("이 쿠폰을 적용할 수 있는 주문이 없거나 이미 모두 사용되었습니다.", "error");
            return;
        }

        // count는 그대로 두고 couponUsed만 증가
        matchedOrder.couponUsed = (matchedOrder.couponUsed || 0) + 1;
        matchedOrder.usedCoupons = matchedOrder.usedCoupons || [];
        matchedOrder.usedCoupons.push({
            couponId: couponItem.couponId,  // ✅ 이걸 메인으로 사용
            couponCode: couponItem.couponCode, // 선택(로그용)
        });

        // 모달 닫기
        modal.classList.add('hidden');
        openAlertModal(`${couponItem.title} 쿠폰을 적용했습니다.`, "success");

        // 결제모듈열기
        totalPayment();
    };

    // 닫기
    document.getElementById("closeCouponInputModal").onclick = () => {
        modal.classList.add('hidden');
        // 결제모듈열기
        totalPayment();
    };
};
//-----------------쿠폰조회--------------------//
//-----------------바코드스캔--------------------//
const getBarcodeScanModal = async () => {
    const modal = document.getElementById('barcodeModal');
    modal.classList.remove('hidden'); // 모달 열기

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
//-----------------바코드조회--------------------//
// 공통 헬퍼 (non-throw)
const getBarcodeApi = async (barcode) => {
    try {
        const res = await window.electronAPI.getCoupon(barcode);
        const statusCode = Number(res?.statusCode) || 0;

        let body = {};
        try {
            body = typeof res?.body === 'string' ? JSON.parse(res.body) : (res?.body || {});
        } catch (_) {
            body = {};
        }

        const ok = statusCode >= 200 && statusCode < 300;
        // body는 { item, code, message, ... } 가정
        return { ok, statusCode, ...body };
    } catch (err) {
        // IPC 자체가 실패했을 때도 throw 하지 말고 실패 구조 리턴
        return {
            ok: false,
            statusCode: 0,
            code: 'IPC_ERROR',
            message: err?.message || '쿠폰 조회 중 내부 통신 오류'
        };
    }
};
//-----------------바코드조회--------------------//

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

// 포인트 전역 변수
let inputCount = 12; // 입력 제한 초기 값
const passwordCount = 4; // 비밀번호 제한 값
let inputTarget = null; // 현재 콘텐츠 상태 저장
let type = "number";
let usePoint = 0; // 사용포인트
let totalAmt = 0; // 전체결제금액
let availablePoints = 0; // 보유포인트
let remainingAmount = 0; // 잔여결제액
let digitCount = 4;
let isPhone = false;

// 포인트 결제 (모달 열기)
const pointPayment = (orderAmount) => {
    return new Promise((resolve) => {

        playAudio('../../assets/audio/포인트를 적립 혹은 사용하시겠습니까.mp3');

        const modal = document.getElementById("pointModal");
        const globalDim = document.getElementById('globalDim');
        inputCount = userInfo.mileageNumber ? userInfo.mileageNumber : 12; // 입력 제한 초기화
        usePoint = 0; //
        totalAmt = orderAmount;
        isPhone = userInfo.isPhone // 휴대폰 여부
        modal.classList.remove("hidden"); // 모달 열기
        globalDim.classList.remove("hidden"); // 딤 열기
        updateDynamicContent("pointInput", orderAmount ,resolve);
    });
};

// 입력 템플릿 생성 함수
function createInputTemplate(title = "", count = 4) {
    digitCount = count;
    return `
        <div class="h-32 flex flex-col items-center w-full">
            ${title ? `<p class="text-2xl text-center mb-4">${title}</p>` : ""}
        </div>
        <div class="h-12 flex justify-center items-center w-full">
        <div class="relative w-[425px] h-[60px] flex flex-col justify-center">
            <!-- 숫자 표시 (입력 값) -->
            <div id="inputDisplay" 
                class="text-5xl text-black tracking-widest w-full text-center min-h-[50px] flex items-center justify-center box-border border-b-4 border-black">
            </div>
        </div>
    `;
}

// 모바일번호 폼
function createPhoneInputTemplate(title) {
    return `
        <div class="h-32 text-center">
            ${title ? `<p class="text-2xl text-center mb-4">${title}</p>` : ""}
        </div>
        <div class="h-12 flex justify-center items-center">
            <div class="flex gap-2">
                <!-- 첫 번째 입력칸 (010 고정) -->
                <div class="relative flex items-center">
                    <div class="text-5xl text-center">010</div>
                    <div class="text-5xl text-center mx-2">-</div>
                </div>
                <!-- 두 번째 입력칸 (4자리) -->
                <div class="relative flex items-center">
                    <div id="inputDigit-101" class="text-5xl text-center text-black">_</div>
                    <div id="inputDigit-102" class="text-5xl text-center text-black">_</div>
                    <div id="inputDigit-103" class="text-5xl text-center text-black">_</div>
                    <div id="inputDigit-104" class="text-5xl text-center text-black">_</div>
                    <div class="text-5xl text-center mx-2">-</div>
                </div>
                <!-- 세 번째 입력칸 (4자리) -->
                <div class="relative flex items-center">
                    <div id="inputDigit-201" class="text-5xl text-center text-black">_</div>
                    <div id="inputDigit-202" class="text-5xl text-center text-black">_</div>
                    <div id="inputDigit-203" class="text-5xl text-center text-black">_</div>
                    <div id="inputDigit-204" class="text-5xl text-center text-black">_</div>
                </div>
            </div>
        </div>

    `;
}

// 입력값 저장할 배열
let inputValue = ""; // 입력된 숫자를 저장하는 문자열 변수
let phoneValues = [[], []];
let phoneIndex = 0; // 현재 입력할 위치

// 입력된 숫자를 HTML(`#inputDisplay`)에 업데이트하는 함수
function updateInputDisplay() {
    const display = document.getElementById("inputDisplay");
    if (display) {
        if (type === "password") {
            display.textContent = "*".repeat(inputValue.length); // 비밀번호 입력 시 * 로 표시
        } else {
            display.textContent = inputValue; // 일반 숫자는 그대로 표시
        }
    }
}

// 번호 버튼 이벤트 등록
function setupNumberButtons() {
    const numberButtons = document.querySelectorAll("[data-number]");
    inputValue = ""; // 입력된 숫자를 저장하는 문자열 변수
    phoneValues = [[], []];
    phoneIndex = 0; // 현재 입력할 위치

    numberButtons.forEach((button) => {
        button.addEventListener("click", () => {

            // 리셋 타이머 초기화
            resetCountdown();
            const number = button.getAttribute("data-number");
            if (type === "coupon") {
                if (inputValue.length < 6) {
                    inputValue += number; // 입력된 값에 추가
                    updateInputDisplay();
                } else {
                    openAlertModal(`6 자리까지만 입력 가능합니다.`);
                }
            }
            if (type === "number") {
                if (inputValue.length < 12) {
                    inputValue += number; // 입력된 값에 추가
                    updateInputDisplay();
                } else {
                    openAlertModal(`4~12 자리까지만 입력 가능합니다.`);
                }
            } if (type === "password") {
                if (inputValue.length < passwordCount) {
                    inputValue += number; // 입력된 값에 추가
                    updateInputDisplay();
                } else {
                    openAlertModal(`4 자리까지만 입력 가능합니다.`);
                }
            } else if (type === "phone") {
                if (phoneIndex < 2) {
                    if (phoneValues[phoneIndex].length < 4) {
                        // 현재 칸에 숫자 추가
                        phoneValues[phoneIndex] += number;
                        const targetIndex = phoneIndex === 0 ? 101 : 201; // 첫 번째 칸(101~104), 두 번째 칸(201~204)

                        // 해당 칸 업데이트
                        document.getElementById(`inputDigit-${targetIndex + phoneValues[phoneIndex].length - 1}`).textContent = number;

                        // 4자리 입력하면 다음 칸으로 이동
                        if (phoneValues[phoneIndex].length === 4) {
                            phoneIndex++;
                        }
                    }
                }
            } else if (type === "point") {
                if (inputTarget) {
                    // 현재 입력된 텍스트에서 콤마를 제거
                    let currentText = inputTarget.textContent.replace(/,/g, "");
                    let updatedText = currentText + number;

                    // 문자열을 숫자로 변환
                    let usedPoints = Number(updatedText);

                    // 사용 가능한 최대 포인트 계산
                    if (usedPoints > availablePoints) {
                        usedPoints = availablePoints; // 보유 포인트로 제한
                    }
                    if (usedPoints > totalAmt) {
                        usedPoints = totalAmt; // 총 주문 금액으로 제한
                    }

                    // 입력 필드와 남은 금액을 업데이트
                    inputTarget.textContent = usedPoints.toLocaleString(); // 3자리 콤마 추가
                    const remaining = Math.max(totalAmt - usedPoints, 0); // 남은 금액 계산
                    remainingAmount.textContent = remaining.toLocaleString();
                }
            }
        });
    });
}

// 초기화 함수 (삭제 버튼 등에서 호출 가능)
function resetInput() {
    phoneValues = [[], []];
    phoneIndex = 0; // 현재 입력할 위치
    inputValue = "";  // 저장된 입력 값 초기화

    if (type === "number" || type === "password" || type === "coupon") {
        const inputDisplay = document.getElementById("inputDisplay");
        inputDisplay.textContent = ""; // 화면에서도 삭제
    }
}

let stateStack = []; // 상태 스택

// 동적 콘텐츠 업데이트 함수
function updateDynamicContent(contentType, data ,resolve) {
    const dynamicContent = document.getElementById("dynamicContent");
    const dynamicButton = document.getElementById('dynamicButton');
    const modal = document.getElementById("pointModal");
    const globalDim = document.getElementById('globalDim'); // 모달 딤
    const closeBtn       = document.getElementById("closeModalBtn");

    // 닫기 버튼 이벤트 연결
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.classList.add("hidden");
            globalDim?.classList.add("hidden");
            resolve?.({ success: true, action: ACTIONS.EXIT });
        };
    }

    // 현재 상태를 스택에 저장
    if (stateStack.length === 0 || stateStack[stateStack.length - 1] !== contentType) {
        stateStack.push(contentType);
    }

    // 뒤로가기 함수
    function goBack() {
        if (stateStack.length > 1) {
            stateStack.pop(); // 현재 상태를 제거
            const previousState = stateStack[stateStack.length - 1]; // 이전 상태 가져오기
            updateDynamicContent(previousState); // 이전 상태로 복원
        } else {
            console.warn("더 이상 뒤로 갈 상태가 없습니다.");
        }
    }

    // 버튼 추가 함수
    function addButton(id, text, className) {
        const button = document.createElement('button');
        button.id = id;
        button.innerText = text;
        button.className = className;

        button.addEventListener('click', () => {
            resetCountdown(); // 버튼 누를 때마다 타이머 리셋
        });

        dynamicButton.appendChild(button);
    }

    // 버튼 전체 삭제 함수
    function removeAllButtons() {
        while (dynamicButton.firstChild) {
            dynamicButton.removeChild(dynamicButton.firstChild); // 첫 번째 자식 요소를 제거
        }
    }
    // 입력값 초기화
    resetInput();
    if (contentType === "pointInput") {
        if (isPhone) {
            type = "phone";
            dynamicContent.innerHTML = createPhoneInputTemplate("마일리지 사용 휴대전화 번호 입력");
        } else {
            type = "number";
            dynamicContent.innerHTML = createInputTemplate(`마일리지 번호 입력 ${inputCount} 자리`, inputCount);
        }

        totalAmt = data;
        removeAllButtons();

        // 버튼 설정
        //addButton("addPointBtn", "적립하기", "bg-blue-500 text-white py-3 text-3xl rounded-lg  hover:bg-blue-600 w-full");
        addButton("usePointBtn", "사용하기", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");
        addButton("joinPointBtn", "등록하기", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");
        addButton("immediatePaymentBtn", "바로결제", "bg-gray-400 text-white py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48");

        // 포인트 적립버튼
        /*document.getElementById("addPointBtn").addEventListener("click", async () => {
            let mileageInfo = {mileageNo: inputValue, tel: ""};
            // 휴대폰일경우 inputValue 휴대폰번호로 변경
            if (isPhone) {
                inputValue = "010" + phoneValues.join(""); // 전화번호 배열 to String
                const regex = new RegExp(`^\\d{11}$`);

                // 입력값 검증
                if (!regex.test(inputValue)) {
                    openAlertModal(`번호는 11 자리 숫자여야 합니다.`);
                    return;
                }
                mileageInfo = {mileageNo: "", tel: inputValue};
            }

            if (inputValue.length >= 4 && inputValue.length <= 12) {

                const pointNumberCheck = await window.electronAPI.checkMileageExists(mileageInfo);
                if (pointNumberCheck) {
                    if (pointNumberCheck.data.exists) {
                        modal.classList.add("hidden"); // 모달 닫기
                        globalDim.classList.add("hidden"); // 모달딤 닫기

                        const data = pointNumberCheck.data;
                        resolve({success: true, action: ACTIONS.IMMEDIATE_PAYMENT, point: data.uniqueMileageNo, discountAmount: 0}); // 확인 시 resolve 호출
                    } else {
                        openAlertModal("등록되지 않은 번호입니다.");
                    }
                } else {
                    openAlertModal("유저정보 조회에 실패하였습니다.");
                }
            } else {
                openAlertModal(`마일리지 번호는 4~12 자리 입니다.`);
            }
        });*/

        // 포인트 사용버튼
        document.getElementById("usePointBtn").addEventListener("click", async () => {
            let mileageInfo = {mileageNo: inputValue, tel: ""};
            // 휴대폰일경우 inputValue 휴대폰번호로 변경
            if (isPhone) {
                inputValue = "010" + phoneValues.join(""); // 전화번호 배열 to String
                const regex = new RegExp(`^\\d{11}$`);

                // 입력값 검증
                if (!regex.test(inputValue)) {
                    openAlertModal(`번호는 11 자리 숫자여야 합니다.`);
                    return;
                }
                mileageInfo = {mileageNo: "", tel: inputValue};
            }

            if (inputValue.length >= 4 && inputValue.length <= 12) {

                const pointNumberCheck = await window.electronAPI.checkMileageExists(mileageInfo);

                if (pointNumberCheck) {

                    if (pointNumberCheck.data.exists) {
                        const item = pointNumberCheck.data.item;
                        const mileageInfo = {mileageNo: item.mileageNo, tel: item.tel, uniqueMileageNo:pointNumberCheck.data.uniqueMileageNo };
                        updateDynamicContent("passwordInput", mileageInfo ,resolve);
                    } else {
                        openAlertModal("등록되지 않은 번호입니다.");
                    }

                } else {
                    openAlertModal("유저정보 조회에 실패하였습니다.");
                }

            } else {
                openAlertModal(`마일리지 번호는 4~12 자리 입니다.`);
            }
        });

        // 포인트가입
        document.getElementById("joinPointBtn").addEventListener("click", () => {

            if (isPhone) {
                updateDynamicContent("addPhone", data ,resolve);
            } else {
                updateDynamicContent("joinPoints", data ,resolve);
            }

        });

        // 즉시결제 포인트 적립 X
        document.getElementById("immediatePaymentBtn").addEventListener("click", () => {
            // 즉시결제 포인트적립 X
            resolve({ success: true, action: ACTIONS.IMMEDIATE_PAYMENT, discountAmount: 0  }); // 결과 전달

            modal.classList.add("hidden"); // 모달 닫기
        });

    } else if (contentType === "passwordInput") {

        playAudio('../../assets/audio/비밀번호 4자리를 입력해주세요.mp3');

        // 비밀번호 입력 화면
        dynamicContent.innerHTML = createInputTemplate("비밀번호 입력", passwordCount);
        type = "password";
        removeAllButtons();

        addButton("exit", "사용취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");
        addButton("usePointBtn", "사용하기", "bg-gray-400 text-white py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48");

        document.getElementById("exit").addEventListener("click", () => {
            modal.classList.add("hidden"); // 모달닫기
            globalDim.classList.add("hidden"); // 모달딤 닫기
            // 통합결제 취소
            resolve({success: true, action: ACTIONS.EXIT});
        });

        // 비밀번호 검증
        document.getElementById("usePointBtn").addEventListener("click", async () => {

            // 비밀번호 검증후 사용하기화면으로 이동
            if (inputValue.length === passwordCount) {
                try {
                    const mileageInfo = {...data, password: inputValue};
                    // 포인트 password
                    const pointPasswordCheck = await window.electronAPI.verifyMileageAndReturnPoints(mileageInfo);

                    if (pointPasswordCheck) {

                        if (pointPasswordCheck.data.success) {
                            const pointData = {...pointPasswordCheck.data, ...data, totalAmt: totalAmt};
                            updateDynamicContent("usePoints", pointData ,resolve);
                        } else {
                            openAlertModal("페스워드가 틀렸습니다.");
                        }

                    } else {
                        openAlertModal("페스워드 조회에 실패하였습니다.");
                    }
                } catch (e) {
                    openAlertModal("에러가 발생했습니다. 관리자에게 문의하세요.", "error");
                }

            } else {
                openAlertModal(`마일리지 페스워드 번호는 ${passwordCount} 자리 입니다.`);
            }
            
        });

    } else if (contentType === "usePoints") {
        // 입력폼 초기화
        resetInput();
        const pointData = data;
        type = "point";

        // 3자리 콤마 추가를 toLocaleString으로 처리
        const formattedPoints = pointData.points.toLocaleString(); // 보유 포인트 포맷팅
        availablePoints = pointData.points; // 보유포인트
        const pointNo = pointData.uniqueMileageNo; // 조회된 포인트 번호
        // 포인트 사용 화면
        dynamicContent.innerHTML = `
            <div class="text-center">
                <div class="text-left mx-auto w-full max-w-lg">
                    <p class="text-4xl mb-4">총 주문 금액: <span id="totalOrderAmount">${totalAmt}</span>원</p>
                    <div class="flex gap-2">
                    <p class="text-2xl mb-4">보유 포인트:</p>
                    <span id="availablePoints" class="text-right text-2xl mb-4 w-40 ml-1">${formattedPoints}</span><span class="text-2xl"> P</span>
                    </div>
                    
                    <div class="flex gap-2">
                        <p class="text-2xl">사용 포인트:</p>
                        <div id="usePoint" class="text-right text-2xl mb-4 border-b-2 border-gray-300 w-40 ml-1"></div><span class="text-2xl"> P</span>
                        <button id="useAllPointsBtn" class="border-gray-300 py-1 px-4 text-xl rounded-lg bg-gray-200 hover:bg-gray-300">전액 사용</button>
                    </div>
                    <p class="text-4xl mt-4">결제 금액: <span id="remainingAmount"></span>원</p>   
                </div>
            </div>
        `;

        remainingAmount = document.getElementById("remainingAmount");
        remainingAmount.innerText = totalAmt; // 초기화
        inputTarget = document.getElementById("usePoint");
        inputTarget.innerText = "0"; // 초기화
        removeAllButtons();

        addButton("exit", "결제취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");

        document.getElementById("exit").addEventListener("click", () => {
            modal.classList.add("hidden"); // 모달닫기
            globalDim.classList.add("hidden"); // 모달딤 닫기

            // 통합결제 취소
            resolve({success: true, action: ACTIONS.EXIT});
        });

        // 전체 사용
        document.getElementById("useAllPointsBtn").addEventListener("click", () => {
            if (type === "point" && inputTarget) {
                const maxUsablePoints = Math.min(availablePoints, totalAmt);
                inputTarget.innerText = maxUsablePoints.toLocaleString(); // 포인트 업데이트
                const remaining = Math.max(totalAmt - maxUsablePoints, 0);
                remainingAmount.innerText = remaining.toLocaleString(); // 남은 금액 업데이트
            }
        });

        addButton("pointPaymentBtn", "포인트결제", "bg-gray-400 text-white py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48");
        document.getElementById("pointPaymentBtn").addEventListener("click", () => {
            // 포인트 포멧 to number
            const usePoint = cleanNumber(inputTarget.innerText);

            if (usePoint > 0) {
                // 포인트 결제,사용할포인트번호, 사용포인트
                resolve({success: true, action: ACTIONS.USE_POINTS, point: pointNo, discountAmount: usePoint, pointData: pointData}); // 포인트 사용 금액 반환
                modal.classList.add("hidden"); // 모달 닫기

            } else {
                playAudio('../../assets/audio/사용할 금액을 입력후 결제를 눌러주세요.mp3');
            }

        });
    } else if (contentType === "joinPoints") {

        playAudio('../../assets/audio/등록하실 고객번호를입력해주세요.mp3');

        type = "number";
        // 마일리지 가입 화면
        dynamicContent.innerHTML = createInputTemplate(`마일리지 가입 번호 입력 ${inputCount} 자리`, inputCount);
        removeAllButtons();

        addButton("exit", "취소하기", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");

        document.getElementById("exit").addEventListener("click", () => {
            modal.classList.add("hidden"); // 모달닫기
            globalDim.classList.add("hidden"); // 모달딤 닫기
            // 통합결제 취소
            resolve({success: true, action: ACTIONS.EXIT});
        });

        addButton("addPhone", "전화번호입력", "bg-gray-400 py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48");

        // 마일리지 번호 검증 후 비밀번호입력으로 이동
        document.getElementById("addPhone").addEventListener("click", async () => {

            // 가입시에는 관리자가지정한 자리수로 가입
            if (inputValue.length === inputCount) {
                const regex = new RegExp(`^\\d{${inputCount}}$`);

                // 입력값 검증
                if (!regex.test(inputValue)) {
                    openAlertModal(`번호는 ${inputCount}자리 숫자여야 합니다.`);
                    return;
                }

                const mileageInfo = {mileageNo: inputValue, tel: ""};
                const pointNumberCheck = await window.electronAPI.checkMileageExists(mileageInfo);

                if (pointNumberCheck) {

                    if (!pointNumberCheck.data.exists) {
                        updateDynamicContent("addPhone", inputValue, resolve);
                    } else {
                        openAlertModal("이미 등록된 유저입니다.");
                    }

                } else {
                    openAlertModal("유저정보 조회에 실패하였습니다.");
                }

            } else {
                openAlertModal(`마일리지 번호는 ${inputCount} 자리 입니다.`);
            }

        });
    } else if (contentType === "addPhone") {

        playAudio('../../assets/audio/연락처를 입력해주세요.mp3');

        // 입력폼 초기화
        resetInput();
        type = "phone";
        // 마일리지 가입 화면
        dynamicContent.innerHTML = createPhoneInputTemplate("마일리지 등록 휴대전화 번호 입력");
        removeAllButtons();

        addButton("exit", "등록취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");

        document.getElementById("exit").addEventListener("click", () => {
            modal.classList.add("hidden"); // 모달닫기
            globalDim.classList.add("hidden"); // 모달딤 닫기
            // 통합결제 취소
            resolve({success: true, action: ACTIONS.EXIT});
        });

        addButton("addPassword", "비밀번호입력", "bg-gray-400 py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48");

        // 마일리지 번호 검증 후 비밀번호입력으로 이동
        document.getElementById("addPassword").addEventListener("click", async () => {
            const phoneNumber = "010" + phoneValues.join(""); // 전화번호 배열 to String
            const regex = new RegExp(`^\\d{11}$`);

            // 입력값 검증
            if (regex.test(phoneNumber)) {
                const mileageInfo = {mileageNo: "", tel: phoneNumber};
                const pointNumberCheck = await window.electronAPI.checkMileageExists(mileageInfo);

                if (pointNumberCheck) {

                    if (!pointNumberCheck.data.exists) {
                        // 휴대폰번호 설정되어있을경우 mileageNo 휴대폰 번호로 설정
                        if (isPhone) {
                            updateDynamicContent("addPassword", {mileageNo: phoneNumber, tel: phoneNumber}, resolve);
                        } else {
                            updateDynamicContent("addPassword", {mileageNo: data, tel: phoneNumber}, resolve);
                        }

                    } else {
                        openAlertModal("이미 등록된 유저입니다.");
                    }

                } else {
                    openAlertModal("유저정보 조회에 실패하였습니다.");
                }

            } else {
                openAlertModal(`번호는 11자리 숫자여야 합니다.`);
            }

        });
    } else if (contentType === "addPassword") {

        playAudio('../../assets/audio/비밀번호 4자리를 입력해주세요.mp3');

        type = "password";
        // 마일리지 가입 화면
        dynamicContent.innerHTML = createInputTemplate("비밀번호 등록", passwordCount);

        removeAllButtons();
        addButton("exit", "등록취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");

        document.getElementById("exit").addEventListener("click", () => {
            modal.classList.add("hidden"); // 모달닫기
            globalDim.classList.add("hidden"); // 모달딤 닫기

            // 등록 취소
            resolve({success: true, action: ACTIONS.EXIT});
        });

        addButton("addPoint", "마일리지등록", "bg-gray-400 py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48");

        // 마일리지 번호 검증 후 비밀번호입력으로 이동
        document.getElementById("addPoint").addEventListener("click", async () => {
            let mileageData = data;
            // 비밀번호 검증 후 마일리지 가입
            if (inputValue.length === passwordCount) {
                try {
                    // 입력값 검증
                    const regex = new RegExp(`^\\d{${passwordCount}}$`);
                    if (!regex.test(inputValue)) {
                        openAlertModal(`비밀번호는 정확히 ${passwordCount}자리 숫자여야 합니다.`);
                        return;
                    }

                    const mileageInfo = { ...mileageData, password: inputValue };

                    // 마일리지 등록 API 호출
                    const addPoint = await window.electronAPI?.saveMileageToDynamoDB?.(mileageInfo);

                    if (!addPoint || !addPoint.success) {
                        openAlertModal("마일리지 등록에 실패하였습니다.");
                        return;
                    }

                    const data = addPoint.data || {};

                    if (!data?.uniqueMileageNo) {
                        openAlertModal("마일리지 번호를 가져올 수 없습니다.");
                        return;
                    }

                    if (addPoint.success || data?.uniqueMileageNo) {

                        playAudio('../../assets/audio/가입이 완료되었습니다 확인버튼을눌러주세요.mp3');
                    }

                    // 컴펌 창 띄우기
                    openModal(
                        "마일리지 등록이 완료되었습니다.<br>즉시 결제하시겠습니까?",
                        () => {
                            if (modal) {
                                modal.classList.add("hidden"); // 모달 닫기
                            } else {
                                console.error("modal 요소가 존재하지 않습니다.");
                            }

                            if (typeof resolve === "function") {
                                resolve({ success: true, action: ACTIONS.IMMEDIATE_PAYMENT, point: data.uniqueMileageNo });
                            } else {
                                console.error("resolve 함수가 정의되지 않았습니다.");
                            }
                        },
                        () => {
                            if (modal) {
                                modal.classList.add("hidden"); // 모달 닫기
                            } else {
                                console.error("modal 요소가 존재하지 않습니다.");
                            }

                            if (typeof resolve === "function") {
                                resolve({ success: true, action: ACTIONS.EXIT });
                            } else {
                                console.error("resolve 함수가 정의되지 않았습니다.");
                            }
                        }
                    );
                } catch (e) {
                    console.error("예외 발생:", e);
                    openAlertModal("에러가 발생했습니다. 관리자에게 문의하세요.", "error");
                }
            } else {
                openAlertModal(`마일리지 패스워드는 ${passwordCount} 자리 입니다.`);
            }

        });
    }
}

// 동적 콘텐츠 가입,적립만 가능
function updateDynamicContent2(contentType, data = {}) {
    return new Promise((resolve) => {
        const dynamicContent = document.getElementById("dynamicContent");
        const dynamicButton = document.getElementById('dynamicButton');
        const modal = document.getElementById("pointModal"); // ✅ 수정 완료
        const globalDim = document.getElementById('globalDim'); // 모달 딤
        isPhone = userInfo.isPhone // 휴대폰 여부

        let resolved = false;
        const aborter = new AbortController();

        function safeResolve(result) {
            if (resolved) return;
            resolved = true;
            modal?.classList.add("hidden");
            globalDim?.classList.add("hidden");
            aborter.abort();                 // ✅ 이 턴에서 붙인 모든 리스너 정리
            resolve(result);
            isPaying = false;
        }

        // ✅ 닫기 버튼: 전역 위임 1개만
        document.addEventListener(
            "click",
            (e) => {
                const closeBtn = e.target?.closest?.("#closeModalBtn");

                if (!closeBtn) return;
                e.preventDefault();
                safeResolve({ success: true, action: ACTIONS.EXIT });
            },
            { signal: aborter.signal, capture: true }
        );


        modal.classList.remove("hidden");
        globalDim?.classList.remove("hidden");
        dynamicButton.innerHTML = "";

        // 버튼 이벤트 초기화
        function clearButtons() {
            dynamicButton.innerHTML = "";
        }

        function addButton(id, text, className, handler) {
            const btn = document.createElement("button");
            btn.id = id;
            btn.innerText = text;
            btn.className = className;
            btn.onclick = () => {
                resetCountdown();
                handler();
            };
            dynamicButton.appendChild(btn);
        }

        // ✅ 모달 열기
        modal.classList.remove("hidden");
        globalDim.classList.remove("hidden");


        // ----- 단계별 화면 처리 -----
        if (contentType === "pointInput") {
            // 기존 유저 적립 단계
            resetInput();
            if (isPhone) {
                type = "phone";
                dynamicContent.innerHTML = createPhoneInputTemplate("마일리지 사용 휴대전화 번호 입력");
            } else {
                type = "number";
                dynamicContent.innerHTML = createInputTemplate(`마일리지 번호 입력 ${inputCount} 자리`, inputCount);
            }

            totalAmt = data.totalAmt || 0;
            clearButtons();

            // 적립 버튼
            addButton("addPointBtn", "적립하기", "bg-blue-500 text-white py-3 text-3xl rounded-lg hover:bg-blue-600 w-full", async () => {
                let mileageInfo = { mileageNo: inputValue, tel: "" };

                if (isPhone) {
                    inputValue = "010" + phoneValues.join("");
                    if (!/^\d{11}$/.test(inputValue)) {
                        return openAlertModal(`번호는 11 자리 숫자여야 합니다.`);
                    }
                    mileageInfo = { mileageNo: "", tel: inputValue };
                }

                if (inputValue.length < 4 || inputValue.length > 12) {
                    return openAlertModal(`마일리지 번호는 4~12 자리 입니다.`);
                }

                const pointNumberCheck = await window.electronAPI.checkMileageExists(mileageInfo);
                if (!pointNumberCheck) return openAlertModal("유저정보 조회에 실패하였습니다.");

                if (pointNumberCheck.data.exists) {
                    safeResolve({ success: true, action: ACTIONS.ACCUMULATION_COMPLETED, point: pointNumberCheck.data.uniqueMileageNo, discountAmount: 0 });
                } else {
                    openAlertModal("등록되지 않은 번호입니다.");
                }
            });

            // 가입 버튼
            addButton("joinPointBtn", "등록하기", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full", () => {
                updateDynamicContent2("joinPoints", data).then(resolve);
            });

        } else if (contentType === "joinPoints") {
            // 신규 가입 단계
            resetInput();
            type = "number";
            dynamicContent.innerHTML = createInputTemplate(`마일리지 가입 번호 입력 ${inputCount} 자리`, inputCount);
            clearButtons();

            addButton("exit", "취소하기", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full", () => {
                safeResolve({ success: true, action: ACTIONS.EXIT });
            });

            addButton("addPhone", "전화번호입력", "bg-gray-400 py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48", async () => {
                if (inputValue.length !== inputCount || !new RegExp(`^\\d{${inputCount}}$`).test(inputValue)) {
                    return openAlertModal(`번호는 ${inputCount}자리 숫자여야 합니다.`);
                }

                const mileageInfo = { mileageNo: inputValue, tel: "" };
                const pointNumberCheck = await window.electronAPI.checkMileageExists(mileageInfo);

                if (!pointNumberCheck) return openAlertModal("유저정보 조회에 실패하였습니다.");
                if (pointNumberCheck.data.exists) return openAlertModal("이미 등록된 유저입니다.");

                updateDynamicContent2("addPhone", inputValue).then(resolve);
            });

        } else if (contentType === "addPhone") {
            resetInput();
            type = "phone";
            dynamicContent.innerHTML = createPhoneInputTemplate("마일리지 등록 휴대전화 번호 입력");
            clearButtons();

            addButton("exit", "등록취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full", () => {
                safeResolve({ success: true, action: ACTIONS.EXIT });
            });

            addButton("addPassword", "비밀번호입력", "bg-gray-400 py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48", async () => {
                const phoneNumber = "010" + phoneValues.join("");
                if (!/^\d{11}$/.test(phoneNumber)) {
                    return openAlertModal(`번호는 11자리 숫자여야 합니다.`);
                }

                const mileageInfo = { mileageNo: "", tel: phoneNumber };
                const pointNumberCheck = await window.electronAPI.checkMileageExists(mileageInfo);

                if (!pointNumberCheck) return openAlertModal("유저정보 조회에 실패하였습니다.");
                if (pointNumberCheck.data.exists) return openAlertModal("이미 등록된 유저입니다.");

                updateDynamicContent2("addPassword", { mileageNo: data || phoneNumber, tel: phoneNumber }).then(resolve);
            });

        } else if (contentType === "addPassword") {
            type = "password";
            dynamicContent.innerHTML = createInputTemplate("비밀번호 등록", passwordCount);
            clearButtons();

            addButton("exit", "등록취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full", () => {
                safeResolve({ success: true, action: ACTIONS.EXIT });
            });

            addButton("addPoint", "마일리지등록", "bg-gray-400 py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48", async () => {
                if (inputValue.length !== passwordCount || !new RegExp(`^\\d{${passwordCount}}$`).test(inputValue)) {
                    return openAlertModal(`비밀번호는 정확히 ${passwordCount}자리 숫자여야 합니다.`);
                }

                const mileageData = { ...data, password: inputValue };
                const addPoint = await window.electronAPI?.saveMileageToDynamoDB?.(mileageData);

                if (!addPoint || !addPoint.success || !addPoint.data?.uniqueMileageNo) {
                    return openAlertModal("마일리지 등록에 실패하였습니다.");
                }

                playAudio('../../assets/audio/가입이 완료되었습니다 확인버튼을눌러주세요.mp3');

                openModal(
                    "마일리지 등록이 완료되었습니다.<br>즉시 결제하시겠습니까?",
                    () => safeResolve({ success: true, action: ACTIONS.IMMEDIATE_PAYMENT, point: addPoint.data.uniqueMileageNo }),
                    () => safeResolve({ success: true, action: ACTIONS.EXIT })
                );
            });
        } else if (contentType === "couponInput") {
            // 기존 유저 적립 단계
            resetInput();
            type = "coupon";
            dynamicContent.innerHTML = createPhoneInputTemplate("쿠폰 바코드 스캔 및 쿠폰 번호 입력");
            dynamicContent.innerHTML = createInputTemplate("쿠폰사용");
            clearButtons();

            // 바코드 스캔 버튼
            addButton("scanBarcodeBtn", "바코드스캔", "bg-red-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full", async () => {
                const barcodeScan = await getBarcodeScanModal();
                inputValue = barcodeScan || ""; // 입력된 값에 추가
                updateInputDisplay();
            });

            addButton("useBarCodeBtn", "사용하기", "bg-blue-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full", async () => {
                const couponCode = inputValue.trim();
                if (!couponCode) return openAlertModal("쿠폰 번호를 입력하세요.", "error");

                // 안전망
                let couponResult;
                try {
                    couponResult = await getBarcodeApi(couponCode);
                } catch (e) {
                    openAlertModal(e?.message || "쿠폰 조회 실패(예외)", "error");
                    return;
                }
                console.log("couponResult: ", couponResult);
                if (!couponResult.ok || !couponResult.item) {
                    openAlertModal(couponResult.message || "해당 쿠폰을 찾을 수 없습니다.", "error");
                    return;
                }

                const couponItem = couponResult.item;
                const menuId = parseInt(couponItem.menuId, 10);

                const matchedOrder = orderList.find(order => {
                    if (order.menuId !== menuId) return false;

                    const used = order.couponUsed || 0;
                    if (used >= order.count) return false;

                    const alreadyUsed = (order.usedCoupons || [])
                        .some(c => c.couponId === couponItem.couponId);

                    if (alreadyUsed) {
                        openAlertModal("이미 사용한 쿠폰입니다.", "error");
                        return false;
                    }
                    return true;
                });

                if (!matchedOrder) {
                    openAlertModal("이 쿠폰을 적용할 수 있는 주문이 없거나 이미 모두 사용되었습니다.", "error");
                    return;
                }

                matchedOrder.couponUsed = (matchedOrder.couponUsed || 0) + 1;
                matchedOrder.usedCoupons = matchedOrder.usedCoupons || [];
                matchedOrder.usedCoupons.push({
                    couponId: couponItem.couponId,
                    couponCode: couponItem.couponCode,
                });

                openAlertModal(`${couponItem.title} 쿠폰을 적용했습니다.`, "success");
                safeResolve({ success: true, action: ACTIONS.COUPON_APPLIED });
            });
        }

    });
}


//[TODO] 임시제거 포인트 모달 닫기
/*document.getElementById("closeModalBtn").addEventListener("click", () => {
    closePointModal();
});*/

// 마일리지 초기화
document.addEventListener("DOMContentLoaded", () => {
    const backspaceBtn = document.getElementById("backspaceBtn"); // 단건 지우기 버튼
    const clearAllBtn = document.getElementById("clearAllBtn"); // 전체 삭제 버튼

    setupNumberButtons(); // 번호 버튼 이벤트 초기화

    // 단건 지우기 (Backspace 버튼)
    backspaceBtn.addEventListener("click", () => {
        resetCountdown(); // 버튼 누를 때마다 타이머 리셋

        if (type === "point" && inputTarget.textContent) {
            // 기존 콤마를 제거하고 숫자 처리
            const currentText = inputTarget.textContent.replace(/,/g, ""); // 콤마 제거
            const updatedText = currentText.slice(0, -1); // 마지막 문자 제거

            // 결과를 다시 3자리 콤마 형식으로 표시
            inputTarget.textContent = updatedText ? Number(updatedText).toLocaleString() : "0";

            // 남은 금액 업데이트
            const usedPoints = Number(updatedText) || 0;
            const remaining = Math.max(totalAmt - usedPoints, 0);
            remainingAmount.textContent = remaining.toLocaleString();
        } else if (type === "phone") {

            if (phoneIndex >= 0) {
                if (phoneIndex === 2) {
                    phoneIndex = phoneIndex - 1;
                }

                if (phoneValues[phoneIndex].length > 0) {
                    // 현재 칸에서 숫자 하나 삭제
                    phoneValues[phoneIndex] = phoneValues[phoneIndex].slice(0, -1);
                } else if (phoneIndex > 0) {
                    // 이전 칸으로 이동하여 삭제
                    phoneIndex--;
                    phoneValues[phoneIndex] = phoneValues[phoneIndex].slice(0, -1);
                }

                // 화면 업데이트
                const targetIndex = phoneIndex === 0 ? 101 : 201;
                const digitToClear = targetIndex + phoneValues[phoneIndex].length;
                document.getElementById(`inputDigit-${digitToClear}`).textContent = "_";
            }
        } else if (type === "password") {
            const inputDisplay = document.getElementById("inputDisplay");

            if (inputValue.length > 0) {
                inputValue = inputValue.slice(0, -1); // 내부 변수에서도 마지막 문자 삭제
                inputDisplay.textContent = "*".repeat(inputValue.length); // 비밀번호 입력 시 * 로 표시; // 화면에서도 삭제
            }
        } else if (type === "coupon") {
            const inputDisplay = document.getElementById("inputDisplay");

            if (inputValue.length > 0) {
                inputValue = inputValue.slice(0, -1); // 내부 변수에서도 마지막 문자 삭제
                inputDisplay.textContent = inputValue; // 화면에서도 삭제
            }
        } else {
            const inputDisplay = document.getElementById("inputDisplay");

            if (inputValue.length > 0) {
                inputValue = inputValue.slice(0, -1); // 내부 변수에서도 마지막 문자 삭제
                inputDisplay.textContent = inputValue; // 화면에서도 삭제
            }
        }
    });

    // 전체 삭제 (Clear All 버튼)
    clearAllBtn.addEventListener("click", () => {
        resetCountdown(); // 버튼 누를 때마다 타이머 리셋

        if (type === "point") {
            inputTarget.textContent = "0"; // 입력 초기화
            // 남은 금액 초기화
            remainingAmount.textContent = totalAmt.toLocaleString();
        } else if (type === "phone") {
            phoneValues = [[], []];
            phoneIndex = 0; // 현재 입력할 위치

            document.getElementById(`inputDigit-101`).textContent = "_";
            document.getElementById(`inputDigit-102`).textContent = "_";
            document.getElementById(`inputDigit-103`).textContent = "_";
            document.getElementById(`inputDigit-104`).textContent = "_";
            document.getElementById(`inputDigit-201`).textContent = "_";
            document.getElementById(`inputDigit-202`).textContent = "_";
            document.getElementById(`inputDigit-203`).textContent = "_";
            document.getElementById(`inputDigit-204`).textContent = "_";
        } else {
            resetInput();
        }
    });
});


// 카드 결제
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
    modal.classList.remove('hidden');
    try {
        // 0.1초 대기 후 결제 API 호출
        const result = await new Promise((resolve) => {
            setTimeout(async () => {
                /*let res;

                if (userInfo?.vcat) {
                    console.log("VCAT");
                    res = await window.electronAPI.reqVcatWebSocket(totalAmount);
                } else {
                    console.log("NVCAT");
                    res = await window.electronAPI.reqVcatHttp(totalAmount);
                }
                sendLogToMain('info', `카드 결제 요청 성공 결과: ${JSON.stringify(res)}`);
                console.log("res", res);*/
                const res = {success: true};
                resolve(res); // 결제 결과 반환
            }, 100);
        });


        // 결제 성공 여부 확인
        if (result.success) {
            const cardInfo = {};
            /*const cardInfoRaw = result.message; // 전체 카드결제 데이터
            const parsed = cardInfoRaw.parsedData;

            const getValue = (key) => parsed.find((item) => item.name === key)?.value || "";

            const cardInfo = {
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
            sendLogToMain('info', `결제 카드 정보: ${JSON.stringify(cardInfo)}`);*/

            // 모달 닫기
            modal.classList.add('hidden');

            playAudio('../../assets/audio/결제가 완료되었습니다 카드를 꺼내주세요.mp3');

            return {
                success: true,
                cardInfo,  // ✅ 카드 정보도 함께 반환
            };

        } else {
            // 결제 실패 처리
            modal.classList.add('hidden');
            // 결제실패시 60초 카운트다운 시작
            resetCountdown();
            openAlertModal(`결제에 실패하였습니다. 다시 시도해주세요.`, "error");
            sendLogToMain('error', `카드 결제 실패: ${JSON.stringify(result)}`);
            return false;
        }
    } catch (error) {
        // 오류 처리
        modal.classList.add('hidden');
        // 결제오류시 60초 카운트다운 시작
        resetCountdown();
        openAlertModal("결제 처리 중 오류가 발생했습니다.", "error");
        sendLogToMain('error', `카드 결제 오류: ${error.message}`);
        removeAllItem(); // 주문 목록삭제
        checkAndShowEmptyImage();
        return false;
    }
}

const getBarcode = async () => {

    // 바코드 조회
    // nvcat const res = await window.electronAPI.reqBarcodeHTTP();
    const res = await window.electronAPI.runVcatFlow(); // vcat
    console.log(res);
    return res;
}

// 바코드 조회 및 결제
const barcodePayment = async (orderAmount, discountAmount = 0) => {
    clearCountdown();

    const totalAmount = orderAmount - discountAmount; // 전체 금액 계산

    try {
        // 0.1초 대기 후 결제 API 호출
        const result = await new Promise((resolve) => {
            setTimeout(async () => {
                const result= await window.electronAPI.runVcatFlow("APP_CARD", totalAmount);
                //const res = {success: true};
                resolve(result); // 결제 결과 반환
            }, 100);
        });

        // 결제 성공 여부 확인
        if (result.success) {
            console.log("바코드결제성공");
        } else {
            console.log("바코드결제실패");
        }
    } catch (error) {
        console.log("바코드결제에러");
        return false;
    }
}

// 30분이 지났는지 체크하는 함수
function isOver30Minutes() {
    if (!hasCoffee) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    const elapsed = currentTime - hasCoffee;
    return elapsed > preheatingTime; // 1800초 = 30분
}

// 주문 시작
const ordStart = async (point = 0, payInfo, pointData) => {

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
    // 커피 예열
    await window.electronAPI.coffeePreheating();

    console.log('[INFO] 커피 예열 완료');
}

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

async function fetchData() {
    try {
        const basePath = await window.electronAPI.getBasePath();
        // config 업데이트
        await window.electronAPI.fetchAndSaveUserInfo();
        const allData = await window.electronAPI.getMenuInfoAll();
        sendLogToMain('info', `전체 메뉴:  ${JSON.stringify(allData)}`);
        userInfo = await window.electronAPI.getUserInfo();
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

        console.log("version", version);
        preheatingTime = userInfo.preheatingTime ? userInfo.preheatingTime : 1800;
        limitCount = userInfo.limitCount ? userInfo.limitCount : 10;

        // 이미지 받아오기
        await window.electronAPI.downloadAllFromS3WithCache("model-narrow-road", `model/${userInfo.userId}`);
        // 데이터가 올바르게 로드되었는지 확인
        if (!allData || !Array.isArray(allData.Items)) {
            openAlertModal("메뉴를 등록해 주세요.", "error");
        }

        if (!userInfo) {
            throw new Error('유저정보조회에 실패했습니다.');
        }

        // `empty` 값이 "no"인 항목만 필터링 후 정렬
        allProducts = allData.Items
            .filter(item => item.empty === "no") // empty가 "no"인 항목만 남김
            .sort((a, b) => a.no - b.no); // no 기준으로 정렬

        // 매장명, 비상연락처
        updateStoreInfo();
        // 메뉴 생성 실행
        generateMenu(userInfo.category);
        // 초기 데이터 로드
        displayProducts(allProducts);
    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
    }
}

fetchData().then();  // 함수 호출

