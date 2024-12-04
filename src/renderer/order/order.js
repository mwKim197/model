/////// 최초 전체 목록 조회해서 뿌리기, 여기서 주문 전송
const log = require("../../logger");
const menuApi = require('../api/menuApi');

menuApi.getMenuInfoAll().then((data) => {
    log.info(data)
});

// 메뉴 데이터
const allProducts = [
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
                    <p class="text-gray-600">${product.nameEn}</p>
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
    orderItem.className = 'order-item bg-gray-300 p-2 rounded-lg flex justify-between items-center w-[190px] min-h-32 h-32';
    orderItem.innerHTML = `
                <span>${product.name}</span>
                <button class="bg-red-500 text-white px-2 py-1 rounded-lg" onclick="removeItemFromOrder(this)">삭제</button>
            `;
    orderGrid.appendChild(orderItem);
}

// 주문된 아이템을 삭제하는 함수
function removeItemFromOrder(button) {
    const orderItem = button.closest('.order-item');
    orderItem.remove();
}

// 메뉴 탭 클릭 시 제품 필터링
document.querySelectorAll('.menu-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // 활성화된 탭 변경
        document.querySelector('.menu-tab.active').classList.remove('active');
        tab.classList.add('active');

        const category = tab.getAttribute('data-category');
        const filteredProducts = category === '전체메뉴' ? allProducts : allProducts.filter(product => product.category === category);
        displayProducts(filteredProducts);
    });
});

// 초기화: 전체 메뉴 표시
displayProducts(allProducts);
