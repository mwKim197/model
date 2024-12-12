/////// 최초 전체 목록 조회해서 뿌리기, 여기서 주문 전송
const log = require("../../logger");
const menuApi = require('../api/menuApi');
const orderApi = require('../api/orderApi');
const image = require('../../aws/s3/utils/image');
const {ipcRenderer} = require("electron");

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', { level, message });
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
    console.log("products + ", products);
    productGrid.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
                    <img src="${product.image}" alt="${product.name}" class="w-full mb-2">
                    <h3 class="text-lg font-bold">${product.name}</h3>
                    <div class="flex gap-2 mt-2">
                        <span class="flex items-center">
                            <span class="text-blue-500 mr-1">I</span>
                            ₩${product.price.toLocaleString()}
                        </span>
                    </div>
                    <button class="bg-blue-500 text-white p-2 rounded mt-2 " onclick="addItemToOrder('${product.menuId}')">주문하기</button>
                `;
        productGrid.appendChild(card);
    });
}

// 주문된 아이템을 오른쪽에 추가하는 함수
async function addItemToOrder(itemName) {

    // 데이터 로드 확인
    if (!Array.isArray(allProducts) || allProducts.length === 0) {
        console.warn("allProducts가 로드되지 않았습니다. 데이터를 로드합니다.");
        await fetchData(); // 데이터 로드 완료 대기
    }
    // 상품 검색
    const product = allProducts.find(p => String(p.menuId) === itemName);

    if (!product) {
        console.error(`Product not found for itemName: ${itemName}`);
        return;
    }

    // 중복 추가 방지
    const existingOrder = orderList.find(order => String(order.menuId) === String(product.menuId));
    if (existingOrder) {
        console.warn(`Item already in order: ${product.name}`);
        return;
    }

    // 주문 항목 추가
    const orderId = `${product.menuId}-${product.userId}`; // 고유 ID 생성
    orderList.push({
        orderId,
        userId: product.userId,
        menuId: product.menuId,
        price: product.price,
        count: 1, // 초기 수량
    });

    // 주문 아이템 UI 생성
    const orderItem = document.createElement('div');
    orderItem.className = 'order-item bg-gray-300 p-2 rounded-lg flex justify-between items-center w-[190px] min-h-32 h-32';
    orderItem.innerHTML = `
        <div class="border-2 border-gray-300 rounded-2xl">
            <img src="${product.image || 'https://placehold.co/200x300/png'}" alt="${product.name}" class="w-full mb-2">
            <span>${product.name}</span>
            <div class="flex justify-between">
                <div class="flex items-center space-x-2">
                    <!-- 수량 조정 버튼 -->
                    <button 
                        class="bg-blue-500 text-white px-2 py-1 rounded-lg" 
                        onclick="updateItemQuantity(this, -1, '${orderId}')">
                        -
                    </button>
                    <span class="quantity bg-white px-3 py-1 rounded-lg text-center">1</span>
                    <button 
                        class="bg-green-500 text-white px-2 py-1 rounded-lg" 
                        onclick="updateItemQuantity(this, 1, '${orderId}')">
                        +
                    </button>
                </div>
                <button 
                    class="bg-red-500 text-white px-2 py-1 rounded-lg" 
                    onclick="removeItemFromOrder(this, '${orderId}')">
                    삭제
                </button>  
            </div>
        </div>
    `;

    orderGrid.appendChild(orderItem); // UI에 추가
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
}

// 수량 추가
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

    // UI 업데이트
    const quantitySpan = button.parentElement.querySelector('.quantity');
    quantitySpan.textContent = order.count;
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

    console.log('모든 주문 항목이 삭제되었습니다.');
}


// 메뉴 탭 클릭 시 제품 필터링
document.querySelectorAll('.menu-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // 활성화된 탭 변경
        document.querySelector('.menu-tab.active').classList.remove('active');
        tab.classList.add('active');

        const category = tab.getAttribute('data-category');
        const filteredProducts = category === 'all' ? allProducts : allProducts.filter(product => product.category === category);
        displayProducts(filteredProducts);
    });
});
/*document.getElementById('wash').addEventListener('click', async () => {
    sendLogToMain('info', `워시 목록 ${JSON.stringify(orderList)}`);
    await orderApi.useWash(orderList); // 세척처리
});*/

document.getElementById('payment').addEventListener('click', async () => {

    let price = 0;
    orderList.map((order)=> {
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
        allProducts = allData.Items;
        isDataLoaded = true; // 데이터 로드 완료
        displayProducts(allProducts);
    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
    }
}
fetchData().then();  // 함수 호출