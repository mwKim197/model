/////// 최초 전체 목록 조회해서 뿌리기, 여기서 주문 전송
const menuApi = require('../api/menuApi');
const orderApi = require('../api/orderApi');
const image = require('../../aws/s3/utils/image');
const {ipcRenderer} = require("electron");

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', {level, message});
}

let orderList = [];

const data = image.downloadAllFromS3WithCache("model-narrow-road", "model/test_user1");

// 메뉴 데이터
let allProducts = [];
let isDataLoaded = false;

// Product Grid
const productGrid = document.getElementById('productGrid');
const orderGrid = document.getElementById('orderGrid');


// 필터된 제품을 표시하는 함수
function displayProducts(products) {
    productGrid.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card bg-gray-200 rounded-lg p-2 text-center shadow-md hover:bg-gray-300 cursor-pointer';

        // 클릭 이벤트 처리
        card.addEventListener('click', () => {
            // 클릭된 아이템 시각적 강조
            card.classList.add('bg-blue-100', 'border-blue-500');
            card.classList.remove('bg-gray-200');

            // 주문 처리 함수 호출
            addItemToOrder(product.menuId).then();

            // 1초 후 강조 스타일 초기화
            setTimeout(() => {
                card.classList.remove('bg-blue-100', 'border-blue-500');
                card.classList.add('bg-gray-200');
            }, 200);
        });

        // 카드 내용 추가
        card.innerHTML = `
        <div class="relative">
            <img src="https://via.placeholder.com/100" alt="${product.name}" class="w-full rounded-md"/>
            <span class="absolute top-0 left-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg">EVENT</span>
        </div>
        <div class="mt-2">
            <span class="block font-bold">${product.name}</span>
            <span class="block text-gray-600">${`₩ ` + product.price.toLocaleString()}</span>
        </div>
        <!-- 숨겨진 버튼 -->
        <button id="${product.menuId}" class="hidden" onclick="addItemToOrder('${product.menuId}')">주문하기</button>
    `;

        // 부모 컨테이너에 추가
        productGrid.appendChild(card);
    });
}
async function addItemToOrder(menuId) {
    // 상품 검색
    const product = allProducts.find(p => p.menuId === menuId);
    if (!product) {
        console.error(`Product not found for menuId: ${menuId}`);
        return;
    }

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
        count: 1,
    });

    // UI 업데이트
    const orderItem = document.createElement('div');
    orderItem.className = 'order-item bg-gray-300 p-2 rounded-lg flex justify-between items-center w-full min-h-24';
    orderItem.setAttribute('data-order-id', orderId); // 고유 ID 설정
    orderItem.innerHTML = `
        <div class="bg-white w-full rounded-lg p-3 flex items-start space-x-4 shadow-md">
            <img src="${product.image}" alt="${product.name}" class="w-12 h-12 rounded-md">
            <div class="flex-1">
                <div class="flex justify-between items-center">
                    <h3 class="font-bold text-sm">${product.name}</h3>
                    <p class="text-gray-600 text-sm font-bold">₩<span class="item-total font-bold">${product.price.toLocaleString()}</span></p>
                </div>
                <div class="flex items-center space-x-2 mt-2">
                    <button class="px-2 py-1 bg-blue-500 text-white rounded-lg" 
                        onclick="updateItemQuantity(this, -1, '${orderId}')">-</button>
                    <span class="quantity bg-gray-100 px-3 py-1 rounded-lg text-center">1</span>
                    <button class="px-2 py-1 bg-green-500 text-white rounded-lg" 
                        onclick="updateItemQuantity(this, 1, '${orderId}')">+</button>
                </div>
            </div>
            <button class="text-red-500 text-sm" onclick="removeItemFromOrder(this, '${orderId}')">✖</button>
        </div>
    `;
    orderGrid.appendChild(orderItem);

    // 주문 요약 업데이트
    updateOrderSummary();
}

