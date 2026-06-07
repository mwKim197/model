const log = require('../logger');

function createSerialOrderProcess({
    allProduct,
    eventEmitter,
    state,
    Order,
    dispenseCup,
    dispenseIce,
    dispenseCoffee,
    dispenseGarucha,
    dispenseSyrup,
    checkCupSensor,
    checkAutoOperationState
}) {
// 주문 처리 로직
const startOrder = async (data) => {
    try {

        // 주문 데이터 검증
        if (!Array.isArray(data.orderList) || data.orderList.length === 0) {
            throw new Error("주문 데이터가 없습니다.");
        }
        let orderData = data.orderList;  // 주문 데이터

        // 전체 메뉴 조회
        const menu = await allProduct();
        if (!menu || !menu.Items) {
            throw new Error("전체 메뉴 조회실패.");
        }
        let menuData = menu.Items;

        // 메뉴와 주문 데이터가 정상적으로 로드되었으면 주문 처리 시작
        if (menuData.length > 0) {
            log.info("[START] 주문 제조를 시작합니다!!!");
            log.info("[START] 주문 제조를 시작합니다!!!");
            log.info("[START] 주문 제조를 시작합니다!!!");

            log.info("주문 목록: ", orderData);
            await processQueue(orderData, menuData).catch((error) => {
                throw error; // 명시적으로 에러를 다시 던짐
            });
            await useWash(orderData);
        } else {
            log.warn("메뉴, 주문 정보 없음.");
        }
    } catch (error) {
        log.error("주문시작 에러 발생 :", error.message);
        throw error; // 명시적으로 에러를 다시 던짐
    } finally {
        eventEmitter.emit('order-update', {
            status: 'completed',
        });
    }
};

// 주문 처리 큐
const processQueue = async (orderList, menuList) => {
    // 주문 수량의 총합을 계산
    let totalCount = orderList.reduce((acc, order) => acc + order.count, 0);
    let count = 1;

    for (const order of orderList) {
        try {

            const recipe = menuList.find(menu => menu.menuId === order.menuId);

            if (!recipe) {
                log.error(`레시피를 찾을 수 없음: 메뉴 ID ${order.menuId}`);
                continue;
            }

            for (let i = 0; i < order.count; i++) {

                // 메뉴 명을 넣어준다
                state.menuName = recipe.name;

                if(recipe.cupYn === "yes") {
                    eventEmitter.emit('order-update', { menu: state.menuName, status: 'generalProduct', message: '구매하신 물품을 가져가주세요.' });
                    log.info(`주문 처리 완료 (${i + 1}/${order.count}): ${recipe.name} - [메뉴 ID: ${recipe.menuId}, 주문 ID: ${order.orderId}]`);
                    // ✅ 3초 대기 (Promise 사용)
                    await new Promise(resolve => setTimeout(resolve, 3000));

                }
                log.info(`주문 처리 시작 (${i + 1}/${order.count}): ${recipe.name} - [메뉴 ID: ${recipe.menuId}, 주문 ID: ${order.orderId}]`);
                // 주문 데이터 처리 시작
                try {
                    await processOrder(recipe, count, totalCount); // 레시피 처리
                    count = count + 1;
                    log.info(`주문 처리 완료 (${i + 1}/${order.count}): ${recipe.name} - [메뉴 ID: ${recipe.menuId}, 주문 ID: ${order.orderId}]`);
                } catch (error) {
                    log.error(`주문 처리 중 오류 발생 (count ${i + 1}/${order.count}): 메뉴 ID ${recipe.menuId}, 오류: ${error.message}`);
                    eventEmitter.emit('order-update', { menu: state.menuName, status: 'error', message: error.message });
                    throw error;// 전체 주문 중단
                }
            }
        } catch (error) {
            log.error(`주문 처리 중 오류 발생: 메뉴 ID ${order.menuId}, 주문 ID ${order.orderId}, 오류: ${error.message}`);
            throw error; // 전체 프로세스 중단
        }
    }
};

// 주문 처리
const processOrder = async (recipe, count, totalCount) => {
    log.info('////////--------------- 주문 요청 --------------------//////');
    log.info('////////--------------- 주문 요청 --------------------//////');
    log.info('////////--------------- 주문 요청 --------------------//////');
    try {
        log.info("주문처리 중 레시피: ", recipe);
        if (recipe.cupYn === 'yes' ) return;

        if (!recipe.cupYn || recipe.cupYn === 'no') {
            if (recipe.iceYn === 'yes') {
                // 컵 + 얼음 동시 동작
                await Promise.all([
                    retry(dispenseCup, [recipe, count, totalCount], 10, '컵 투출'),
                    dispenseIce(recipe, count, totalCount)
                ]);
            } else {

                await retry(dispenseCup, [recipe, count, totalCount], 10, '컵 투출');
            }
        } else if (recipe.iceYn === 'yes') {
            // 컵 없이 얼음만
            await dispenseIce(recipe, count, totalCount);
        }

        const sortedItems = [...recipe.items].sort((a, b) => a.no - b.no);
        for (const [index, item] of sortedItems.entries()) {
            try {

                // 첫 번째 항목에만 컵 센서 체크 로직 추가
                if (index === 0) {

                    // 타임아웃 체크
                    const isStartValid = await checkCupSensor("있음", 3, true, count, totalCount);
                    if (!isStartValid) {
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: `"120초 경과로 기계가 초기화되었습니다."`
                        });
                        log.error(`[에러] 컵 센서 상태가 유효하지 않음: menuId ${recipe.menuId}`);
                        throw new Error(`"120초 경과로 기계가 초기화되었습니다."`);
                    } else {
                        // 화면에 전달하는 메세지
                        eventEmitter.emit('order-update', { menu: `${state.menuName} ${count} / ${totalCount}`, status: 'drink', message: `맛있는 음료를 만들고 있습니다. 잠시만 기다려주세요.` });
                    }
                    log.info(`컵 센서 상태 확인 완료: menuId ${recipe.menuId}`);
                }

                // 각 타입별 작업 처리
                switch (item.type) {
                    case 'coffee':
                        await retry(dispenseCoffee, [item.value1, item.value2, item.value3, item.value4], 10, '커피 추출');
                        break;
                    case 'garucha':
                        await retry(dispenseGarucha, [item.value1, item.value2, item.value3], 10, '가루차 투출');
                        break;
                    case 'syrup':
                        await retry(dispenseSyrup, [item.value1, item.value2, item.value3, item.value4], 10, '시럽 투출');
                        break;
                }

                if (index === sortedItems.length - 1) {
                    const isEndValid = await checkCupSensor("없음", 3, true, count, totalCount);
                    if (!isEndValid) {
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: `"120초 경과로 기계가 초기화되었습니다."`
                        });
                        log.error(`[에러] 컵 센서 상태가 유효하지 않음 (회수 실패): menuId ${recipe.menuId}`);
                        throw new Error(`"120초 경과로 기계가 초기화되었습니다."`);
                    }

                    log.info(`컵 센서 상태 확인 완료 (회수 성공): menuId ${recipe.menuId}`);
                }
            } catch (error) {
                log.error(`[에러] 제조 item No ${item.no} in menu ${recipe.menuId}: ${error.message}`);
                throw error; // 에러를 상위로 전파
            }
        }

        log.info(`제조완료 menu: ${recipe.menuId}`);
    } catch (error) {
        log.error(`메뉴 제조 실패: menuId ${recipe.menuId}, 이유: ${error.message}`);
        throw error; // 상위 호출자로 에러 전파
    }
};

