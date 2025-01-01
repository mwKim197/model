import {
    getUserData,
    getMenuInfoAll,
    callSerialAdminIceOrder,
    callSerialAdminCupOrder,
    callSerialAdminDrinkOrder,
    getOrdersByDateRange
} from '/renderer/api/menuApi.browser.js';

const url = window.location.hostname;
const userUrlPort = `http://${url}:3000`
let data;
let userInfo;

// 유저정보 START
document.addEventListener('DOMContentLoaded', async () => {
    try {
        userInfo = await getUserData();

        console.log('user Info:', userInfo);
        // 카테고리 데이터가 존재할 경우, select에 옵션 추가
        if (userInfo?.category && Array.isArray(userInfo.category)) {
            populateCategoryOptions(userInfo.category);
        } else {
            console.warn('Category data not found in user info.');
        }
    } catch (error) {
        console.error('Error fetching user info:', error);
    }
})
// 유저정보 END
// 메뉴 요청 START
// 컵 클릭 처리
window.handleCupClick = async function (menuId) {

    // 전체 데이터에서 해당 menuId의 데이터 추출
    const targetItem = data.Items.find((item) => item.menuId === parseInt(menuId));

    if (!targetItem) {
        console.error(`Item with menuId ${menuId} not found`);
        return;
    }

    if (!confirm(`[${targetItem.name}] 컵을 투출합니다`)) {
        return;
    }
    // 투출 처리
    try {
        await callSerialAdminCupOrder(targetItem);
    } catch (e) {
        alert(`[${targetItem.name}] 컵 투출에 실패했습니다.`);
    }
};

// 얼음 및 물 투출 처리
window.handleIceWaterClick = async function (menuId) {
    // 전체 데이터에서 해당 menuId의 데이터 추출
    const targetItem = data.Items.find((item) => item.menuId === parseInt(menuId));

    if (!targetItem) {
        console.error(`Item with menuId ${menuId} not found`);
        return;
    }

    if (!confirm(`[${targetItem.name}] 얼음과 물을 투출합니다.`)) {
        return;
    }

    try {
        // 얼음 투출 (iceYn이 "yes"일 경우)
        if (targetItem.iceYn === "yes") {
            await callSerialAdminIceOrder(targetItem); // 얼음 투출
        }

        alert(`[${targetItem.name}] 얼음 및 물 투출이 완료되었습니다.`);
    } catch (error) {
        console.error(`얼음 및 물 투출 중 오류 발생:`, error);
        alert(`[${targetItem.name}] 얼음 및 물 투출 중 오류가 발생했습니다.`);
    }
};

// 음료 투출 처리
window.handleDrinkClick = async function (menuId) {
    // 전체 데이터에서 해당 menuId의 데이터 추출
    const targetItem = data.Items.find((item) => item.menuId === parseInt(menuId));

    if (!targetItem) {
        console.error(`Item with menuId ${menuId} not found`);
        return;
    }

    if (!confirm(`[${targetItem.name}] 음료를 투출합니다.`)) {
        return;
    }

    try {
        await callSerialAdminDrinkOrder(targetItem);
        alert(`[${targetItem.name}] 음료 투출이 완료되었습니다.`);
    } catch (error) {
        console.error(`음료 투출 중 오류 발생:`, error);
        alert(`[${targetItem.name}] 음료 투출 중 오류가 발생했습니다.`);
    }
};

// API 호출 함수
window.callApi = async function (apiFunction, menuId, data) {
    try {
        const response = await apiFunction(menuId);
        if (response.status === 200) {
            const result = await response.json();
            console.log(`API 호출 성공:`, result);
            alert(`API 호출 성공! 데이터: ${JSON.stringify(result)}`);
        } else {
            console.error(`API 호출 실패: ${response.statusText}`);
            alert("API 호출 실패!");
        }
    } catch (error) {
        console.error("API 호출 중 오류 발생:", error);
        alert("API 호출 중 오류 발생!");
    }
}
// 메뉴 요청 END
// 메뉴 그리기 START
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 유저 정보 및 메뉴 데이터 가져오기
        userInfo = await getUserData(); // 유저 정보 가져오기
        data = await getMenuInfoAll(); // 메뉴 정보 가져오기
        const menuListContainer = document.getElementById("menu-list");

        if (!userInfo?.category) {
            console.error("카테고리 정보가 없습니다.");
            return;
        }

        if (Array.isArray(data?.Items)) {
            // `no` 순번으로 정렬
            const sortedData = data.Items.sort((a, b) => a.no - b.no);
            console.log(sortedData);
            // HTML 생성 및 삽입
            const menuHTML = sortedData.map(item =>
                createMenuHTML(item, userInfo.category)
            ).join('');
            menuListContainer.innerHTML = menuHTML;
        } else {
            console.warn('No menu items found.');
        }

        console.log('Menu Info:', data);
        console.log('User Info:', userInfo);
    } catch (error) {
        console.error('Error fetching menu info or user info:', error);
    }
});

// 이미지 설정
const convertToImageUrl = (localPath) => {
    if (!localPath) {
        return `${userUrlPort}/images/default.png`; // 기본 이미지 경로
    }
    const fileName = localPath.split('\\').pop(); // 파일 이름 추출
    return `${userUrlPort}/images/${fileName}`;
};
// 이미지 설정