// 주문한 아이템 추가
function updateOrderSummary() {
    // 총 금액 및 총 개수 계산
    const totalPrice = orderList.reduce((sum, order) => sum + (Number(order.price) * order.count), 0);
    const totalCount = orderList.reduce((sum, order) => sum + order.count, 0);

    // 하단 버튼 영역의 요소 업데이트
    const priceElement = document.getElementById("totalAmt");
    const countElement = document.getElementById("totalCount");

    if (priceElement) {
        priceElement.textContent = `₩ ${totalPrice.toLocaleString()}`;
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
}

// 수량추가
function updateItemQuantity(button, delta, orderId) {
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

    // UI 업데이트 - 수량
    const quantitySpan = button.parentElement.querySelector('.quantity');
    if (quantitySpan) {
        quantitySpan.textContent = order.count;
    }

    // UI 업데이트 - 금액
    const itemTotalElement = button.closest('.flex-1').querySelector('.item-total');
    if (itemTotalElement) {
        itemTotalElement.textContent = (order.count * order.price).toLocaleString();
    }

    // 주문 요약 업데이트
    updateOrderSummary();
}
// 전체 아이템 삭제 함수
function removeAllItemsFromOrder() {
    // 주문 목록 초기화
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
document.querySelectorAll('.menu-tab').forEach(tab => {
    tab.addEventListener('click', () => {
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
document.getElementById('payment').addEventListener('click', async () => {

    if (orderList.length === 0) {
        return alert("상품을 선택해 주세요");
    }

    console.log(orderList);
    let price = 0;
    orderList.map((order) => {
        price += Number(order.price) * order.count;  // 수량만큼 가격 계산
    })
    const orderAmount = price; // 주문 금액
    const discountAmount = 0; // 할인 금액
    const totalAmount = orderAmount - discountAmount; // 전체 금액 계산

    // 모달금액 세팅
    document.getElementById('orderAmount').textContent = `주문금액: W ${orderAmount.toLocaleString()}원`;
    document.getElementById('discountAmount').textContent = `할인금액: W ${discountAmount.toLocaleString()}원`;
    document.getElementById('totalAmount').textContent = `전체금액: W ${totalAmount.toLocaleString()}원`;

    // 모달
    const modal = document.getElementById('modal');

    // 열기
    modal.classList.remove('hidden');
    try {
        // 1초 대기 후 결제 API 호출
        const result = await new Promise((resolve) => {
            setTimeout(async () => {
                const res = await orderApi.reqVCAT_HTTP(price, "00");
                //const res = {success: true};
                resolve(res); // 결제 결과 반환
            }, 1000);
        });


        // 결제 성공 여부 확인
        if (result.success) {
            sendLogToMain('info', `결제 성공 - 결제 금액:  ${price}`);
            sendLogToMain('info', `주문 목록 ${JSON.stringify(orderList)}`);
            // 모달 닫기
            modal.classList.add('hidden');
            //ipcRenderer.send('navigate-to-page', { pageName: 'make', data: orderList }); // 'make' 페이지로 이동
            await orderApi.reqOrder(orderList); // 주문 처리
            removeAllItemsFromOrder(); // 주문 목록삭제
        } else {
            // 결제 실패 처리
            modal.classList.add('hidden');
            alert("결제에 실패하였습니다. 다시 시도해주세요.");
            console.error("결제 실패: ", result.message);
            sendLogToMain('error', `결제 실패: ${result.message}`);
        }
    } catch (error) {
        // 오류 처리
        modal.classList.add('hidden');
        alert("결제 처리 중 오류가 발생했습니다.");
        sendLogToMain('error', `결제 오류: ${error.message}`);
        console.error("결제 오류: ", error.message);
        removeAllItemsFromOrder(); // 주문 목록삭제
    }
});

async function fetchData() {
    try {
        const allData = await menuApi.getMenuInfoAll();
        console.log('Fetched Data:', allData);

        // 데이터가 올바르게 로드되었는지 확인
        if (!allData || !Array.isArray(allData.Items)) {
            throw new Error('올바르지 않은 데이터 구조입니다.');
        }

        allProducts = allData.Items; // 데이터를 Items 배열로 설정

        // 초기 데이터 로드
        displayProducts(allProducts);
    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
    }
}

fetchData().then();  // 함수 호출