// 에러 발생시 재시도
const retry = async (fn, args = [], retryCount = 1, label = '작업') => {
    for (let attempt = 0; attempt <= retryCount; attempt++) {
        try {
            log.warn(`[RETRY] ${label} 시도 ${attempt + 1}/${retryCount + 1}`);
            return await fn(...args);
        } catch (err) {
            log.error(`[ERROR] ${label} 실패: ${err.message}`);
            if (attempt === retryCount) throw new Error(`${label} 재시도 실패`);
        }
    }
};


const useWash = async (data) => {
    log.info('////////--------------- 세척 요청 --------------------//////');
    log.info('////////--------------- 세척 요청 --------------------//////');
    log.info('////////--------------- 세척 요청 --------------------//////');
    let orderData = data;  // 주문 데이터

    // 전체 메뉴 조회
    const menu = await allProduct();
    if (!menu || !menu.Items) {
        throw new Error("메뉴 데이터 조회에 실패하였습니다.");
    }
    let menuData = menu.Items;

    // 메뉴와 주문 데이터가 정상적으로 로드되었으면 세척 시작
    if (menuData.length > 0) {
        log.info("세척 시작...!");
        const recipe = menuData.filter(menu => orderData.some(ord => ord.menuId === menu.menuId));
        const combinedList = recipe
            .flatMap(entry =>
                entry.items.filter(item => item.type === "garucha" || item.type === "syrup") // 조건 필터링
            )
            .reduce((unique, item) => {
                // 중복 여부 확인 (type과 no 기준)
                if (!unique.some(existing => existing.type === item.type && existing.value1 === item.value1)) {
                    unique.push(item); // 중복되지 않은 항목만 추가
                }
                return unique;
            }, []);

        log.info(`전체 세척 레시피 리스트: ${JSON.stringify(combinedList)}`);

        for (let i = 0; i < combinedList.length; i++) {

            if (i === 0) {
                // 컵 센서 체크
                const isStopValid = await checkCupSensor("없음", 3, false);
                if (!isStopValid) {
                    log.error("컵 센서 상태가 '없음'이 아니어서 세척 작업을 중단합니다.");
                    return; // 작업 중단
                }
            }
            const listData = combinedList[i];
            eventEmitter.emit('order-update', { menu: state.menuName, status: 'washStart', message: '커피머신 세척중입니다 잠시만 기다려주세요.' });
            log.info(`전체 세척 실행: ${JSON.stringify(listData)}`);

            if (listData.type === "garucha") {
                await Order.purifyingTae(listData.value1);
                await checkAutoOperationState("정지", 3);
            }
            if (listData.type === "syrup") {
                await Order.purifyingSyrup(listData.value1);
                await checkAutoOperationState("정지", 3);
            }
            await new Promise((r) => setTimeout(r, 1000));
        }

    } else {
        log.warn("[세척] 메뉴 데이터가 없거나, 오더 데이터가 없습니다.");
    }
    log.info("전체 세척 작업 완료");
    eventEmitter.emit('order-update', { menu: state.menuName, status: 'completed', message: '전체 세척 작업 완료.' });
};


    return { startOrder, processQueue, processOrder, retry, useWash };
}

module.exports = { createSerialOrderProcess };