// 반복적으로 메뉴 아이템 HTML 생성
const createMenuHTML = (menuData, categories) => {

    const imageUrl = convertToImageUrl(menuData.image); // 이미지 경로 변환

    // 카테고리 옵션 생성
    const categoryOptions = categories.map(category => {
        const isSelected = category.item === menuData.category ? 'selected' : '';
        return `<option value="${escapeHTML(category.item)}" ${isSelected}>${escapeHTML(category.name)}</option>`;
    }).join('');

    return `
    <div class="menu-new-item-wrapper overflow-x-auto">
        <div class="menu-new-item flex flex-col gap-6 p-4 sm:p-6 bg-gray-100 border border-gray-300 rounded-lg shadow-sm">
            <div class="menu-details flex flex-col gap-6 flex-1" data-menu-id="${menuData.menuId}">
                <div class="fixed-row grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    <div class="menu-image relative w-40 h-40 item flex flex-col bg-gray-200 border border-gray-300 rounded-md">
                        <img src="${escapeHTML(imageUrl)}" alt="이미지" class="w-full h-full object-cover rounded-lg hover:cursor-pointer">
                    </div>
                    <div class="item flex flex-col grid-cols-2 gap-2 bg-gray-200 border border-gray-300 rounded-md p-2">
                        <div>
                            <label for="no" class="text-sm text-gray-600">순번</label>
                            <input type="text" name="no" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${Number(escapeHTML(menuData.no?.toString() || 0))}" disabled />
                        </div>
                        <div>
                            <label for="name" class="text-sm text-gray-600">메뉴명</label>
                            <input type="text" name="name" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${escapeHTML(menuData.name || '')}" disabled>
                        </div>
                    </div>
                    <div class="item flex flex-col grid-cols-2 gap-2 bg-gray-200 border border-gray-300 rounded-md p-2">
                         <div>
                            <label for="category" class="text-sm text-gray-600">카테고리</label>
                            <select id="category-${menuData.menuId}" class="w-full border border-gray-400 rounded-md px-2 py-1" name="category" disabled>
                                ${categoryOptions}
                            </select>
                        </div>
                        <div>
                            <label for="price" class="text-sm text-gray-600">금액</label>
                            <input type="text" class="w-full border border-gray-400 rounded-md px-2 py-1" name="price" value="${escapeHTML(menuData.price?.toString() || '')}" disabled>
                        </div>
                    </div>
                     <div class="item flex flex-col grid-cols-2 gap-2 bg-gray-200 border border-gray-300 rounded-md p-2 cup-item" data-menu-id="${menuData.menuId}">
                        <div>
                            <label class="text-sm text-gray-600">컵</label>
                            <fieldset class="flex items-center gap-2">
                                <label for="cupPlastic" class="flex items-center gap-2">
                                    <input type="radio" name="cup-${menuData.menuId}" value="plastic" ${menuData.cup === 'plastic' ? 'checked' : ''} disabled>
                                    <span>플라스틱</span>
                                </label>
                                <label for="cupPaper" class="flex items-center gap-2">
                                    <input type="radio" name="cup-${menuData.menuId}" value="paper" ${menuData.cup === 'paper' ? 'checked' : ''} disabled>
                                    <span>종이컵</span>
                                </label>
                            </fieldset>
                        </div>
                        <div>
                            <label class="text-sm text-gray-600">얼음</label>
                            <fieldset class="flex items-center gap-2">
                                <label for="iceYes" class="flex items-center gap-2">
                                    <input type="radio" name="iceYn-${menuData.menuId}" value="yes" ${menuData.iceYn === 'yes' ? 'checked' : ''} disabled>
                                    <span>Yes</span>
                                </label>
                                <label for="iceNo" class="flex items-center gap-2">
                                    <input type="radio" name="iceYn-${menuData.menuId}" value="no" ${menuData.iceYn === 'no' ? 'checked' : ''} disabled>
                                    <span>No</span>
                                </label>
                            </fieldset>
                        </div>
                    </div>
                    <!-- 얼음 시간 및 물 시간 -->
                    <div class="item flex flex-col grid-cols-2 gap-2 bg-gray-200 border border-gray-300 rounded-md p-2">
                        <div>
                            <label for="iceTime-${menuData.menuId}" class="text-sm text-gray-600">얼음 시간</label>
                            <input type="number" name="iceTime" min="0" step="0.5" max="10" value="${menuData.iceTime || ''}" class="w-full border border-gray-400 rounded-md px-2 py-1" disabled>
                        </div>
                        <div>
                            <label for="waterTime-${menuData.menuId}" class="text-sm text-gray-600">물 시간</label>
                            <input type="number" name="waterTime" min="0" step="0.5" max="10" value="${menuData.waterTime || ''}" class="w-full border border-gray-400 rounded-md px-2 py-1" disabled>
                        </div>
                    </div>
                    <!-- 상태 -->
                    <div class="item flex flex-col bg-gray-200 border border-gray-300 rounded-md p-2">
                        <label class="text-sm text-gray-600">상태</label>
                        <fieldset class="flex flex-col gap-2">
                            <div class="flex items-center gap-2">
                                <label for="new-${menuData.menuId}" class="text-sm">New</label>
                                <select name="new" class="w-full border border-gray-400 rounded-md px-2 py-1" disabled>
                                    <option value="" ${!menuData.state?.new ? 'selected' : ''}>선택</option>
                                    <option value="new1" ${menuData.state?.new === 'new1' ? 'selected' : ''}>New1</option>
                                    <option value="new2" ${menuData.state?.new === 'new2' ? 'selected' : ''}>New2</option>
                                    <option value="new3" ${menuData.state?.new === 'new3' ? 'selected' : ''}>New3</option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2">
                                <label for="event-${menuData.menuId}" class="text-sm">Event</label>
                                <select name="event" class="w-full border border-gray-400 rounded-md px-2 py-1" disabled>
                                    <option value="" ${!menuData.state?.event ? 'selected' : ''}>선택</option>
                                    <option value="event1" ${menuData.state?.event === 'event1' ? 'selected' : ''}>Event1</option>
                                    <option value="event2" ${menuData.state?.event === 'event2' ? 'selected' : ''}>Event2</option>
                                    <option value="event3" ${menuData.state?.event === 'event3' ? 'selected' : ''}>Event3</option>
                                </select>
                            </div>
                            <div class="flex items-center gap-2">
                                <label for="best-${menuData.menuId}" class="text-sm">Best</label>
                                <select name="best" class="w-full border border-gray-400 rounded-md px-2 py-1" disabled>
                                    <option value="" ${!menuData.state?.best ? 'selected' : ''}>선택</option>
                                    <option value="best1" ${menuData.state?.best === 'best1' ? 'selected' : ''}>Best1</option>
                                    <option value="best2" ${menuData.state?.best === 'best2' ? 'selected' : ''}>Best2</option>
                                    <option value="best3" ${menuData.state?.best === 'best3' ? 'selected' : ''}>Best3</option>
                                </select>
                            </div>
                        </fieldset>
                    </div>
                    <!-- 품절 -->
                    <div class="item flex flex-col bg-gray-200 border border-gray-300 rounded-md p-2">
                        <label class="text-sm text-gray-600">empty</label>
                        <fieldset class="flex items-center gap-2">
                            <label for="emptyYes" class="flex items-center gap-2">
                                <input type="radio" id="emptyYes" name="empty-${menuData.menuId}" value="yes" ${menuData.empty === 'yes' ? 'checked' : ''} disabled>
                                <span>Yes</span>
                            </label>
                            <label for="emptyNo" class="flex items-center gap-2">
                                <input type="radio" id="emptyNo" name="empty-${menuData.menuId}" value="no" ${menuData.empty === 'no' ? 'checked' : ''} disabled>
                                <span>No</span>
                            </label>
                        </fieldset>
                    </div>
                    <div class="item flex flex-col grid-cols-2 gap-2 bg-gray-200 border border-gray-300 rounded-md p-2">
                        <!-- 삭제 버튼 -->
                        <button
                            id="deleteItemBtn-${menuData.menuId}"
                            class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
                            data-user-id="${menuData.userId}"
                            data-menu-id="${menuData.menuId}">
                            삭제
                        </button>
                        <button
                            id="itemUpdateBtn-${menuData.menuId}"
                            class="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                            onclick="handleUpdateClick(${menuData.menuId})">
                            수정
                        </button>
                    </div>
                    <div class="item flex flex-col grid-cols-2 gap-2 bg-gray-200 border border-gray-300 rounded-md p-2">
                        <!-- 삭제 버튼 -->
                        <button
                            id="itemCupBtn-${menuData.menuId}"
                            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                            onclick="handleCupClick(${menuData.menuId})">
                            컵 투출
                        </button>
                        <button
                            id="itemIceAndWaterBtn-${menuData.menuId}"
                            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                            onclick="handleIceWaterClick(${menuData.menuId})">
                            얼음 투출
                        </button>
                        <button
                            id="itemDrinkBtn-${menuData.menuId}"
                            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                            onclick="handleDrinkClick(${menuData.menuId})">
                            음료 투출
                        </button>
                    </div>
                </div>

                <div class="items-list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-4">
                    ${menuData.items?.map(item => `
                    <fieldset class="menu-item bg-gray-200 border border-gray-300 rounded-md p-2">
                        <legend class="text-sm font-semibold mb-2">항목 ${escapeHTML(item.index?.toString() || '')}</legend>
                        
                        <!-- 타입 선택 -->
                        <div>
                            <label for="itemType-${item.index}" class="text-sm text-gray-600">타입</label>
                            <select id="itemType-${item.index}" name="itemType-${item.index}" class="w-full border border-gray-400 rounded-md px-2 py-1 itemTypeSelector" disabled>
                                <option value="" ${item.type === "" ? "selected" : ""} hidden>선택</option>
                                <option value="coffee" ${item.type === "coffee" ? "selected" : ""}>커피</option>
                                <option value="garucha" ${item.type === "garucha" ? "selected" : ""}>가루차</option>
                                <option value="syrup" ${item.type === "syrup" ? "selected" : ""}>시럽</option>
                            </select>
                        </div>
                
                        <!-- 타입에 따른 입력 필드 -->
                        ${item.type === "coffee" ? `
                            <div>
                                <label class="text-sm text-gray-600">글라인더1</label>
                                <input type="text" value="${escapeHTML(item.value1 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value1" readonly>
                            </div>
                            <div>
                                <label class="text-sm text-gray-600">글라인더2</label>
                                <input type="text" value="${escapeHTML(item.value2 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value2" readonly>
                            </div>
                            <div>
                                <label class="text-sm text-gray-600">추출량</label>
                                <input type="text" value="${escapeHTML(item.value3 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value3" readonly>
                            </div>
                            <div>
                                <label class="text-sm text-gray-600">핫워터</label>
                                <input type="text" value="${escapeHTML(item.value4 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value4" readonly>
                            </div>
                        ` : item.type === "garucha" ? `
                            <div>
                                <label class="text-sm text-gray-600">차종류</label>
                                <input type="text" value="${escapeHTML(item.value1 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value1" readonly>
                            </div>
                            <div>
                                <label class="text-sm text-gray-600">추출시간</label>
                                <input type="text" value="${escapeHTML(item.value2 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value2" readonly>
                            </div>
                            <div>
                                <label class="text-sm text-gray-600">핫워터</label>
                                <input type="text" value="${escapeHTML(item.value3 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value3" readonly>
                            </div>
                        ` : item.type === "syrup" ? `
                            <div>
                                <label class="text-sm text-gray-600">시럽종류</label>
                                <input type="text" value="${escapeHTML(item.value1 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value1" readonly>
                            </div>
                            <div>
                                <label class="text-sm text-gray-600">펌프시간</label>
                                <input type="text" value="${escapeHTML(item.value2 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value2" readonly>
                            </div>
                            <div>
                                <label class="text-sm text-gray-600">핫워터</label>
                                <input type="text" value="${escapeHTML(item.value3 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value3" readonly>
                            </div>
                            <div>
                                <label class="text-sm text-gray-600">탄산수</label>
                                <input type="text" value="${escapeHTML(item.value4 || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" data-key="value4" readonly>
                            </div>
                        ` : `
                            <div>
                                <span class="text-sm text-gray-600">Unknown Type</span>
                            </div>
                        `}
                    </fieldset>
                `).join('')}
                </div>
            </div>
        </div>
    </div>`;
};
// 메뉴그리기 END

