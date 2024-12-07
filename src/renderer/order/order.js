/////// 최초 전체 목록 조회해서 뿌리기, 여기서 주문 전송
const log = require("../../logger");
const menuApi = require('../api/menuApi');
const orderApi = require('../api/orderApi');

let orderList = [];

// 메뉴 데이터
let allProducts = [
    { name: '아메리카노', nameEn: 'Americano', category: '커피', price: 2000,          image: 'https://placehold.co/200x300/png' },
    { name: '카페라떼', nameEn: 'Caffè Latte', category: '커피', price: 2500,         image: 'https://placehold.co/200x300/png' },
    { name: '레몬에이드', nameEn: 'Lemonade', category: '에이드', price: 3000,          image: 'https://placehold.co/200x300/png' },
    { name: '망고에이드', nameEn: 'Mango Lemonade', category: '에이드', price: 3500,    image: 'https://placehold.co/200x300/png' },
    { name: '녹차', nameEn: 'Green Tea', category: '티', price: 2000,            image: 'https://placehold.co/200x300/png' },
    { name: '홍차', nameEn: 'Black Tea', category: '티', price: 2200,            image: 'https://placehold.co/200x300/png' },
    { name: '콜라', nameEn: 'Coke', category: '기타음료', price: 1500,            image: 'https://placehold.co/200x300/png' },
    { name: '사이다', nameEn: 'Cider', category: '기타음료', price: 1500,         image: 'https://placehold.co/200x300/png' },
    { name: '아메리카노', nameEn: 'Americano', category: '커피', price: 2000,          image: 'https://placehold.co/200x300/png' },
    { name: '카페라떼', nameEn: 'Caffè Latte', category: '커피', price: 2500,         image: 'https://placehold.co/200x300/png' },
    { name: '레몬에이드', nameEn: 'Lemonade', category: '에이드', price: 3000,          image: 'https://placehold.co/200x300/png' },
    { name: '망고에이드', nameEn: 'Mango Lemonade', category: '에이드', price: 3500,    image: 'https://placehold.co/200x300/png' },
    { name: '녹차', nameEn: 'Green Tea', category: '티', price: 2000,            image: 'https://placehold.co/200x300/png' },
    { name: '홍차', nameEn: 'Black Tea', category: '티', price: 2200,            image: 'https://placehold.co/200x300/png' },
    { name: '콜라', nameEn: 'Coke', category: '기타음료', price: 1500,            image: 'https://placehold.co/200x300/png' },
    { name: '사이다', nameEn: 'Cider', category: '기타음료', price: 1500,         image: 'https://placehold.co/200x300/png' },
    { name: '아메리카노', nameEn: 'Americano', category: '커피', price: 2000,          image: 'https://placehold.co/200x300/png' },
    { name: '카페라떼', nameEn: 'Caffè Latte', category: '커피', price: 2500,         image: 'https://placehold.co/200x300/png' },
    { name: '레몬에이드', nameEn: 'Lemonade', category: '에이드', price: 3000,          image: 'https://placehold.co/200x300/png' },
    { name: '망고에이드', nameEn: 'Mango Lemonade', category: '에이드', price: 3500,    image: 'https://placehold.co/200x300/png' },
    { name: '녹차', nameEn: 'Green Tea', category: '티', price: 2000,            image: 'https://placehold.co/200x300/png' },
    { name: '홍차', nameEn: 'Black Tea', category: '티', price: 2200,            image: 'https://placehold.co/200x300/png' },
    { name: '콜라', nameEn: 'Coke', category: '기타음료', price: 1500,            image: 'https://placehold.co/200x300/png' },
    { name: '사이다', nameEn: 'Cider', category: '기타음료', price: 1500,         image: 'https://placehold.co/200x300/png' }
];

// Product Grid
const productGrid = document.getElementById('productGrid');
const orderGrid = document.getElementById('orderGrid');

// 필터된 제품을 표시하는 함수
function displayProducts(products) {
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
                    <button class="bg-blue-500 text-white p-2 rounded mt-2 " onclick="addItemToOrder('${product.name}')">주문하기</button>
                `;
        productGrid.appendChild(card);
    });
}

// 주문된 아이템을 오른쪽에 추가하는 함수
function addItemToOrder(itemName) {
    const product = allProducts.find(p => p.name === itemName);
    const orderItem = document.createElement('div');
    // 해당 아이템의 orderList에 추가
    const orderId = `${product.menuId}-${product.userId}`;  // 메뉴 ID와 userId로 고유한 주문 아이템 ID 생성
    orderList.push({ orderId, userId: product.userId, menuId: product.menuId, price: product.price, count: 1 });
    orderItem.className = 'order-item bg-gray-300 p-2 rounded-lg flex justify-between items-center w-[190px] min-h-32 h-32';
    orderItem.innerHTML = `
                <div class="border-2 border-gray-300 rounded-2xl">
                    <img src="https://placehold.co/200x300/png" alt="${product.name}" class="w-full mb-2">
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
                        <button class="bg-red-500 text-white px-2 py-1 rounded-lg" onclick="removeItemFromOrder(this)">삭제</button>  
                    </div>
                </div>
            `;
    orderGrid.appendChild(orderItem);

}

// 주문된 아이템을 삭제하는 함수
function removeItemFromOrder(button, orderId) {
    const orderItem = button.closest('.order-item');
    orderItem.remove();

    // orderList에서 해당 주문 삭제
    orderList = orderList.filter(order => order.orderId !== orderId);
}

// 수량을 업데이트하는 함수
function updateItemQuantity(button, change, orderId) {
    // 부모 요소에서 .quantity 찾기
    const quantityElement = button.parentElement.querySelector('.quantity');
    let currentQuantity = parseInt(quantityElement.textContent, 10);

    // 수량 변경 로직
    currentQuantity += change;

    // 수량이 1 미만이 되지 않도록 설정
    if (currentQuantity < 1) {
        alert("최소 수량은 1입니다.");
        currentQuantity = 1;
    }

    // 수량 업데이트
    quantityElement.textContent = currentQuantity;
    console.log(orderId);
    console.log(orderList);
    // orderList에서 해당 주문을 찾아 수량 업데이트
    const order = orderList.find(order => order.orderId === orderId);
    if (order) {
        order.count = currentQuantity;  // 수량 업데이트
    }
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

document.getElementById('payment').addEventListener('click', async () => {

    let price = 0;
    orderList.map((order)=> {
        price += Number(order.price) * order.count;  // 수량만큼 가격 계산
    })

    const result = await orderApi.reqVCAT_HTTP( price, "00");
    //const result = {success :true}

    if (result.success) {
        // 다음 단계로 진행
        console.log(orderList);
        await orderApi.reqOrder(orderList);

    } else {
        alert("결제에 실패하였습니다. 다시 시도해주세요.");
        console.error("결제 실패: ", result.message);
        // 결제 실패 처리
    }
});


// async 함수 안에서 await 사용
async function fetchData() {
    const allData = await menuApi.getMenuInfoAll();
    allProducts = allData.Items;
    displayProducts(allProducts);
}
fetchData().then();  // 함수 호출