import {
    getUserData,
    getMenuInfoAll,
    fetchCupPlUse,
    fetchCupPaUse,
    callSerialAdminIceOrder,
    callSerialAdminCupOrder,
    callSerialAdminDrinkOrder
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

    // 컵
    //
    // 투출 처리
    await callSerialAdminCupOrder(targetItem);
   /* // 컵 데이터 확인 및 API 호출
    if (targetItem.cup === "plastic") {
        console.log(`플라스틱 컵 선택: ${JSON.stringify(targetItem)}`);
        await callApi(fetchCupPlUse, menuId, targetItem);
    } else if (targetItem.cup === "paper") {
        console.log(`종이컵 선택: ${JSON.stringify(targetItem)}`);
        await callApi(fetchCupPaUse, menuId, targetItem);
    } else {
        console.error("Unknown cup type:", targetItem.cup);
    }*/
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
            // HTML 생성 및 삽입
            const menuHTML = data.Items.map(item =>
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

// 반복적으로 메뉴 아이템 HTML 생성
const createMenuHTML = (menuData, categories) => {
    const escapeHTML = (str) => {
        if (typeof str !== 'string') {
            return ''; // undefined나 null일 경우 빈 문자열 반환
        }
        return str.replace(/[&<>"']/g, (match) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[match]));
    };

    const convertToImageUrl = (localPath) => {
        if (!localPath) {
            return `${userUrlPort}/images/default.png`; // 기본 이미지 경로
        }
        const fileName = localPath.split('\\').pop(); // 파일 이름 추출
        return `${userUrlPort}/images/${fileName}`;
    };

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
                            <input type="text" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${Number(escapeHTML(menuData.no?.toString() || 0))}" disabled />
                        </div>
                        <div>
                            <label for="name" class="text-sm text-gray-600">메뉴명</label>
                            <input type="text" class="w-full border border-gray-400 rounded-md px-2 py-1" value="${escapeHTML(menuData.name || '')}" disabled>
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
                            <legend class="text-sm font-semibold mb-2">항목 ${escapeHTML(item.no?.toString() || '')}</legend>
                            <div>타입: ${item.type === 'coffee' ? '커피' : item.type === 'garucha' ? '가루차' : item.type === 'syrup' ? '시럽' : '알 수 없음'}</div>
                            ${item.type === 'coffee' ? `
                                <div>
                                    <label class="text-sm text-gray-600">글라인더1</label>
                                    <input type="text" value="${escapeHTML(item.value1?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-600">글라인더2</label>
                                    <input type="text" value="${escapeHTML(item.value2?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-600">추출량</label>
                                    <input type="text" value="${escapeHTML(item.value3?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-600">핫워터</label>
                                    <input type="text" value="${escapeHTML(item.value4?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                            ` : item.type === 'garucha' ? `
                                <div>
                                    <label class="text-sm text-gray-600">차종류</label>
                                    <input type="text" value="${escapeHTML(item.value1?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-600">추출시간</label>
                                    <input type="text" value="${escapeHTML(item.value2?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-600">핫워터</label>
                                    <input type="text" value="${escapeHTML(item.value3?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                            ` : item.type === 'syrup' ? `
                                <div>
                                    <label class="text-sm text-gray-600">시럽종류</label>
                                    <input type="text" value="${escapeHTML(item.value1?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-600">펌프시간</label>
                                    <input type="text" value="${escapeHTML(item.value2?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-600">핫워터</label>
                                    <input type="text" value="${escapeHTML(item.value3?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                                <div>
                                    <label class="text-sm text-gray-600">탄산수</label>
                                    <input type="text" value="${escapeHTML(item.value4?.toString() || '')}" class="w-full border border-gray-400 rounded-md px-2 py-1" readonly>
                                </div>
                            ` : `
                                <div>
                                    <span class="text-sm text-gray-600">Unknown Type</span>
                                </div>
                            `}
                        </fieldset>
                    `).join('') || ''}
                </div>
            </div>
        </div>
    </div>`;
};
// 메뉴그리기 END
// 수정 START
window.handleUpdateClick = function(menuId) {
    const menuItem = document.querySelector(`[data-menu-id="${menuId}"]`);

    if (!menuItem) {
        console.error(`Menu item with menuId ${menuId} not found.`);
        return;
    }

    const editButton = menuItem.querySelector(`#itemUpdateBtn-${menuId}`);

    if (editButton.textContent.trim() === "수정") {
        const fields = menuItem.querySelectorAll("input, select, textarea");
        fields.forEach((field) => {
            field.removeAttribute("disabled");
            field.removeAttribute("readonly");
        });

        editButton.textContent = "저장";
        editButton.classList.remove("bg-green-500");
        editButton.classList.add("bg-blue-500");

        alert("수정 가능 상태로 전환되었습니다.");
    } else if (editButton.textContent.trim() === "저장") {
        // 데이터 수집
        const menuData = {
            menuId: Number(menuId),
            no: Number(menuItem.querySelector('input[type="text"]').value),
            name: menuItem.querySelector('input[type="text"]').value.trim(),
            category: menuItem.querySelector('input[value]').value.trim(),
            price: Number(menuItem.querySelector('input[name="price"]').value),
            cup: menuItem.querySelector('input[name^="cup"]:checked')?.value || "",
            iceYn: menuItem.querySelector('input[name^="iceYn"]:checked')?.value || "",
            empty: menuItem.querySelector('input[name^="empty"]:checked')?.value || "",
            iceTime: Number(menuItem.querySelector('input[name="iceTime"]').value),
            waterTime: Number(menuItem.querySelector('input[name="waterTime"]').value),
            state: {
                new: menuItem.querySelector('select[name="new"]').value || "",
                event: menuItem.querySelector('select[name="event"]').value || "",
                best: menuItem.querySelector('select[name="best"]').value || "",
            },
            items: [],
        };

        // 내부 아이템 데이터 수집
        menuItem.querySelectorAll(".items-list fieldset").forEach((fieldset, index) => {
            const type = fieldset.querySelector("div").textContent.split(": ")[1].trim();
            const value1 = fieldset.querySelector('input[name*="value1"]')?.value || "";
            const value2 = fieldset.querySelector('input[name*="value2"]')?.value || "";
            const value3 = fieldset.querySelector('input[name*="value3"]')?.value || "";
            const value4 = fieldset.querySelector('input[name*="value4"]')?.value || "";

            menuData.items.push({
                no: index + 1,
                type,
                value1,
                value2,
                value3,
                value4,
            });
        });

        console.log("수집된 데이터:", menuData);

        /*fetch("http://example.com/api/update-menu", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(menuData),
        })
            .then((response) => response.json())
            .then((result) => {
                if (result.success) {
                    alert("저장이 성공적으로 완료되었습니다!");
                    const fields = menuItem.querySelectorAll("input, select, textarea");
                    fields.forEach((field) => {
                        field.setAttribute("disabled", true);
                        field.setAttribute("readonly", true);
                    });

                    editButton.textContent = "수정";
                    editButton.classList.remove("bg-blue-500");
                    editButton.classList.add("bg-green-500");
                } else {
                    alert("저장 실패: " + result.message);
                }
            })
            .catch((error) => {
                console.error("저장 중 오류:", error);
                alert("저장 중 오류가 발생했습니다.");
            });*/
    }
};

// 수정 END