/* [MENU SET] 등록 메뉴 조회 START */
/* [MENU SET] 등록 메뉴 삭제 버튼 START */
document.addEventListener('click', async (event) => {
    // 클릭한 요소가 삭제 버튼인지 확인
    if (event.target.matches('button[id^="deleteItemBtn"]')) {
        const userId = event.target.getAttribute('data-user-id');
        const menuId = event.target.getAttribute('data-menu-id');

        if (userId && menuId) {
            try {

                // API 요청
                const response = await fetch(`http://${url}:3000/delete-menu`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json', // JSON 데이터임을 명시
                    },
                    body: JSON.stringify({
                        userId: userId,
                        menuId: menuId,
                    })
                });

                const result = await response.json();
                if (result.success) {
                    console.log('삭제 성공:', result.data);
                    alert('삭제 성공');
                    location.reload();
                    // 삭제 완료 후 UI 업데이트 로직 추가
                } else {
                    console.error('삭제 실패:', result.message);
                    alert('삭제 실패: ' + result.message);
                }
            } catch (error) {
                console.error('삭제 중 오류:', error);
                alert('삭제 중 오류 발생');
            }
        }
    }
});
/* [MENU SET] 등록 메뉴 삭제 버튼 END */
/* [MENU SET] 등록 메뉴 조회 END */



