import {
    adminUseWash,
    calculateSalesStatistics,
    callSerialAdminCupOrder,
    callSerialAdminDrinkOrder,
    callSerialAdminIceOrder,
    fetchAndSaveUserInfo,
    fetchCupPaUse,
    fetchCupPlUse,
    getMenuInfoAll,
    getOrdersByDateRange,
    getUserData,
    requestAppRestart,
    requestAppShutdown,
    updateUserInfo
} from '/renderer/api/menuApi.browser.js';

const url = window.location.hostname;
const userUrlPort = `http://${url}:3142`
let data;
let userInfo;

// 유저정보 START
document.addEventListener('DOMContentLoaded', async () => {
    try {
        userInfo = await getUserData();

        // 카테고리 데이터가 존재할 경우, select에 옵션 추가
        if (userInfo?.category && Array.isArray(userInfo.category)) {
            populateCategoryOptions(userInfo.category);

            document.getElementById('time-input').value = userInfo.washTime;
            document.getElementById('limit-input').value = userInfo.limitCount;
            // 초기 어드민 카테고리 리스트 렌더링
            renderCategoryList(userInfo.category);
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
                const response = await fetch(`http://${url}:3142/delete-menu`, {
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
                <input type="number" id="value1-${itemId}" name="value1-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value1 || 0}" max="6">
            </div>
            <div>
                <label for="value2-${itemId}" class="text-sm text-gray-600">글라인더2</label>
                <input type="number" id="value2-${itemId}" name="value2-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value2 || 0}" max="6">
            </div>
            <div>
                <label for="value3-${itemId}" class="text-sm text-gray-600">추출량</label>
                <input type="number" id="value3-${itemId}" name="value3-${itemId}" min="30" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value3 || 0}" max="150" />
            </div>
            <div>
                <label for="value4-${itemId}" class="text-sm text-gray-600">핫워터</label>
                <input type="number" id="value4-${itemId}" name="value4-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value4 || 0}" max="300">
            </div>`;
    } else if (selectedType === 'garucha') {
        newFieldsHTML = `
            <div>
                <label for="value1-${itemId}" class="text-sm text-gray-600">차 종류</label>
                <input type="number" id="value1-${itemId}" name="value1-${itemId}" min="1" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value1 || 1}" min="1" max="6">
            </div>
            <div>
                <label for="value2-${itemId}" class="text-sm text-gray-600">추출 시간</label>
                <input type="number" id="value2-${itemId}" name="value2-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value2 || 0}" max="30">
            </div>
            <div>
                <label for="value3-${itemId}" class="text-sm text-gray-600">핫워터</label>
                <input type="number" id="value3-${itemId}" name="value3-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value3 || 0}" max="400">
            </div>`;
    } else if (selectedType === 'syrup') {
        newFieldsHTML = `
            <div>
                <label for="value1-${itemId}" class="text-sm text-gray-600">시럽 종류</label>
                <input type="text" id="value1-${itemId}" name="value1-${itemId}" min="1" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value1 || 1}" min="1" max="6">
            </div>
            <div>
                <label for="value2-${itemId}" class="text-sm text-gray-600">펌프 시간</label>
                <input type="number" id="value2-${itemId}" name="value2-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value2 || 0}" max="30">
            </div>
            <div>
                <label for="value3-${itemId}" class="text-sm text-gray-600">핫워터</label>
                <input type="number" id="value3-${itemId}" name="value3-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value3 || 0}" max="400">
            </div>
            <div>
                <label for="value4-${itemId}" class="text-sm text-gray-600">탄산수</label>
                <input type="number" id="value4-${itemId}" name="value4-${itemId}" min="0" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${values.value4 || 0}" max="400">
            </div>`;
    }

    // 기존 필드를 새로 생성된 내용으로 대체
    dynamicFields.innerHTML = newFieldsHTML;

    if (selectedType === 'garucha') {
        const garuchaField = document.getElementById(`value1-${itemId}`);
        restrictInput(garuchaField, [1, 2, 3, 4, 5, 6]);
    } else if (selectedType === 'syrup') {
        const syrupField = document.getElementById(`value1-${itemId}`);
        restrictInput(syrupField, [1, 2, 3, 5, 6]);
    }
}

// 허용된 숫자만 입력가능
function restrictInput(inputElement, allowedValues) {
    inputElement.addEventListener('input', () => {
        const rawValue = inputElement.value;

        // 소수점 또는 허용되지 않는 값이 입력되었는지 확인
        if (!/^\d+$/.test(rawValue) || !allowedValues.includes(parseInt(rawValue, 10))) {
            inputElement.value = ''; // 소수점이나 허용되지 않은 값이 입력되면 초기화
        }
    });
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

        // `coffee` 타입에 대한 추가 로직
        if (itemData.type === 'coffee') {
            const isValidValue = (value) => value >= 1 && value <= 6 && /^[0-9]+(\.[0-9]{1,2})?$/.test(value);


            if (itemData.value1 > 0) {

                // Value1이 있을 때 Value2가 0인지 확인
                if (parseFloat(itemData.value2) !== 0) {
                    alert(`'그라인더1' 값이 설정된 경우, '그라인더2' 값은 반드시 0이어야 합니다.`);
                    throw new Error(`Invalid 'coffee' configuration: Value2 (${item.value2}) must be 0 when Value1 (${itemData.value1}) is set.`);
                }

                if (!isValidValue(itemData.value1)) {
                    alert(`'그라인더1' 값은 최저 1 ~ 최대 6초까지 소수점을 포함한 값을 입력할 수 있습니다. (예: 1.5, 5.5, 6)`);
                    throw new Error(`Invalid 'coffee' configuration: Value1 (${itemData.value1}) is out of range or incorrectly formatted.`);
                }
            }

            if (itemData.value2 > 0) {
                // Value2이 있을 때 Value1가 0인지 확인
                if (parseFloat(itemData.value1) !== 0) {
                    alert(`'그라인더2' 값이 설정된 경우, '그라인더1' 값은 반드시 0이어야 합니다.`);
                    throw new Error(`Invalid 'coffee' configuration: Value2 (${item.value2}) must be 0 when Value1 (${itemData.value1}) is set.`);
                } else if (!isValidValue(itemData.value2)) {
                    alert(`'그라인더2' 값은 최저 1 ~ 최대 6초까지 소수점을 포함한 값을 입력할 수 있습니다. (예: 1.5, 5.5, 6)`);
                    throw new Error(`Invalid 'coffee' configuration: Value2 (${itemData.value2}) is out of range or incorrectly formatted.`);
                }
            }

        }

        // `garucha` 타입에 대한 추가 로직
        if (itemData.type === 'garucha') {

            if (itemData.value2 > 0 && itemData.value3 < itemData.value2 * 10) {
                alert(`가루차 핫 워터(${itemData.value3})는 추출시간 (${itemData.value2})의 10배 이상이어야 합니다.`);
                throw new Error(`가루차 저장 벨리데이션 에러: 핫워터 (${itemData.value3}) < 추출시간 (${itemData.value2}) * 10`);
            }
        }
        if (itemData.type === 'syrup') {

            if (itemData.value3 < 30 && itemData.value4 < 30) {
                alert('시럽 핫 워터 또는 탄산수 중 하나는 30 이상의 값이어야 합니다.');
                throw new Error('Invalid values: Both Value3 and Value4 are less than 30.');
            }
        }

        menuData.items.push(itemData); // items 배열에 추가
    });

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);
        formData.append('menuData', JSON.stringify(menuData));
        console.log(JSON.stringify(menuData));
        try {
            const response = await fetch(`http://${url}:3142/set-admin-menu-info`, {
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
            const response = await fetch(`http://${url}:3142/set-menu-update-info`, {
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

        const itemType = fieldset.querySelector('.itemTypeSelector').value;
        if (itemType) {
            const item = {
                type: itemType,
                value1: fieldset.querySelector('[name^="value1"]').value || 0,
                value2: fieldset.querySelector('[name^="value2"]').value || 0,
                value3: fieldset.querySelector('[name^="value3"]').value || 0,
                value4: fieldset.querySelector('[name^="value4"]')?.value || 0, // value4가 없는 경우도 처리
            };

            // `coffee` 타입에 대한 추가 로직
            if (item.type === 'coffee') {
                const isValidValue = (value) => value >= 1 && value <= 6 && /^[0-9]+(\.[0-9]{1,2})?$/.test(value);

                if (item.value1 > 0) {

                    // Value1이 있을 때 Value2가 0인지 확인
                    if (parseFloat(item.value2) !== 0) {
                        alert(`'그라인더1' 값이 설정된 경우, '그라인더2' 값은 반드시 0이어야 합니다.`);
                        throw new Error(`Invalid 'coffee' configuration: Value2 (${item.value2}) must be 0 when Value1 (${item.value1}) is set.`);
                    }

                    if (!isValidValue(item.value1)) {
                        alert(`'그라인더1' 값은 최저 1 ~ 최대 6초까지 소수점을 포함한 값을 입력할 수 있습니다. (예: 1.5, 5.5, 6)`);
                        throw new Error(`Invalid 'coffee' configuration: Value1 (${item.value1}) is out of range or incorrectly formatted.`);
                    }

                }

                if (item.value2 > 0) {

                    // Value2이 있을 때 Value1가 0인지 확인
                    if (parseFloat(item.value1) !== 0) {
                        alert(`'그라인더2' 값이 설정된 경우, '그라인더1' 값은 반드시 0이어야 합니다.`);
                        throw new Error(`Invalid 'coffee' configuration: Value2 (${item.value2}) must be 0 when Value1 (${item.value1}) is set.`);
                    }

                    if (!isValidValue(item.value2)) {
                        alert(`'그라인더2' 값은 최저 1 ~ 최대 6초까지 소수점을 포함한 값을 입력할 수 있습니다. (예: 1.5, 5.5, 6)`);
                        throw new Error(`Invalid 'coffee' configuration: Value1 (${item.value2}) is out of range or incorrectly formatted.`);
                    }
                }

            }

            // `garucha` 타입에 대한 추가 로직
            if (item.type === 'garucha') {
                if (item.value2 > 0 && item.value3 < item.value2 * 10) {
                    alert(`가루차 핫 워터(${item.value3})는 추출시간 (${item.value2})의 10배 이상이어야 합니다.`);
                    throw new Error(`가루차 저장 벨리데이션 에러: 핫워터 (${item.value3}) < 추출시간 (${item.value2}) * 10`);
                }
            }

            if (item.type === 'syrup') {

                if (item.value3 < 30 && item.value4 < 30) {
                    alert('시럽 핫 워터 또는 탄산수 중 하나는 30 이상의 값이어야 합니다.');
                    throw new Error('Invalid values: Both Value3 and Value4 are less than 30.');
                }
            }

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
        /*const menuId = selectElement.id.split('-')[1]; // select ID에서 menuId 추출
        const menuItem = data.Items.find(item => item.menuId === parseInt(menuId));
        if (menuItem && menuItem.category) {
            selectElement.value = menuItem.category;
        }*/
    });
}
/* [MENU] 카테고리 END*/
/* [CONTROL] 머신 조작 START */
const allUserAdminWash = async (item) => {
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

    // item 값에 따라 해당 객체 필터링
    const filteredData = item === "all" ? data : data.filter(obj => {
        if (item === "coffee") return obj.type === "coffee";
        if (item.startsWith("garucha")) return obj.type === "garucha" && obj.value1 === item.replace("garucha", "");
        if (item.startsWith("syrup")) return obj.type === "syrup" && obj.value1 === item.replace("syrup", "");
        return false;
    });

    console.log("Filtered Data:", filteredData);

    await adminUseWash(filteredData);
};

// "프로그램 재시작" 버튼 클릭 이벤트 추가
document.getElementById('restart-app').addEventListener('click', requestAppRestart);
// "프로그램 종료" 버튼 클릭 이벤트 추가
document.getElementById('shutdown-app').addEventListener('click', requestAppShutdown);
document.getElementById('cup-pl-use').addEventListener('click', fetchCupPlUse);
document.getElementById('cup-pa-use').addEventListener('click', fetchCupPaUse);
document.getElementById('all-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("all")});
document.getElementById('coffee-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("coffee")});
document.getElementById('garucha1-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("garucha1")});
document.getElementById('garucha2-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("garucha2")});
document.getElementById('garucha3-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("garucha3")});
document.getElementById('garucha4-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("garucha4")});
document.getElementById('garucha5-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("garucha5")});
document.getElementById('garucha6-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("garucha6")});
document.getElementById('syrup1-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("syrup1")});
document.getElementById('syrup2-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("syrup2")});
document.getElementById('syrup3-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("syrup3")});
document.getElementById('syrup5-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("syrup5")});
document.getElementById('syrup6-cleaning').addEventListener('click',async ()=>{ await allUserAdminWash("syrup6")});

// 시간 저장 버튼 클릭
document.getElementById('schedule-cleaning').addEventListener('click', async () => {
    const washTime = document.getElementById('time-input').value;

    if (washTime === "") {
        console.error("유효하지 않은 시간 값");
        return;
    }

    // 업데이트 데이터 생성
    const data = {
        washTime: washTime, // 세척 시간
    };

    try {
        // 서버에 업데이트 요청
        await updateUserInfo(data);
        await fetchAndSaveUserInfo();

        alert("자동세척 예약 시간이 저장되었습니다. 프로그램을 재시작해주세요.");
    } catch (error) {
        console.error("저장 중 오류:", error);
        alert("저장에 실패했습니다. 다시 시도해주세요.");
    }

});

document.getElementById('time-input').addEventListener('input', (event) => {
    let value = parseInt(event.target.value, 10);

    if (isNaN(value) || value < 0) {
        event.target.value = 0; // 최소값
    } else if (value > 23) {
        event.target.value = 23; // 최대값
    }
});

// 최대 개수 저장 버튼 클릭
document.getElementById('limit-count').addEventListener('click', async () => {
    const limitCount = document.getElementById('limit-input').value;

    if (limitCount === "") {
        console.error("유효하지 않은 최대 값");
        return;
    }

    // 업데이트 데이터 생성
    const data = {
        limitCount: limitCount, // 최대 개수
    };

    try {
        // 서버에 업데이트 요청
        await updateUserInfo(data);
        await fetchAndSaveUserInfo();

        alert("최대 주문 개수 값이 저장되었습니다. 프로그램을 재시작해주세요.");
    } catch (error) {
        console.error("저장 중 오류:", error);
        alert("저장에 실패했습니다. 다시 시도해주세요.");
    }

});

document.getElementById('limit-input').addEventListener('input', (event) => {
    let value = parseInt(event.target.value, 10);

    if (isNaN(value) || value < 0) {
        event.target.value = 0; // 최소값
    } else if (value > 20) {
        event.target.value = 20; // 최대값
    }
});

// 카테고리 목록 렌더링
function renderCategoryList(category = []) {
    const requiredCategoryCount = 6; // 고정 카테고리 수
    const categoryData = [...category]; // 조회된 데이터를 복사

    // 데이터가 부족하면 빈 항목 추가
    while (categoryData.length < requiredCategoryCount) {
        categoryData.push({ name: "", no: "", item: "" });
    }

    const categoryList = document.getElementById("category-list");
    categoryList.innerHTML = ""; // 기존 항목 초기화

    categoryData.forEach((category, index) => {
        const categoryItem = document.createElement("div");
        categoryItem.className = "flex items-center gap-4 mb-4";

        categoryItem.innerHTML = `
            <input 
                type="checkbox" 
                data-index="${index}" 
                class="category-checkbox"
                ${category.name ? "checked" : ""} 
            />
            <input 
                type="text" 
                value="${category.name || ""}" 
                data-index="${index}" 
                class="category-name bg-gray-200 text-black px-4 py-2 rounded-lg border border-gray-300 w-48"
            />
            <input 
                type="text" 
                value="${category.no || ""}" 
                data-index="${index}" 
                class="category-no bg-gray-200 text-black px-4 py-2 rounded-lg border border-gray-300 w-16 text-center"
            />
            <input 
                type="text" 
                value="${category.item || ""}" 
                data-index="${index}" 
                class="category-item bg-gray-200 text-black px-4 py-2 rounded-lg border border-gray-300 w-32"
            />
        `;

        categoryList.appendChild(categoryItem);
    });
}

// 저장 버튼 클릭 핸들러
async function saveCategoryData() {
    const checkboxes = document.querySelectorAll(".category-checkbox");
    const nameInputs = document.querySelectorAll(".category-name");
    const noInputs = document.querySelectorAll(".category-no");
    const itemInputs = document.querySelectorAll(".category-item");

    const selectedCategories = [];

    checkboxes.forEach((checkbox, index) => {
        if (checkbox.checked) {
            selectedCategories.push({
                name: nameInputs[index].value || "",
                no: noInputs[index].value || "",
                item: itemInputs[index].value || "",
            });
        }
    });

    const data = {
        category: selectedCategories,
    };

    console.log("저장된 카테고리 데이터:", data);

    try {
        // 서버에 업데이트 요청
        await updateUserInfo(data);
        await fetchAndSaveUserInfo();
        alert("카테고리가 저장되었습니다. 프로그램을 재시작해주세요.");
    } catch (error) {
        console.error("저장 중 오류:", error);
        alert("저장에 실패했습니다. 다시 시도해주세요.");
    }
}


// 초기화
document.getElementById("update-category").addEventListener("click", async ()=>{ saveCategoryData()});


/* [CONTROL] 머신 조작 END */
/* [CONTROL] 주문 로그조회 START */
// 탭 등록함수
document.addEventListener('DOMContentLoaded', async () => {
    // 오늘 날짜 계산
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // 월 (0부터 시작)
    const dd = String(today.getDate()).padStart(2, '0'); // 일

    // 기본 날짜 (오늘)
    const todayString = `${yyyy}-${mm}-${dd}`;

    // 31일 전 날짜 계산
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 31); // 31일 전
    const oneWeekAgoString = `${oneWeekAgo.getFullYear()}-${String(oneWeekAgo.getMonth() + 1).padStart(2, '0')}-${String(oneWeekAgo.getDate()).padStart(2, '0')}`;

    // 시작 날짜와 종료 날짜 기본값 설정
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    startDateInput.value = todayString; // 시작 날짜 기본값 (오늘)
    startDateInput.min = oneWeekAgoString; // 시작 날짜 최소값 (1주일 전)
    startDateInput.max = todayString; // 시작 날짜 최대값 (오늘)

    endDateInput.value = todayString; // 종료 날짜 기본값 (오늘)
    endDateInput.min = oneWeekAgoString; // 종료 날짜 최소값 (1주일 전)
    endDateInput.max = todayString; // 종료 날짜 최대값 (오늘)

    // 종료 날짜가 시작 날짜보다 이전으로 설정되지 않도록 제한
    startDateInput.addEventListener('change', () => {
        if (new Date(startDateInput.value) > new Date(endDateInput.value)) {
            endDateInput.value = startDateInput.value;
        }
        endDateInput.min = startDateInput.value; // 종료 날짜 최소값 동적으로 설정
    });

    endDateInput.addEventListener('change', () => {
        if (new Date(endDateInput.value) < new Date(startDateInput.value)) {
            startDateInput.value = endDateInput.value;
        }
        startDateInput.max = endDateInput.value; // 시작 날짜 최대값 동적으로 설정
    });

    // 오늘 날짜 계산
    const now = new Date();

    // 로컬 시간 기준 오늘 날짜
    const localYear = now.getFullYear();
    const localMonth = now.getMonth();
    const localDate = now.getDate();

    // UTC 기준 오늘 시작 시간 (00:00:00Z)
    const todayStart = new Date(Date.UTC(localYear, localMonth, localDate, 0, 0, 0)).toISOString();

    // UTC 기준 오늘 종료 시간 (23:59:59Z)
    const todayEnd = new Date(Date.UTC(localYear, localMonth, localDate, 23, 59, 59)).toISOString();

    await renderGroupedOrdersToHTML(todayStart, todayEnd, true);

    // 매출 통계 조회 및 렌더링
    await renderSalesStatistics();
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

async function renderSalesStatistics() {
    try {
        // 매출 통계 데이터 조회
        const statistics = await calculateSalesStatistics();

        // 각 매출 항목에 해당하는 텍스트와 데이터를 매핑
        const salesData = [
            { label: '당일 매출', value: statistics.todaySales.toLocaleString() + '원' },
            { label: '전일 매출', value: statistics.yesterdaySales.toLocaleString() + '원' },
            { label: '당월 매출', value: statistics.currentMonthSales.toLocaleString() + '원' },
            { label: '전월 매출', value: statistics.previousMonthSales.toLocaleString() + '원' }
        ];

        // 매출 카드 컨테이너 선택
        const salesCardsContainer = document.getElementById('sales-cards');
        salesCardsContainer.innerHTML = ''; // 기존 내용 제거

        // 매출 카드 생성
        salesData.forEach((data) => {
            const card = document.createElement('div');
            card.className = 'stats-card bg-white shadow rounded-lg p-4 flex flex-col items-center';
            card.innerHTML = `
                <p class="text-sm font-semibold text-gray-600">${data.label}</p>
                <p class="text-2xl font-bold text-blue-600">${data.value}</p>
            `;
            salesCardsContainer.appendChild(card);
        });

        // 전체 매출 카드 생성
        const totalSalesCard = document.getElementById('total-sales-card');
        totalSalesCard.innerHTML = `
            <p class="text-sm font-semibold text-gray-600">전체 매출</p>
            <p class="text-2xl font-bold text-blue-600">${statistics.totalSales.toLocaleString()}원</p>
        `;
    } catch (error) {
        console.error('매출 통계 데이터를 렌더링하는 중 오류가 발생했습니다:', error);
    }
}

// 주문 내역 랜더링
async function renderGroupedOrdersToHTML(startDate, endDate, ascending = true) {

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

    // 테이블 생성
    const table = document.createElement('table');
    table.className = 'table-auto w-full border-collapse border border-gray-300';

    // 테이블 헤더 생성 (고정)
    table.innerHTML = `
        <thead>
            <tr class="bg-gray-100">
                <th class="px-4 py-2 border border-gray-300 text-center text-sm font-semibold text-gray-600">순번</th>
                <th class="px-4 py-2 border border-gray-300 text-center text-sm font-semibold text-gray-600">날짜</th>
                <th class="px-4 py-2 border border-gray-300 text-left text-sm font-semibold text-gray-600">메뉴</th>
                <th class="px-4 py-2 border border-gray-300 text-right text-sm font-semibold text-gray-600">가격</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    // 테이블 바디 선택
    const tbody = table.querySelector('tbody');

    // 주문 데이터를 반복하여 테이블 바디에 추가
    orders.forEach((order, index) => {
        // 날짜와 시간을 보기 좋게 포맷 (T 제거)
        const formattedTime = order.timestamp.replace('T', ' ').slice(0, 19); // "YYYY-MM-DDTHH:mm:ss" -> "YYYY-MM-DD HH:mm:ss"

        // 첫 번째 메뉴
        const firstMenu = order.menuSummary[0];
        const additionalMenuCount = order.menuSummary
            .slice(1) // 첫 번째 메뉴를 제외한 메뉴들의
            .reduce((sum, menu) => sum + menu.count, 0) + firstMenu.count - 1; // 추가 메뉴 count 합산

        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-4 py-2 border border-gray-300 text-center text-gray-600 text-sm">${index + 1}</td>
            <td class="px-4 py-2 border border-gray-300 text-center text-gray-600 text-sm">${formattedTime}</td>
            <td class="px-4 py-2 border border-gray-300 text-gray-600 text-sm">
                ${firstMenu.name} ${additionalMenuCount > 0 ? `<span class="text-blue-600 font-semibold">+${additionalMenuCount}</span>` : ''}
            </td>
            <td class="px-4 py-2 border border-gray-300 text-right text-gray-600 text-sm">${order.totalPrice.toLocaleString()}원</td>
        `;
        tbody.appendChild(row);

        // 테이블 행에 클릭 이벤트 추가
        row.addEventListener('click', () => {
            showOrderDetailsModal(order);
        });

        tbody.appendChild(row);
    });

    // 생성된 테이블을 메인 컨테이너에 추가
    container.appendChild(table);
}
/* [CONTROL] 주문 로그조회 END */
/* [MILEAGE] 마일리지 조작 START */
const baseUrl = `http://${url}:3142`;

let page = 1;
let limit = 10;
let totalItems = 0;
let lastEvaluatedKey = null;
let mileagePageKeys = [];

// 공통 API 호출 함수
async function callApi(endpoint, method, body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };

    if (body && method !== "GET") {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, options);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
}

// 마일리지 데이터 조회
async function fetchMileageData(selectedPageKey = null) {
    const searchKey = document.getElementById("searchKey").value.trim();
    const limit = parseInt(document.getElementById("limit").value) || 10;

    try {
        // API 요청 쿼리 생성
        const queryString = `?limit=${limit}&searchKey=${encodeURIComponent(searchKey)}&lastEvaluatedKey=${encodeURIComponent(JSON.stringify(selectedPageKey)|| '')}`;
        const response = await callApi(`/mileage${queryString}`, "GET");

        // 서버 응답 처리
        const { items, total, lastEvaluatedKey: newLastEvaluatedKey, pageKeys: serverPageKeys } = response;

        // 클라이언트 상태 업데이트
        totalItems = total;
        
        // serverPageKeys 가 있을때만 저장
        if (serverPageKeys) {
            mileagePageKeys = serverPageKeys; // 서버에서 전달된 pageKeys 저장
        }


        updateTable(items); // 테이블 데이터 갱신
        updatePagination(); // 페이지네이션 갱신

        // 다음 페이지를 위한 키 갱신
        lastEvaluatedKey = newLastEvaluatedKey;
    } catch (error) {
        console.error("Error fetching mileage data:", error);
        alert("데이터 조회 중 오류가 발생했습니다.");
    }
}

// 마일리지 삭제
async function deleteMileage(mileageNo) {
    // 사용자 확인
    if (!confirm(`Mileage No: ${mileageNo}을(를) 삭제하시겠습니까?`)) {
        return;
    }

    try {
        // 서버로 삭제 요청
        const response = await callApi(`/mileage/${mileageNo}`, "DELETE");

        if (response.success) {
            alert("마일리지가 성공적으로 삭제되었습니다.");
            await fetchMileageData(null); // 테이블 새로고침
        } else {
            alert(response.message || "삭제에 실패했습니다.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("삭제 중 오류가 발생했습니다.");
    }
}

// 테이블 업데이트
function updateTable(items) {
    const tbody = document.getElementById("mileageTableBody");
    tbody.innerHTML = ""; // 기존 내용 초기화

    items.forEach((item, index) => {
        // 테이블 행 생성
        const row = document.createElement("tr");
        row.className = "hover:bg-gray-100 cursor-pointer rounded-2xl";

        // 순번
        const indexCell = document.createElement("td");
        indexCell.className = "p-2 text-center w-16";
        indexCell.textContent = index + 1; // 순번은 1부터 시작

        // 마일리지 번호
        const mileageNoCell = document.createElement("td");
        mileageNoCell.className = "p-2";
        mileageNoCell.textContent = item.mileageNo;

        // 금액
        const amountCell = document.createElement("td");
        amountCell.className = "p-2 text-right";
        amountCell.textContent = (item.amount || 0).toLocaleString() + "p";

        // 삭제 버튼
        const actionCell = document.createElement("td");
        actionCell.className = "p-2 w-20";

        const deleteButton = document.createElement("button");
        deleteButton.className = "bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600";
        deleteButton.textContent = "삭제";

        // 이벤트 리스너 추가
        deleteButton.addEventListener("click", (event) => {
            event.stopPropagation(); // 클릭 이벤트가 행으로 전달되지 않도록 방지
            deleteMileage(item.mileageNo, item.userId);
        });

        // 삭제 버튼 추가
        actionCell.appendChild(deleteButton);

        // 행에 셀 추가
        row.appendChild(indexCell);
        row.appendChild(mileageNoCell);
        row.appendChild(amountCell);
        row.appendChild(actionCell);

        // 행 클릭 이벤트 추가
        row.addEventListener("click", () => {
            openDetailModal(item); // 모달 열기
        });

        // 테이블에 행 추가
        tbody.appendChild(row);
    });
}

// 페이지네이션 업데이트
function updatePagination() {
    limit = parseInt(document.getElementById("limit").value) || 10;
    const totalPages = Math.ceil(totalItems / limit);
    const paginationContainer = document.getElementById("paginationContainer");
    const visiblePages = 5; // 한 번에 표시할 페이지 번호 개수
    paginationContainer.innerHTML = ""; // 기존 버튼 초기화

    if (totalPages <= 1) {
        return; // 페이지가 하나뿐이면 아무것도 표시하지 않음
    }

    // 이전 버튼
    const prevButton = document.createElement("button");
    prevButton.className = "bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400 disabled:opacity-50";
    prevButton.disabled = page === 1;
    prevButton.innerText = "이전";
    prevButton.addEventListener("click", () => changePage(page - 1));
    paginationContainer.appendChild(prevButton);

    // 페이지 번호 버튼
    let startPage = Math.max(1, page - Math.floor(visiblePages / 2));
    let endPage = Math.min(totalPages, startPage + visiblePages - 1);

    if (endPage - startPage + 1 < visiblePages) {
        startPage = Math.max(1, endPage - visiblePages + 1);
    }

    if (startPage > 1) {
        const firstPageButton = document.createElement("button");
        firstPageButton.className = "bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400";
        firstPageButton.innerText = "1";
        firstPageButton.addEventListener("click", () => changePage(1));
        paginationContainer.appendChild(firstPageButton);

        if (startPage > 2) {
            const ellipsis = document.createElement("span");
            ellipsis.innerText = "...";
            ellipsis.className = "px-2";
            paginationContainer.appendChild(ellipsis);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement("button");
        pageButton.className =
            "px-2 py-1 rounded mx-1 " + (i === page ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-700 hover:bg-gray-400");
        pageButton.innerText = i.toString();
        pageButton.setAttribute("aria-current", i === page ? "page" : null);
        // 올바른 페이지 번호를 changePage에 전달
        pageButton.addEventListener("click", () => changePage(i));
        paginationContainer.appendChild(pageButton);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement("span");
            ellipsis.innerText = "...";
            ellipsis.className = "px-2";
            paginationContainer.appendChild(ellipsis);
        }

        const lastPageButton = document.createElement("button");
        lastPageButton.className = "bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400";
        lastPageButton.innerText = totalPages.toString();
        lastPageButton.addEventListener("click", () => changePage(totalPages));
        paginationContainer.appendChild(lastPageButton);
    }

    // 다음 버튼
    const nextButton = document.createElement("button");
    nextButton.className = "bg-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-400 disabled:opacity-50";
    nextButton.disabled = page === totalPages;
    nextButton.innerText = "다음";
    nextButton.addEventListener("click", () => changePage(page + 1));
    paginationContainer.appendChild(nextButton);
}

// 페이지 변경 함수
function changePage(newPage) {
    const totalPages = Math.ceil(totalItems / limit);

    if (newPage < 1 || newPage > totalPages) {
        return; // 잘못된 페이지 요청 방지
    }

    page = newPage; // 페이지 번호 업데이트

    // 현재 페이지에 맞는 lastEvaluatedKey 가져오기
    const lastKey = mileagePageKeys[page-2] || null;
    // API 호출
    fetchMileageData(lastKey).then(); // 새 페이지 데이터 가져오기
}

// 검색 버튼 클릭 이벤트
document.getElementById("searchMileageBtn").addEventListener("click", ()=>{fetchMileageData(null)});

// 등록 모달 START
const registerModal = document.getElementById("registerModal");
const openRegisterModalBtn = document.getElementById("openRegisterModalBtn");
const closeRegisterModalBtn = document.getElementById("closeRegisterModalBtn");
const cancelRegisterModalBtn = document.getElementById("cancelRegisterModalBtn");
const confirmRegisterBtn = document.getElementById("confirmRegisterBtn");

// 모달 관련 요소가 모두 존재하는지 확인
if (registerModal && openRegisterModalBtn && closeRegisterModalBtn && cancelRegisterModalBtn && confirmRegisterBtn) {
    openRegisterModalBtn.addEventListener("click", () => {
        registerModal.classList.remove("hidden");
    });

    closeRegisterModalBtn.addEventListener("click", closeRegisterModal);
    cancelRegisterModalBtn.addEventListener("click", closeRegisterModal);
} else {
    console.error("모달 관련 요소를 찾을 수 없습니다.");
}

// 모달 열기
openRegisterModalBtn.addEventListener("click", () => {
    registerModal.classList.remove("hidden");
});

// 모달 닫기
function closeRegisterModal() {
    registerModal.classList.add("hidden");
    resetForm(["registerMileageNo", "registerPassword", "registerAmount"]);
}
closeRegisterModalBtn.addEventListener("click", closeRegisterModal);
cancelRegisterModalBtn.addEventListener("click", closeRegisterModal);

// 등록 처리
confirmRegisterBtn.addEventListener("click", async () => {
    const mileageNo = document.getElementById("registerMileageNo").value.trim();
    const password = document.getElementById("registerPassword").value.trim();
    const amount = parseFloat(document.getElementById("registerAmount").value);

    // 입력값 검증
    if (!/^\d{4,11}$/.test(mileageNo)) {
        alert("번호는 4~11자리 숫자여야 합니다.");
        return;
    }
    if (!password) {
        alert("비밀번호를 입력하세요.");
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        alert("마일리지 포인트는 0보다 큰 숫자여야 합니다.");
        return;
    }

    try {
        const data = await callApi("/mileage-add", "POST", { mileageNo, password, amount });

        if (data.success) {
            alert("마일리지가 성공적으로 등록되었습니다.");
            closeRegisterModal();
            await fetchMileageData(null); // 테이블 새로고침
        } else {
            alert(data.message || "등록에 실패했습니다.");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("등록 중 오류가 발생했습니다.");
    }
});
// 등록 모달 END

// 수정, 비밀번호찾기, 상세 모달 START
// 모달열기
async function openDetailModal(item) {
    try {
        // 리스트 데이터를 모달 기본 필드에 설정
        document.getElementById("modalPhone").value = item.mileageNo || "";
        document.getElementById("modalPoints").value = item.amount || 0;
        document.getElementById("modalCount").value = item.count || 0;
        document.getElementById("modalNote").value = item.note || "";
        document.getElementById("modalPassword").value = item.password || "";
        //document.getElementById("modalTimestamp").value = new Date(item.timestamp).toLocaleString() || "";

        // 이용 내역 초기화
        updateUsageHistoryTable([]);

        // 이용 내역 조회
        const historyResponse = await callApi(`/mileage-history/${encodeURIComponent(item.mileageNo)}`, "GET");
        const usageHistory = historyResponse.data || [];

        // 이용 내역 테이블 업데이트
        updateUsageHistoryTable(usageHistory);

        // 이용 내역 테이블 업데이트
        updateUsageHistoryTable(usageHistory);

        // 모달 열기
        const modal = document.getElementById("detailModal");
        modal.classList.remove("hidden");
    } catch (error) {
        console.error("Error fetching usage history:", error);
        alert("이용 내역 조회 중 오류가 발생했습니다.");
    }
}


// 모달그리드
function updateUsageHistoryTable(usageHistory) {
    const tbody = document.getElementById("usageHistoryTableBody");
    tbody.innerHTML = ""; // 기존 데이터 초기화

    if (!usageHistory || usageHistory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td class="border border-gray-300 p-2 text-center" colspan="6">이용 내역이 없습니다.</td>
            </tr>
        `;
        return;
    }

    usageHistory.forEach((entry, index) => {
        const row = `
            <tr>
                <td class="border border-gray-300 p-2">${index + 1}</td>
                <td class="border border-gray-300 p-2">${new Date(entry.timestamp).toLocaleDateString()}</td>
                <td class="border border-gray-300 p-2">${new Date(entry.timestamp).toLocaleTimeString()}</td>
                <td class="border border-gray-300 p-2">${(entry.payment || 0).toLocaleString()}</td>
                <td class="border border-gray-300 p-2">${(entry.useMileage || 0).toLocaleString()}</td>
                <td class="border border-gray-300 p-2">${(entry.amount || 0).toLocaleString()}</td>
            </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", row);
    });
}


// 모달 닫기
function closeDetailModal() {
    const modal = document.getElementById("detailModal");
    modal.classList.add("hidden");
}
document.getElementById("closeModalBtn").addEventListener("click", closeDetailModal);
document.getElementById("cancelModalBtn").addEventListener("click", closeDetailModal);


// 저장 버튼 이벤트
document.getElementById("saveModalBtn").addEventListener("click", async () => {
    const mileageNo = document.getElementById("modalPhone").value; // 마일리지 번호
    const password = document.getElementById("modalPassword").value; // 패스워드
    const points = parseInt(document.getElementById("modalPoints").value, 10); // 포인트
    const note = document.getElementById("modalNote").value; // 메모

    if (!mileageNo) {
        alert("마일리지 번호가 유효하지 않습니다.");
        return;
    }

    if (!password) {
        alert("패스워드를 입력하세요.");
        return;
    }

    try {
        // API 호출
        await callApi(`/mileage/${encodeURIComponent(mileageNo)}`, "PUT", { password, points, note });
        alert("정보가 성공적으로 저장되었습니다.");
        closeDetailModal(); // 모달 닫기
        await fetchMileageData(null); // 테이블 새로고침
    } catch (error) {
        console.error("Error:", error);
        alert("정보 저장 중 오류가 발생했습니다.");
    }
});


// 수정, 비밀번호찾기, 상세 모달 END

// 필드 초기화 함수
function resetForm(fieldIds) {
    fieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = ""; // 필드 초기화
        }
    });
}

// 초기 데이터 로드
document.addEventListener("DOMContentLoaded", () => {
    fetchMileageData(null);
});


/* [MILEAGE] 마일리지 조작 END */
// 모달 열기 함수
function showOrderDetailsModal(order) {
    // 모달 컨텐츠 생성
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = `
        <p><strong>주문 시간:</strong> ${order.timestamp.replace('T', ' ').slice(0, 19)}</p>
        <p><strong>총 금액:</strong> ${order.totalPrice.toLocaleString()}원</p>
        <div>
            <strong>메뉴:</strong>
            <div class="list-disc pl-5">
                ${order.menuSummary
                    .map(
                        (menu) =>
                            `<p>${menu.name} (${menu.count}개) - ${menu.price.toLocaleString()}원</p>`
                    )
                    .join('')}
            </div>
        </div>
    `;

    // 모달 표시
    const modal = document.getElementById('order-details-modal');
    modal.classList.remove('hidden');
}

// 모달 닫기 이벤트
document.getElementById('close-modal').addEventListener('click', () => {
    const modal = document.getElementById('order-details-modal');
    modal.classList.add('hidden');
});

/* [CONTROL] 주문 로그 조회 END */
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
function switchTab(targetTabId) {
    if (targetTabId === 'tab2') {
        // tab2일 때는 리프레시 없이 동작
        activateTab(targetTabId);
    } else {
        // 다른 탭일 경우 리프레시 동작
        // 현재 탭 정보를 URL 쿼리 파라미터에 저장
        const url = new URL(window.location.href);
        url.searchParams.set('tab', targetTabId); // 'tab' 파라미터에 선택한 탭 ID 저장
        window.history.pushState({}, '', url);

        // 페이지 리프레시
        location.reload();
    }
}

// 전역으로 함수 연결
window.switchTab = switchTab;

// 탭 활성화 함수 (리프레시 없이 탭 변경 처리)
function activateTab(targetTabId) {
    // 모든 탭 내용 숨김
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
    });

    // 선택된 탭 내용 표시
    document.getElementById(targetTabId).classList.remove('hidden');

    // 모든 탭 버튼 초기화
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.classList.remove('text-blue-500', 'border-blue-500'); // 기존 활성화 스타일 제거
        button.classList.add('text-gray-600', 'border-transparent'); // 기본 스타일 추가
    });

    // 활성화된 탭 버튼 스타일 업데이트
    document.querySelector(`.tab-btn[data-tab="${targetTabId}"]`).classList.add('text-blue-500', 'border-blue-500');
}

// 페이지 로드 시 활성화할 탭 관리
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab') || 'tab1'; // URL에서 'tab' 값을 가져오거나 기본값 'tab1' 설정

    activateTab(activeTab); // 활성화된 탭 설정
});

/* 텝 컨트롤 END */
