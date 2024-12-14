/////// 최초 전체 목록 조회해서 뿌리기, 여기서 주문 전송
const menuApi = require('../api/menuApi');
const orderApi = require('../api/orderApi');
const image = require('../../aws/s3/utils/image');
const {ipcRenderer} = require("electron");
const {getUserInfo} = require("../api/menuApi");

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', {level, message});
}

// 주문리스트
let orderList = [];

// polling 된 RD1 데이터
let rd1Info = {};

const data = image.downloadAllFromS3WithCache("model-narrow-road", "model/test_user1");

// 메뉴 데이터
let allProducts = [];
let userInfo = {};
let isDataLoaded = false;

// Product Grid
const productGrid = document.getElementById('productGrid');
const orderGrid = document.getElementById('orderGrid');

// 필터된 제품을 표시하는 함수
function displayProducts(products) {
    productGrid.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card rounded-lg p-2 text-center cursor-pointer';

        // 클릭 이벤트 처리
        card.addEventListener('click', () => {

            // 주문 처리 함수 호출
            addItemToOrder(product.menuId).then();

        });

        // 왼쪽, 오른쪽, 하단 배지 데이터
        const leftBadge = product.state?.eventTop; // 왼쪽 배지
        const rightBadge = product.state?.hotAndIce; // 오른쪽 배지
        const bottomBadge = product.state?.eventBottom; // 하단 배지

        // 왼쪽 배지 이미지 렌더링
        const leftBadgeImage = leftBadge
            ? `<img src="../../assets/basicImage/${leftBadge}.png" alt="Left Badge" 
                class="absolute top-0 left-0 w-16 h-16 object-cover"/>`
            : '';

        // 오른쪽 배지 이미지 렌더링
        const rightBadgeImage = rightBadge
            ? `<img src="../../assets/basicImage/${rightBadge}.png" alt="Right Badge" 
                class="absolute top-0 right-0 w-12 h-12 object-cover"/>`
            : '';

        // 하단 배지 이미지 렌더링
        const bottomBadgeImage = bottomBadge
            ? `<img src="../../assets/basicImage/${bottomBadge}.png" alt="Bottom Badge" 
                class="absolute bottom-0 left-0 w-16 h-16 object-cover"/>`
            : '';

        // 카드 내용 추가
        card.innerHTML = `
        <div class="relative">
            <img src="https://via.placeholder.com/100" alt="${product.name}" class="w-full rounded-md"/>
             <!-- 겹쳐지는 이미지 -->
            ${leftBadgeImage} <!-- 왼쪽 배지 -->
            ${rightBadgeImage} <!-- 오른쪽 배지 -->
            ${bottomBadgeImage} <!-- 하단 배지 -->
        </div>
        <div class="mt-2">
            <span class="block text-xl font-bold">${product.name}</span>
            <span class="block text-gray-600 text-xl font-bold pl-32">${`₩ ` + product.price.toLocaleString()}</span>
        </div>
        <!-- 숨겨진 버튼 -->
        <button id="${product.menuId}" class="prevent-double-click hidden" onclick="addItemToOrder('${product.menuId}')">주문하기</button>
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
    orderItem.className = 'order-item bg-gray-100 p-2 rounded-lg flex justify-between items-center w-full min-h-24';
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
                    <h3 class="font-bold text-xl">${product.name}</h3>
                    <p class="text-gray-600 text-xl font-bold">₩<span class="item-total font-bold">${product.price.toLocaleString()}</span></p>
                </div>
            </div>
            <!-- 삭제 버튼 -->
            <button class="text-red-500 text-sm h-5" onclick="removeItemFromOrder(this, '${orderId}')">
                <img class="h-6" src="../../assets/basicImage/20241208_154625.png" alt="delete" />
            </button>
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
    
    // [TODO] 추후 모달 적용
    if (orderList.length > 0 && confirm("모든 주문을 삭제 하시겠습니까?")) {
        // 주문 목록 초기화
        removeAllItem();
    }
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
        // 0.1초 대기 후 결제 API 호출
        const result = await new Promise((resolve) => {
            setTimeout(async () => {
                const res = await orderApi.reqVCAT_HTTP(price, "00");
                //const res = {success: true};
                resolve(res); // 결제 결과 반환
            }, 100);
        });


        // 결제 성공 여부 확인
        if (result.success) {
            sendLogToMain('info', `결제 성공 - 결제 금액:  ${price}`);
            sendLogToMain('info', `주문 목록 ${JSON.stringify(orderList)}`);
            // 모달 닫기
            modal.classList.add('hidden');
            //ipcRenderer.send('navigate-to-page', { pageName: 'make', data: orderList }); // 'make' 페이지로 이동
            await orderApi.reqOrder(orderList); // 주문 처리
            removeAllItem(); // 주문 목록삭제
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
        removeAllItem(); // 주문 목록삭제
    }
});

// polling 으로 받아온 RD1상태를 노출한다.
ipcRenderer.on('update-serial-data', (event, data) => {
    rd1Info = data;
});


/* 버튼 비동기 처리 0.2 초대기*/
// 플래그 객체로 버튼 ID별 상태 관리
const buttonFlags = {};

// 이벤트 위임을 통해 모든 버튼 처리
document.getElementById("buttonContainer").addEventListener("click", async (event) => {
    const button = event.target;

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

// 시간, 보일러 온도 업데이트
function updateTime() {
    const currentTimeElement = document.getElementById('current-time');
    const currentTemperatureElement = document.getElementById('current-temperature');
    currentTimeElement.textContent = getCurrentFormattedTime();
    currentTemperatureElement.textContent = rd1Info.boilerTemperature;
}

// 1초마다 시간 업데이트
setInterval(updateTime, 1000);

// 매장명, 비상연락쳐 업데이트
function updateStoreInfo() {
    const currentStoreNameElement = document.getElementById('storeName');
    const currentTelElement = document.getElementById('tel');
    currentStoreNameElement.textContent = userInfo.storeName;
    currentTelElement.textContent = userInfo.tel;
    console.log(userInfo);
}



// 한글 이름 매핑
const categoryLabels = {
    all: "전체메뉴",
    coffee: "커피",
    ade: "에이드",
    tea: "티",
    season: "시즌메뉴",
    dessert: "디저트",
    order: "기타음료"
};

// 동적으로 메뉴 생성 함수
function generateMenu(categories) {
    const nav = document.getElementById('menu-nav'); // <nav> 요소 가져오기

    categories.forEach((category, index) => {
        const menuTab = document.createElement('div');
        menuTab.className = `menu-tab flex-1 text-center py-2 hover:bg-gray-200 transition-colors duration-200 ${index === 0 ? 'active' : ''}`;
        menuTab.setAttribute('data-category', category.item || category.item4); // item 또는 item4 사용
        menuTab.textContent = category.name; // 메뉴 이름 설정
        nav.appendChild(menuTab);
    });
}

async function fetchData() {
    try {
        const allData = await menuApi.getMenuInfoAll();
        userInfo = await menuApi.getUserInfo();
        console.log('Fetched Data:', allData);
        console.log('Fetched Data:', userInfo);

        // 데이터가 올바르게 로드되었는지 확인
        if (!allData || !Array.isArray(allData.Items)) {
            throw new Error('올바르지 않은 데이터 구조입니다.');
        }

        if (!userInfo) {
            throw new Error('유저정보조회에 실패했습니다.');
        }

        allProducts = allData.Items; // 데이터를 Items 배열로 설정

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