/* [MENU SET] 등록 START */
/* [MENU SET] 등록 IMAGE START */

// tab2 DOM 요소 기준
const tab2 = document.getElementById('tab2');
console.log(tab2);
// 이미지 클릭 시 input 트리거
const imagePreview = tab2.querySelector('#imagePreview');
const fileInput = tab2.querySelector('#fileInput');

imagePreview.addEventListener('click', () => {
    fileInput.click();
});

function handleImageUpload(fileInput, imagePreview) {
    const file = fileInput.files[0];
    const maxFileSize = 2 * 1024 * 1024; // 파일 크기 제한: 2MB

    if (file) {
        if (file.size > maxFileSize) {
            alert('파일 크기는 2MB를 초과할 수 없습니다.');
            fileInput.value = ''; // 파일 선택 취소
            return;
        }

        const imgUrl = URL.createObjectURL(file);
        const imgElement = new Image();

        imgElement.src = imgUrl;

        imgElement.onload = () => {
            const { width, height } = imgElement;

            if (width > 600 || height > 600) {
                alert('이미지 크기는 600x600 이하로 제한됩니다.');
                fileInput.value = ''; // 파일 선택 취소
            } else {
                imagePreview.src = imgUrl; // 제한 통과 시 이미지 표시
            }
        };
    }
}

fileInput.addEventListener('change', (event) => {
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    handleImageUpload(fileInput, imagePreview);
});

const selectElements = tab2.querySelectorAll('select');
const newImage = tab2.querySelector('#newImage');
const eventImage = tab2.querySelector('#eventImage');
const bestImage = tab2.querySelector('#bestImage');

// 이미지 매핑
const imageMap = {
    new1:   '../../assets/basicImage/new1.png', // new1   이미지 URL
    new2:   '../../assets/basicImage/new2.png', // new2   이미지 URL
    new3:   '../../assets/basicImage/new3.png', // new3   이미지 URL
    event1: '../../assets/basicImage/event1.png', // event1 이미지 URL
    event2: '../../assets/basicImage/event2.png', // event2 이미지 URL
    event3: '../../assets/basicImage/event3.png', // event3 이미지 URL
    best1:  '../../assets/basicImage/best1.png', // best1  이미지 URL
    best2:  '../../assets/basicImage/best2.png', // best2  이미지 URL
    best3:  '../../assets/basicImage/best3.png'  // best3  이미지 URL
};

// 이벤트 리스너 등록
selectElements.forEach(select => {
    select.addEventListener('change', (event) => {
        const selectedValue = event.target.value;

        if (event.target.id === 'new') {
            newImage.src = imageMap[selectedValue] || '';
            newImage.classList.toggle('hidden', !imageMap[selectedValue]);
        } else if (event.target.id === 'event') {
            eventImage.src = imageMap[selectedValue] || '';
            eventImage.classList.toggle('hidden', !imageMap[selectedValue]);
        } else if (event.target.id === 'best') {
            bestImage.src = imageMap[selectedValue] || '';
            bestImage.classList.toggle('hidden', !imageMap[selectedValue]);
        }
    });
});
/* [MENU SET] 등록 IMAGE END */
/* [MENU SET] 등록 ITEM 추가, 삭제 START */
// 신규 등록 시작
let itemCounter = 0; // 항목 번호를 위한 변수

