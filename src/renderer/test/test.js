const container = document.querySelector('.container');
let touchStartEl = null;
let touchCloneEl = null;

// 터치 시작
container.addEventListener('touchstart', (e) => {
    touchStartEl = e.target;

    // 아이템이 아닌 곳 터치 시 무시
    if (!touchStartEl.classList.contains('item')) return;

    // 터치한 아이템 클론 생성
    touchCloneEl = touchStartEl.cloneNode(true);
    touchCloneEl.style.position = 'absolute';
    touchCloneEl.style.pointerEvents = 'none'; // 클론은 상호작용 방지
    touchCloneEl.style.opacity = '0.7';
    touchCloneEl.style.transform = 'translate(-50%, -50%)';
    touchCloneEl.style.zIndex = '1000';

    document.body.appendChild(touchCloneEl);

    // 초기 위치 설정
    const touch = e.touches[0];
    touchCloneEl.style.left = `${touch.clientX}px`;
    touchCloneEl.style.top = `${touch.clientY}px`;
});

// 터치 이동
container.addEventListener('touchmove', (e) => {
    if (!touchCloneEl) return;

    const touch = e.touches[0];
    touchCloneEl.style.left = `${touch.clientX}px`;
    touchCloneEl.style.top = `${touch.clientY}px`;
});

// 터치 종료
container.addEventListener('touchend', (e) => {
    if (!touchStartEl || !touchCloneEl) return;

    // 터치 종료 지점의 아이템 찾기
    const touch = e.changedTouches[0];
    const dropEl = document.elementFromPoint(touch.clientX, touch.clientY);

    if (dropEl && dropEl !== touchStartEl && dropEl.classList.contains('item')) {
        // 위치 교환
        swapItems(touchStartEl, dropEl);
        saveList(); // 리스트 저장
    }

    // 클론 제거
    document.body.removeChild(touchCloneEl);
    touchCloneEl = null;
    touchStartEl = null;
});

// 아이템 교체 함수
function swapItems(item1, item2) {
    const parent = item1.parentNode;
    const temp = document.createElement('div');
    parent.insertBefore(temp, item1);
    parent.insertBefore(item1, item2);
    parent.insertBefore(item2, temp);
    parent.removeChild(temp);
}

// 리스트 저장 함수
function saveList() {
    const items = document.querySelectorAll('.item');
    const itemOrder = Array.from(items).map(item => item.getAttribute('data-id'));

    console.log('저장된 리스트 순서:', itemOrder); // 현재 순서 출력
    localStorage.setItem('itemOrder', JSON.stringify(itemOrder)); // 로컬 스토리지에 저장
}

// 초기화: 로컬 스토리지에서 순서 불러오기
function loadList() {
    const storedOrder = localStorage.getItem('itemOrder');
    if (storedOrder) {
        const order = JSON.parse(storedOrder);
        order.forEach(id => {
            const item = document.querySelector(`.item[data-id="${id}"]`);
            container.appendChild(item);
        });
    }
}

// 페이지 로드 시 리스트 초기화
loadList();