document.getElementById('addItemBtn').addEventListener('click', () => {
    // 순번 증가
    itemCounter++;

    // 새로운 항목 생성
    const newFieldset = document.createElement('fieldset');
    newFieldset.id = `item${itemCounter}`;
    newFieldset.className = 'new-item flex flex-wrap gap-0.5 p-2 bg-gray-200 border border-gray-300 rounded-md shadow-sm w-52';

    // 새 항목의 HTML 템플릿
    newFieldset.innerHTML = `
    <legend class="text-sm font-semibold mb-2">${itemCounter}항목</legend>
    <div class="menu-details grid grid-cols-2 gap-4 w-full">
        <!-- 타입 선택 -->
        <div>
            <label for="itemType${itemCounter}" class="text-sm text-gray-600">타입</label>
            <select id="itemType${itemCounter}" name="itemType${itemCounter}" class="w-full border border-gray-400 rounded-md px-2 py-1 itemTypeSelector">
                <option value="" selected disabled hidden>선택</option>
                <option value="coffee">커피</option>
                <option value="garucha">가루차</option>
                <option value="syrup">시럽</option>
            </select>
        </div>

        <!-- 삭제 버튼 -->
        <div class="flex items-center justify-end">
            <button type="button" class="deleteItemBtn bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600">
                삭제
            </button>
        </div>
    </div>

    <!-- 동적으로 변경될 필드 -->
    <div id="dynamicFields${itemCounter}" class="dynamic-fields grid grid-cols-2 gap-4 w-full mt-4">
    </div>
    `;

    // 버튼 앞에 새 항목 삽입
    const itemContainer = document.getElementById('itemContainer');
    const bitContainer = document.getElementById('bitContainer');
    itemContainer.insertBefore(newFieldset, bitContainer);

    // select의 change 이벤트 등록
    const selectElement = newFieldset.querySelector(`#itemType${itemCounter}`);
    selectElement.addEventListener('change', ((currentItemId) => {
        return (event) => {
            updateItemFields(currentItemId, event.target.value);
        };
    })(itemCounter));
});

// 삭제 버튼 이벤트 리스너 추가
document.getElementById('itemContainer').addEventListener('click', (event) => {
    if (event.target.classList.contains('deleteItemBtn')) {
        const fieldset = event.target.closest('fieldset');
        fieldset.remove();
    }
});

// 삭제 버튼 이벤트 리스너 추가
document.getElementById('itemContainer').addEventListener('click', (event) => {
    if (event.target.classList.contains('deleteItemBtn')) {
        const fieldset = event.target.closest('fieldset');
        fieldset.remove();
    }
});
/* [MENU SET] 등록 ITEM 추가, 삭제 END */

/* [MENU SET] 등록 ITEM 동적 등록 START */
// 선택값에 따라 필드 업데이트
function updateItemFields(itemId, selectedType, values = {}) {
    const dynamicFields = document.getElementById(`dynamicFields${itemId}`);

    // 동적 필드 내용 설정
    let newFieldsHTML = '';
    if (selectedType === 'coffee') {
        newFieldsHTML = `
            <div>
                <label for="value1-${itemId}" class="text-sm text-gray-600">글라인더1</label>
                <input type="number" id="value1-${itemId}" name="value1-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value1 || 0}" max="10">
            </div>
            <div>
                <label for="value2-${itemId}" class="text-sm text-gray-600">글라인더2</label>
                <input type="number" id="value2-${itemId}" name="value2-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value2 || 0}" max="10">
            </div>
            <div>
                <label for="value3-${itemId}" class="text-sm text-gray-600">추출량</label>
                <input type="number" id="value3-${itemId}" name="value3-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value3 || 0}" max="100" />
            </div>
            <div>
                <label for="value4-${itemId}" class="text-sm text-gray-600">핫워터</label>
                <input type="number" id="value4-${itemId}" name="value4-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value4 || 0}" max="200">
            </div>`;
    } else if (selectedType === 'garucha') {
        newFieldsHTML = `
            <div>
                <label for="value1-${itemId}" class="text-sm text-gray-600">차 종류</label>
                <input type="number" id="value1-${itemId}" name="value1-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value1 || 0}" min="1" max="6">
            </div>
            <div>
                <label for="value2-${itemId}" class="text-sm text-gray-600">추출 시간</label>
                <input type="number" id="value2-${itemId}" name="value2-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value2 || 0}" max="100">
            </div>
            <div>
                <label for="value3-${itemId}" class="text-sm text-gray-600">핫워터</label>
                <input type="number" id="value3-${itemId}" name="value3-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value3 || 0}" max="200">
            </div>`;
    } else if (selectedType === 'syrup') {
        newFieldsHTML = `
            <div>
                <label for="value1-${itemId}" class="text-sm text-gray-600">시럽 종류</label>
                <input type="text" id="value1-${itemId}" name="value1-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value1 || ''}" min="1" max="6">
            </div>
            <div>
                <label for="value2-${itemId}" class="text-sm text-gray-600">펌프 시간</label>
                <input type="number" id="value2-${itemId}" name="value2-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value2 || 0}" max="10">
            </div>
            <div>
                <label for="value3-${itemId}" class="text-sm text-gray-600">핫워터</label>
                <input type="number" id="value3-${itemId}" name="value3-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value3 || 0}" max="100">
            </div>
            <div>
                <label for="value4-${itemId}" class="text-sm text-gray-600">탄산수</label>
                <input type="number" id="value4-${itemId}" name="value4-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value4 || 0}" max="100">
            </div>`;
    }

    // 기존 필드를 새로 생성된 내용으로 대체
    dynamicFields.innerHTML = newFieldsHTML;
}

/* [MENU SET] 등록 ITEM 동적 등록 END */
/* [MENU SET] 등록 버튼 START */
tab2.querySelector('#saveItemBtn').addEventListener('click', async () => {
    const fileInput = tab2.querySelector('#fileInput');

    // 메인 메뉴 데이터 수집
    const menuData = {
        no: Number(tab2.querySelector('#no').value) || 0,
        name: tab2.querySelector('#name').value || '',
        category: tab2.querySelector('#category').value || '',
        price: tab2.querySelector('#price').value || '0',
        cup: tab2.querySelector('input[name="cup"]:checked')?.value || '',
        iceYn: tab2.querySelector('input[name="iceYn"]:checked')?.value || '',
        empty: tab2.querySelector('input[name="empty"]:checked')?.value || 'no',
        iceTime: tab2.querySelector('#iceTime').value || '0',
        waterTime: tab2.querySelector('#waterTime').value || '0',
        state: {
            new: tab2.querySelector('#new').value || '',
            best: tab2.querySelector('#best').value || '',
            event: tab2.querySelector('#event').value || ''
        },
        items: [],
        image: "" // 임시 이미지 URL
    };

    // items 데이터 수집
    let itemCounter = 0; // 항목 번호를 위한 카운터
    tab2.querySelectorAll('#itemContainer fieldset').forEach((fieldset) => {
        itemCounter++;

        const itemType = fieldset.querySelector('select')?.value || '';
        const value1 = fieldset.querySelector('[name*="value1"]')?.value || '0';
        const value2 = fieldset.querySelector('[name*="value2"]')?.value || '0';
        const value3 = fieldset.querySelector('[name*="value3"]')?.value || '0';
        const value4 = fieldset.querySelector('[name*="value4"]')?.value || '0';

        const itemData = {
            no: itemCounter,
            type: itemType,
            value1,
            value2,
            value3,
            value4
        };

        menuData.items.push(itemData); // items 배열에 추가
    });

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);
        formData.append('menuData', JSON.stringify(menuData));
        console.log(JSON.stringify(menuData));
        try {
            const response = await fetch(`http://${url}:3000/set-admin-menu-info`, {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();
            if (result.success) {
                console.log('업로드 성공:', result.data);
                alert("업로드 성공");
                location.reload();
            } else {
                console.error('업로드 실패:', result.message);
                alert('업로드 실패: '+ result.message);
            }
        } catch (error) {
            console.error('업로드 중 오류:', error);
            alert('업로드 중 오류: '+ error);
        }
    } else {
        alert('이미지를 선택해주세요.');
    }
});
/* [MENU SET] 등록 버튼 END */
/* [MENU UPDATE] 수정 버튼 START */
window.handleUpdateClick = function (menuId) {
    // 탭 전환
    switchTab('tab2');

    // 기존 등록 버튼 숨기기
    const saveButton = tab2.querySelector('#saveItemBtn');
    saveButton.classList.add('hidden');

    // menuId로 전역 데이터에서 해당 메뉴 찾기
    const menuItem = data.Items.find(item => item.menuId === menuId);
    if (!menuItem) {
        console.error("해당 메뉴를 찾을 수 없습니다.");
        return;
    }

    // 2번 탭의 필드에 데이터 설정
    document.getElementById('no').value = menuItem.no; // 순번 추가
    document.getElementById('name').value = menuItem.name;
    document.getElementById('category').value = menuItem.category || "all";
    document.getElementById('price').value = menuItem.price;
    document.getElementById('iceTime').value = menuItem.iceTime;
    document.getElementById('waterTime').value = menuItem.waterTime;

    // 컵과 얼음 상태 설정
    document.querySelector(`#cup${menuItem.cup === "plastic" ? "Plastic" : "Paper"}`).checked = true;
    document.querySelector(`#ice${menuItem.iceYn === "yes" ? "Yes" : "No"}`).checked = true;

    // 상태 정보 설정
    document.getElementById('new').value = menuItem.state.new;
    document.getElementById('event').value = menuItem.state.event;
    document.getElementById('best').value = menuItem.state.best;

    // 이미지 설정
    const imagePreview = document.getElementById('imagePreview');
    const fileInput = document.getElementById('fileInput');
    const defaultImage = '../../assets/basicImage/300x300.png';

    // 메뉴의 이미지 설정
    imagePreview.src = menuItem.image ? convertToImageUrl(escapeHTML(menuItem.image)) : defaultImage;

    // 파일 업로드 이벤트 등록 (수정 시에도 재사용)
    fileInput.addEventListener('change', () => handleImageUpload(fileInput, imagePreview));

    // 동적으로 생성된 items 데이터 채우기
    populateDynamicItems(menuItem.items);

    // 수정 버튼 생성
    let updateButton = tab2.querySelector('#updateItemBtn');
    if (!updateButton) {
        updateButton = document.createElement('button');
        updateButton.id = 'updateItemBtn';
        updateButton.textContent = '수정';
        updateButton.className = 'bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 mt-4';
        saveButton.parentElement.appendChild(updateButton);
    }

    // 수정 버튼 클릭 이벤트
    updateButton.addEventListener('click', async () => {
        const menuData = collectFormData(menuId); // 데이터 수집
        console.log(menuData);
        const fileInput = document.getElementById('fileInput'); // 이미지 파일 input
        const formData = new FormData();

        // 메뉴 데이터를 FormData에 추가
        formData.append('menuData', JSON.stringify(menuData));

        // 이미지 파일이 선택된 경우 추가
        if (fileInput.files.length > 0) {
            formData.append('image', fileInput.files[0]);
        }

        try {
            const response = await fetch(`http://${url}:3000/set-menu-update-info`, {
                method: 'PUT', // POST를 사용하여 업데이트 요청
                body: formData, // FormData로 전송
            });

            const result = await response.json();
            if (result.success) {
                alert("수정 성공");
                location.reload();
            } else {
                alert('수정 실패: ' + result.message);
            }
        } catch (error) {
            alert('수정 중 오류: ' + error);
        }
    });
    console.log("탭으로 데이터 전송 완료: ", menuItem);
};

// 동적으로 생성된 items 채우기 함수
function populateDynamicItems(items) {
    const itemContainer = document.getElementById('itemContainer');
    const bitContainer = document.getElementById('bitContainer');

    // 기존 동적 항목 삭제
    itemContainer.querySelectorAll('fieldset').forEach(fieldset => {
        if (fieldset !== bitContainer) {
            fieldset.remove();
        }
    });

    // 항목 번호 초기화
    itemCounter = 0;

    // items 배열을 순회하며 필드 생성
    items.forEach(item => {
        itemCounter++; // 항목 번호 증가

        // 새로운 항목 생성
        const newFieldset = document.createElement('fieldset');
        newFieldset.id = `item${itemCounter}`;
        newFieldset.className = 'new-item flex flex-wrap gap-0.5 p-2 bg-gray-200 border border-gray-300 rounded-md shadow-sm w-52';

        newFieldset.innerHTML = `
            <legend class="text-sm font-semibold mb-2">${itemCounter}항목</legend>
            <div class="menu-details grid grid-cols-2 gap-4 w-full">
                <div>
                    <label for="itemType${itemCounter}" class="text-sm text-gray-600">타입</label>
                    <select id="itemType${itemCounter}" name="itemType${itemCounter}" class="w-full border border-gray-400 rounded-md px-2 py-1 itemTypeSelector">
                        <option value="" disabled hidden>선택</option>
                        <option value="coffee" ${item.type === "coffee" ? "selected" : ""}>커피</option>
                        <option value="garucha" ${item.type === "garucha" ? "selected" : ""}>가루차</option>
                        <option value="syrup" ${item.type === "syrup" ? "selected" : ""}>시럽</option>
                    </select>
                </div>
                <div class="flex items-center justify-end">
                    <button type="button" class="deleteItemBtn bg-red-500 text-white px-3 py-2 rounded-md hover:bg-red-600">
                        삭제
                    </button>
                </div>
            </div>
            <div id="dynamicFields${itemCounter}" class="dynamic-fields grid grid-cols-2 gap-4 w-full mt-4"></div>
        `;

        // 버튼 앞에 새 항목 삽입
        itemContainer.insertBefore(newFieldset, bitContainer);

        // 동적 필드 업데이트
        updateItemFields(itemCounter, item.type, item);

        // select의 change 이벤트 등록
        const selectElement = newFieldset.querySelector(`#itemType${itemCounter}`);
        selectElement.addEventListener('change', ((currentItemId) => {
            return (event) => {
                updateItemFields(currentItemId, event.target.value);
            };
        })(itemCounter));
    });
}

// 데이터 수집
function collectFormData(menuId) {
    return {
        menuId: menuId,
        image: document.getElementById('imagePreview').src,
        no: parseInt(document.getElementById('no').value, 10),
        name: document.getElementById('name').value,
        category: document.getElementById('category').value,
        price: parseFloat(document.getElementById('price').value),
        iceTime: parseFloat(document.getElementById('iceTime').value),
        waterTime: parseFloat(document.getElementById('waterTime').value),
        empty: document.querySelector('input[name="empty"]:checked')?.value || 'no',
        cup: document.querySelector('input[name="cup"]:checked').value,
        iceYn: document.querySelector('input[name="iceYn"]:checked').value,
        state: {
            new: document.getElementById('new').value,
            event: document.getElementById('event').value,
            best: document.getElementById('best').value,
        },
        items: collectDynamicItems(), // 동적 필드 데이터 수집
    };
}

function collectDynamicItems() {
    const items = [];
    tab2.querySelectorAll('.new-item').forEach(fieldset => {
        console.log(fieldset);
        const itemType = fieldset.querySelector('.itemTypeSelector').value;
        if (itemType) {
            const item = {
                type: itemType,
                value1: fieldset.querySelector('[name^="value1"]').value || 0,
                value2: fieldset.querySelector('[name^="value2"]').value || 0,
                value3: fieldset.querySelector('[name^="value3"]').value || 0,
                value4: fieldset.querySelector('[name^="value4"]')?.value || 0, // value4가 없는 경우도 처리
            };
            items.push(item);
        }
    });
    return items;
}
/* [MENU UPDATE] 수정 버튼 END */
/* [MENU SET] 등록 END */

/* [MENU] 카테고리 START*/
// 카테고리 옵션 추가 함수
function populateCategoryOptions(categories) {
    // 모든 select 요소를 가져옴
    const selectElements = document.querySelectorAll('select[name="Category"]');
    // 각 select 요소에 옵션 추가
    selectElements.forEach(selectElement => {
        // 기존 옵션 삭제
        selectElement.innerHTML = '';

        // 새로운 옵션 추가
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.item;
            option.textContent = category.name;
            selectElement.appendChild(option);
        });

        // 기본 선택값 설정
        const menuId = selectElement.id.split('-')[1]; // select ID에서 menuId 추출
        const menuItem = data.Items.find(item => item.menuId === parseInt(menuId));
        if (menuItem && menuItem.category) {
            selectElement.value = menuItem.category;
        }
    });
}
/* [MENU] 카테고리 END*/
/* [CONTROL] 머신 조작 START */
// 탭 등록함수
document.addEventListener('DOMContentLoaded', async () => {
    // 오늘 날짜 계산
    const now = new Date();
    const kstTimestamp = new Date(now.getTime() + 9 * 60 * 60 * 1000) // UTC + 9 시간 추가
    const todayStart = new Date(kstTimestamp.setHours(0, 0, 0, 0)).toISOString().slice(0, 16); // 오늘 00:00
    const todayEnd = new Date(kstTimestamp.setHours(23, 59, 59, 999)).toISOString().slice(0, 16); // 오늘 23:59

   await renderGroupedOrdersToHTML(todayStart, todayEnd, true);
});

// 날짜 지정 조회
document.getElementById('filter-orders-btn').addEventListener('click', async () => {
    const startDateValue = document.getElementById('start-date').value;
    const endDateValue = document.getElementById('end-date').value;
    const ascending = document.getElementById('sort-order').value === "true";

    if (!startDateValue || !endDateValue) {
        alert('시작 날짜와 종료 날짜를 입력해주세요.');
        return;
    }

    // 시작일 및 종료일에 시간 추가
    const startDateTime = `${startDateValue}T00:00:00Z`; // 시작일 00:00
    const endDateTime = `${endDateValue}T23:59:59Z`; // 종료일 23:59

    console.log(`조회 시작일: ${startDateTime}, 조회 종료일: ${endDateTime}, 정렬: ${ascending}`);

    // 주문 데이터 조회 및 렌더링
    await renderGroupedOrdersToHTML(startDateTime, endDateTime, ascending);
});

// 주문 내역 랜더링
async function renderGroupedOrdersToHTML(startDate, endDate, ascending = true) {
    console.log('정렬 옵션 전달:', ascending); // true 또는 false인지 확인
    console.log('정렬 옵션 전달:', typeof ascending); // true 또는 false인지 확인
    // DynamoDB에서 주문 데이터 조회
    const orders = await getOrdersByDateRange(startDate, endDate, ascending);

    // HTML 컨테이너 선택
    const container = document.getElementById('orders-container');

    // 이전 데이터 제거
    container.innerHTML = '';

    // 데이터가 없을 경우 메시지 표시
    if (orders.length === 0) {
        container.innerHTML = '<p class="text-gray-500">조회된 주문이 없습니다.</p>';
        return;
    }

    // 주문 데이터를 그룹화
    const groupedOrders = groupOrdersByTime(orders);

    // 그룹별로 HTML 생성
    Object.keys(groupedOrders).forEach(orderTime => {
        const group = groupedOrders[orderTime];
        // 날짜와 시간을 보기 좋게 포맷 (T 제거)
        const formattedTime = orderTime.replace('T', ' '); // "YYYY-MM-DDTHH:mm" -> "YYYY-MM-DD HH:mm"


        // 그룹 컨테이너 생성
        const groupBlock = document.createElement('div');
        groupBlock.className = 'group-item p-4 bg-white border border-gray-200 rounded-lg shadow mb-4';

        // 그룹 제목 및 총 금액
        const groupTitle = document.createElement('h2');
        groupTitle.className = 'text-lg font-bold text-gray-800 mb-2';
        groupTitle.textContent = `주문 시간: ${formattedTime} | 총 금액: ${group.totalAmount}원`;
        groupBlock.appendChild(groupTitle);

        // 테이블 생성
        const table = document.createElement('table');
        table.className = 'table-auto w-full border-collapse border border-gray-300';

        // 테이블 헤더 생성
        table.innerHTML = `
            <thead>
                <tr class="bg-gray-100">
                    <th class="px-4 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-600">메뉴</th>
                    <th class="px-4 py-2 border border-gray-300 text-center text-sm font-semibold text-gray-600">수량</th>
                    <th class="px-4 py-2 border border-gray-300 text-right text-sm font-semibold text-gray-600">가격</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        // 테이블 바디에 주문 항목 추가
        const tbody = table.querySelector('tbody');
        group.orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-4 py-2 border border-gray-300 text-gray-600 text-sm">${order.name}</td>
                <td class="px-4 py-2 border border-gray-300 text-center text-gray-600 text-sm">${order.count}</td>
                <td class="px-4 py-2 border border-gray-300 text-right text-gray-600 text-sm">${order.price}원</td>
            `;
            tbody.appendChild(row);
        });

        // 그룹 컨테이너에 테이블 추가
        groupBlock.appendChild(table);

        // 생성된 그룹 블록을 메인 컨테이너에 추가
        container.appendChild(groupBlock);
    });
}

/**
 * 주문 데이터를 그룹화하고 그룹별 총 금액 계산
 * @param {Array} orders - DynamoDB에서 조회된 주문 데이터
 * @returns {Object} - 그룹화된 데이터와 그룹별 총 금액
 */
function groupOrdersByTime(orders) {
    return orders.reduce((groups, order) => {
        // 주문 시간 (분 단위)
        const orderTime = order.timestamp.slice(0, 16); // "YYYY-MM-DDTHH:mm"

        // 그룹이 존재하지 않으면 초기화
        if (!groups[orderTime]) {
            groups[orderTime] = { totalAmount: 0, orders: [] };
        }

        // 주문의 총 금액 계산 (price * count)
        const orderTotal = order.price * order.count;

        // 그룹에 주문 추가
        groups[orderTime].orders.push(order);

        // 그룹의 총 금액 업데이트
        groups[orderTime].totalAmount += orderTotal;

        return groups;
    }, {});
}
/* [CONTROL] 머신 조작 END */
// HTML 특수 문자 이스케이프 처리 함수
function escapeHTML(string) {
    const entityMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '/': '&#x2F;',
    };
    return String(string).replace(/[&<>"'/]/g, (s) => entityMap[s]);
}

/* 텝 컨트롤 START */
// 탭 전환 함수
const switchTab = (targetTabId) => {
    // 모든 탭 내용 숨김
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
    });

    // 선택된 탭 내용 표시
    document.getElementById(targetTabId).classList.remove('hidden');

    // 탭 버튼 액티브 상태 관리
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.classList.remove('text-blue-500', 'border-blue-500'); // 기존 활성화 스타일 제거
        button.classList.add('text-gray-600', 'border-transparent'); // 기본 스타일 추가
    });

    // 선택된 탭 버튼 활성화 스타일 추가
    document.querySelector(`.tab-btn[data-tab="${targetTabId}"]`).classList.add('text-blue-500', 'border-blue-500');
};

// 탭 등록함수
document.addEventListener('DOMContentLoaded', () => {
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');

            // 모든 탭과 패널 초기화
            tabs.forEach(t => t.classList.remove('text-blue-500', 'border-blue-500'));
            panels.forEach(panel => panel.classList.add('hidden'));

            // 선택된 탭과 패널 활성화
            tab.classList.add('text-blue-500', 'border-blue-500');
            document.getElementById(target).classList.remove('hidden');
        });
    });

    // 첫 번째 탭 활성화
    tabs[0].click();
});
/* 텝 컨트롤 END */
