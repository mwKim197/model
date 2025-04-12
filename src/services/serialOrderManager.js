const log = require('../logger');
const { allProduct } = require("../aws/db/utils/getMenu");
const {serialCommCom1, serialCommCom3, serialCommCom4 } = require("../serial/serialCommManager");
const CupModule = require("../serial/portProcesses/CupModule");
const IceModule = require("../serial/portProcesses/IceModule");
const OrderModule = require("../serial/portProcesses/OrderModule");
const serialDataManager  = require('./serialDataManager');
const eventEmitter = require('./events');
const Cup = new CupModule(serialCommCom4);
const Ice = new IceModule(serialCommCom3);
const Order = new OrderModule(serialCommCom1);
const McData = new serialDataManager(serialCommCom1);

let menuName = "";

// 주문 처리 로직
const startOrder = async (data) => {
    try {

        // 주문 데이터 검증
        if (!Array.isArray(data.orderList) || data.orderList.length === 0) {
            throw new Error("Invalid or empty order data");
        }
        let orderData = data.orderList;  // 주문 데이터

        // 전체 메뉴 조회
        const menu = await allProduct();
        if (!menu || !menu.Items) {
            throw new Error("Failed to load menu data");
        }
        let menuData = menu.Items;

        // 메뉴와 주문 데이터가 정상적으로 로드되었으면 주문 처리 시작
        if (menuData.length > 0) {
            log.info("주문 제조...");
            log.info("주문 목록: ", orderData);
            await processQueue(orderData, menuData).catch((error) => {
                log.error("Error in startOrder:", error.message);
                throw error; // 명시적으로 에러를 다시 던짐
            });
            await useWash(orderData);
        } else {
            log.warn("메뉴, 주문 정보 없음.");
        }
    } catch (error) {
        log.error("Error in startOrder:", error.message);
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
    let count = totalCount;

    for (const order of orderList) {
        try {

            const recipe = menuList.find(menu => menu.menuId === order.menuId);

            if (!recipe) {
                log.error(`레시피를 찾을 수 없음: 메뉴 ID ${order.menuId}`);
                continue;
            }

            for (let i = 0; i < order.count; i++) {

                // 메뉴 명을 넣어준다
                menuName = recipe.name;

                if(recipe.cupYn === "yes") {
                    eventEmitter.emit('order-update', { menu: menuName, status: 'generalProduct', message: '구매하신 물품을 가져가주세요.' });
                    log.info(`주문 처리 완료 (${i + 1}/${order.count}): ${recipe.name} - [메뉴 ID: ${recipe.menuId}, 주문 ID: ${order.orderId}]`);
                    // ✅ 3초 대기 (Promise 사용)
                    await new Promise(resolve => setTimeout(resolve, 3000));

                }
                log.info(`주문 처리 시작 (${i + 1}/${order.count}): ${recipe.name} - [메뉴 ID: ${recipe.menuId}, 주문 ID: ${order.orderId}]`);
                // 주문 데이터 처리 시작
                try {
                    await processOrder(recipe, count, totalCount); // 레시피 처리
                    count = count - 1;
                    log.info(`주문 처리 완료 (${i + 1}/${order.count}): ${recipe.name} - [메뉴 ID: ${recipe.menuId}, 주문 ID: ${order.orderId}]`);
                } catch (error) {
                    log.error(`주문 처리 중 오류 발생 (count ${i + 1}/${order.count}): 메뉴 ID ${recipe.menuId}, 오류: ${error.message}`);
                    eventEmitter.emit('order-update', { menu: menuName, status: 'error', message: error.message });
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
    try {
        log.info("주문처리중 레시피: ", recipe);
        if (recipe.cupYn === 'yes' ) return;
        if (!recipe.cupYn || recipe.cupYn === 'no' ) await dispenseCup(recipe, count, totalCount);

        if (recipe.iceYn === 'yes') await dispenseIce(recipe, count, totalCount);

        const sortedItems = [...recipe.items].sort((a, b) => a.no - b.no);
        for (const [index, item] of sortedItems.entries()) {
            try {

                // 첫 번째 항목에만 컵 센서 체크 로직 추가
                if (index === 0) {

                    // 타임아웃 체크
                    const isStartValid = await checkCupSensor("있음", 3, true, count, totalCount);
                    if (!isStartValid) {
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: `"120초 경과로 기계가 초기화되었습니다."`
                        });
                        log.error(`[에러] 컵 센서 상태가 유효하지 않음: menuId ${recipe.menuId}`);
                        throw new Error(`"120초 경과로 기계가 초기화되었습니다."`);
                    } else {
                        // 화면에 전달하는 메세지
                        eventEmitter.emit('order-update', { menu: `${menuName} ${count} / ${totalCount}`, status: 'drink', message: `맛있는 음료를 만들고 있습니다. 잠시만 기다려주세요.` });
                    }
                    log.info(`컵 센서 상태 확인 완료: menuId ${recipe.menuId}`);
                }

                // 각 타입별 작업 처리
                switch (item.type) {
                    case 'coffee':
                        await dispenseCoffee(item.value1, item.value2, item.value3, item.value4);
                        break;
                    case 'garucha':
                        await dispenseGarucha(item.value1, item.value2, item.value3);
                        break;
                    case 'syrup':
                        await dispenseSyrup(item.value1, item.value2, item.value3, item.value4);
                        break;
                    default:
                        log.warn(`아이템 타입을 찾을 수 없습니다.: ${item.type}`);
                        break;
                }

                if (index === sortedItems.length - 1) {
                    const isEndValid = await checkCupSensor("없음", 3, true, count, totalCount);
                    if (!isEndValid) {
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
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
        log.error(`[에러] 메뉴 제조 실패: menuId ${recipe.menuId}, 이유: ${error.message}`);
        throw error; // 상위 호출자로 에러 전파
    }
};

// 제조 단계 함수
const dispenseCup = (recipe, count, totalCount) => {
    return new Promise(resolve => {
        setTimeout(async () => {
            const result = await Cup.getCupInfo(); // `getSomeData()`는 조회하는 함수입니다.
            log.info(`menu: ${recipe.name} - [${recipe.menuId}] : 컵디스펜서 상태 cup: ${recipe.cup}, 컵1(PL)모터ON=${result.plasticCup.motorActive}, 컵2(PA)모터ON=${result.paperCup.motorActive}`);
            eventEmitter.emit('order-update', { menu: `${recipe.name} ${count} / ${totalCount}`, status: 'processing', message: `메뉴를 준비중입니다.` });
            if (recipe.cup === 'plastic') {
                log.info(`menu: ${recipe.name} - [${recipe.menuId}] : GoCupOut, cup: 'plastic'`);
                await Cup.getPlasticCupUsage();
            }

            if (recipe.cup === 'paper') {
                log.info(`menu: ${recipe.name} - [${recipe.menuId}] : GoCupOut, cup: 'paper'`);
                await Cup.getPaperCupUsage();
            }

            let stopCup = 0;
            const checkCondition = async (counter = 0) => {
                // 비동기 함수 실행 후 일정 시간 지연
                if (counter >= 60) {
                    log.error('Cup time out 동작 정지 요청을 보냅니다.');
                    await Cup.stopCupMotor();
                    resolve();
                    return;
                }

                const result = await Cup.getCupInfo();
                log.info(`menu: ${recipe.name} - [${recipe.menuId}] : 컵디스펜서 상태 cup: ${recipe.cup}, 컵1(PL)모터ON=${result.plasticCup.motorActive}, 컵2(PA)모터ON=${result.paperCup.motorActive} ${counter + 1} / 60`);

                // 조회한 값이 false 이면 멈추기
                if (recipe.cup === "plastic" && result.plasticCup.motorActive === 0 ) {
                    stopCup++;
                }
                if (recipe.cup === "paper" && result.paperCup.motorActive === 0) {
                    stopCup++;
                }

                if ( stopCup >= 2) {
                    log.info(`menu: ${recipe.name} - [${recipe.menuId}] : 컵 추출이 완료되었습니다. 동작 정지 요청을 보냅니다.`);
                    await Cup.stopCupMotor();
                    resolve();
                    return;
                }

                // 1초 후에 다시 호출
                setTimeout(() => checkCondition(counter + 1), 1000);
            }

            // 상태 확인 함수 호출
            await checkCondition();
        }, 1000);
    });
};

const dispenseIce = (recipe, count, totalCount) => {
    return new Promise(async (resolve, reject) => {
        try {
            let totalTime = 0;
            log.info(`얼음 세팅 중: ${recipe.iceTime}초, 물 세팅 중: ${recipe.waterTime}초`);
            await Ice.sendIceTimePacket(recipe.iceTime);
            await Ice.sendWaterTimePacket(recipe.waterTime);
            await Ice.sendIceRunPacket();
            const initialStatus = await Ice.getKaiserInfo();
            totalTime = initialStatus.match(/.{1,2}/g)[7];
            log.info(`menu: ${recipe.name} - [${recipe.menuId}] : ${JSON.stringify(totalTime)}`);
            log.info('출빙 요청이 완료되었습니다. 상태를 감시합니다.');
            log.info('얼음을 받아주세요');
            let initialValue = null; // 최초 상태값 저장
            let stableTime = 0; // 변경 후 유지 시간
            let valueChanged = false; // 값 변경 여부 플래그
            let minWaitTime = 7; // 최소 대기 시간 설정
            let minWaitCounter = 0; // 최소 대기 시간 카운터

            let waterTime = Number(recipe.waterTime);
            if (Number(recipe.waterTime) >= 3) {
                waterTime = waterTime - 2;
            }
            totalTime = Number(recipe.iceTime) + waterTime
            log.info('[totalTime] : ', totalTime);

            // 화면 노출 메세지
            eventEmitter.emit('order-update', { menu: `${menuName} ${count} / ${totalCount}`, status: 'ice', message: `제빙기에서 얼음을 받아주세요.` });

            for (let counter = 0; counter < 120; counter++) {
                eventEmitter.emit('order-update', { menu: `${menuName} ${count} / ${totalCount}`, status: 'iceCount', message: `제빙기에서 얼음을 받아주세요.`, time: counter });
                const result = await Ice.getKaiserInfo();
                const currentHexArray = result.match(/.{1,2}/g); // 2자리씩 끊어서 배열 생성
                const currentValue = parseInt(currentHexArray[7]); // 16진수 → 10진수 변환

                log.info(`Current Value (hexArray[7]): ${currentValue}`);

                if (!valueChanged) {
                    // 값 변경 전 (처음 값 유지)
                    if (initialValue === null) {
                        // 최초로 값을 설정
                        initialValue = currentValue;
                        log.info(`Initial Value Detected: ${initialValue}`);
                    } else if (currentValue === initialValue) {
                        // 같은 값이 유지되는 경우
                        log.info(`Initial Value 유지 중: ${initialValue}`);
                    } else {
                        // 값이 변경된 경우
                        valueChanged = true; // 변경 플래그 설정
                        stableTime = 0; // 변경 후 유지 시간 초기화
                        initialValue = currentValue; // 새로운 값으로 업데이트
                        log.info(`값 변경 감지: 새로운 값(${currentValue})으로 전환. 시간 체크 시작.`);
                    }
                } else {
                    stableTime++;
                    log.info(`변경된 값 : ${stableTime}/${totalTime}초`);
                }

                // 최소 대기 시간 체크
                if (minWaitCounter < minWaitTime) {
                    minWaitCounter++;
                    log.info(`최소 대기 시간 유지 중: ${minWaitCounter}/${minWaitTime}초`);
                } else if (valueChanged && stableTime >= totalTime) {
                    // 최소 대기 시간 충족 후 변경된 값이 totalTime만큼 유지된 경우
                    log.info('변경된 값이 일정 시간 동안 유지됨. 다음 루틴으로 진행합니다...');
                    resolve(); // 작업 완료로 처리
                    return;
                }

                if (counter >= 119) {
                    await Ice.sendIceStopPacket();
                    reject(new Error(`"120초 경과로 기계가 초기화되었습니다."`));
                    return;
                }

                await new Promise(r => setTimeout(r, 1000)); // 1초 대기
            }

        } catch (error) {
            log.error('dispenseIce 오류:', error.message);
            reject(error);
        }
    });
};

const dispenseCoffee = (grinderOne, grinderTwo, extraction, hotWater) => {
    return new Promise(async (resolve, reject) => {
        try {

            // RD1 데이터 확인
            await McData.updateSerialData('RD1', 'RD1');
            const data = McData.getSerialData('RD1');
            log.info("GET COFFEE INFO ", data);
            log.info(`coffee set!!!  : ${grinderOne}, ${grinderTwo}, ${extraction}, ${hotWater}`);

            // Coffee 추출 명령
            await Order.sendCoffeeCommand(
                grinder(grinderOne),
                grinder(grinderTwo),
                formatValue(extraction),
                formatValue(hotWater)
            );
            log.info(`coffee 추출 실행`);
            await Order.extractCoffee();

            const isCoffee = await checkAutoOperationState("커피", 2);

            // 가루차 동작 확인
            if (!isCoffee) {
                await Order.extractCoffee();
            }

            const isStopped = await checkAutoOperationState("정지", 3);

            if (isStopped) {
                log.info(`coffee 추출 완료: ${isStopped}`);
                resolve(); // 성공적으로 종료
            }
        } catch (error) {
            log.error('dispenseCoffee 오류:', error.message);
            return reject(error); // 상위 호출자로 에러 전파
        }
    });
};



const dispenseGarucha = (motor, extraction, hotwater) => {
    return new Promise(async (resolve, reject) => {
        try {

            // RD1 데이터 확인
            await McData.updateSerialData('RD1', 'RD1');
            const data = McData.getSerialData('RD1');
            log.info("GET GARUCHA INFO ", JSON.stringify(data));

            // Tea 추출 명령
            await Order.sendTeaCommand(motor, grinder(extraction), formatValue(hotwater));
            log.info(`${motor} Tea 추출 실행`);
            await Order.extractTeaPowder();

            const isGarucha = await checkAutoOperationState("가루차", 2);

            // 가루차 동작 확인
            if (!isGarucha) {
                await Order.extractTeaPowder();
            }

            const isStopped = await checkAutoOperationState("정지", 3);

            if (isStopped) {
                log.info(`Tea 추출 완료: ${isStopped}`);
                resolve(); // 성공적으로 종료
            }

        } catch (error) {
            log.error('dispenseGarucha 오류:', error.message);
            return reject(error);
        }
    });
};


const dispenseSyrup = (motor, extraction, hotwater, sparkling) => {
    return new Promise(async (resolve, reject) => {
        try {

            // RD1 데이터 확인
            await McData.updateSerialData('RD1', 'RD1');
            const data = McData.getSerialData('RD1');
            log.info("GET SYRUP INFO ", JSON.stringify(data));

            // Syrup 추출 명령
            await Order.setSyrup(motor, grinder(extraction), formatValue(hotwater), formatValue(sparkling));
            log.info(`${motor} Syrup 추출 실행`);
            await Order.extractSyrup();

            const isSyrup = await checkAutoOperationState("시럽", 2);

            // 가루차 동작 확인
            if (!isSyrup) {
                await Order.extractSyrup();
            }

            const isStopped = await checkAutoOperationState("정지", 3);

            if (isStopped) {
                log.info(`Syrup 추출 완료: ${isStopped}`);
                resolve(); // 성공적으로 종료
            }
        } catch (error) {
            log.error('dispenseSyrup 오류:', error.message);
            return reject(error);
        }
    });
};

/*
*  washChk : true 메세지 노출
* */
const checkCupSensor = async (expectedState, threshold, washChk, count, totalCount) => {
    let stateCount = 0; // 상태 카운터
    for (let counter = 0; counter < 120; counter++) {
        const startTime = Date.now(); // 루프 시작 시간 기록
        await McData.updateSerialData('RD1', 'RD1');
        const data = McData.getSerialData('RD1');
        log.info(`컵 센서 time out 여부 ${expectedState} :  ${counter}/ 120`);

        // 모달 동작
        if (expectedState === "있음" && washChk ) {
            eventEmitter.emit('order-update', { menu: `${menuName} ${count} / ${totalCount}`, status: 'drinkCount', message: `컵을 음료 투출구에 놓아주세요.`, time: counter });
        }

        if (expectedState === "없음" && washChk ) {
            eventEmitter.emit('order-update', { menu: `${menuName} ${count} / ${totalCount}`, status: 'completedCount', message: `음료가 완성되었습니다. 컵을꺼내주세요.`, time: counter });

        }

        if (data.cupSensor === expectedState) {
            stateCount++;
            log.info(`Sensor state is '${expectedState}', count: ${stateCount}`);
            if (stateCount >= threshold) {
                log.info(`Sensor state reached '${expectedState}' ${threshold} times. Exiting loop.`);
                return true; // 조건 충족 시 함수 종료
            }
        } else {
            stateCount = 0; // 상태가 맞지 않으면 카운터 초기화
        }

        const elapsedTime = Date.now() - startTime; // 루프 실행 시간 계산
        const remainingTime = 1000 - elapsedTime; // 남은 시간 계산
        if (remainingTime > 0) {
            await new Promise((r) => setTimeout(r, remainingTime)); // 남은 시간만큼 대기
        }
    }

    log.warn(`Sensor state did not reach '${expectedState}' threshold within timeout.`);
    return false; // 타임아웃 처리
};

const checkAutoOperationState = async (expectedState, threshold) => {
    let stateCount = 0; // 상태 카운터

    for (let counter = 0; counter < 1200; counter++) {
        const startTime = Date.now(); // 루프 시작 시간 기록

        await McData.updateSerialData('RD1', 'RD1');
        const data = McData.getSerialData('RD1');

        if (data.autoOperationState === expectedState) {
            stateCount++;
            // 로그 출력
            if ((counter % 10) === 0) {
                log.info(`자동운전 동작상태: '${expectedState}', count: ${stateCount}`);
            }
            if (stateCount >= threshold) {
                log.info(`자동운전 동작상태: '${expectedState}' ${threshold} 회 END.`);
                return true; // 조건 충족 시 함수 종료
            }
        } else {
            stateCount = 0; // 상태가 맞지 않으면 카운터 초기화
        }

        // 루프 실행 시간 측정
        const elapsedTime = Date.now() - startTime;
        const remainingTime = 100 - elapsedTime; // 남은 시간 계산
        if (remainingTime > 0) {
            await new Promise((r) => setTimeout(r, remainingTime));
        }
    }

    log.warn(`Sensor state did not reach '${expectedState}' threshold within timeout.`);
    return false; // 타임아웃 처리
};


const useWash = async (data) => {
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
            eventEmitter.emit('order-update', { menu: menuName, status: 'washStart', message: '커피머신 세척중입니다 잠시만 기다려주세요.' });
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
    eventEmitter.emit('order-update', { menu: menuName, status: 'completed', message: '전체 세척 작업 완료.' });
};

const adminDrinkOrder = async (recipe) => {
    try {
        // 시작 이벤트 전송
        menuName = recipe.name;
        eventEmitter.emit('order-update', { menu: menuName, status: 'processing', message: '관리자가 조작중입니다. 음료가 준비중입니다.' });
        const sortedItems = [...recipe.items].sort((a, b) => a.no - b.no);
        for (const [index, item] of sortedItems.entries()) {
            try {
                // 첫 번째 항목에만 컵 센서 체크 로직 추가
                if (index === 0) {
                    const isStartValid = await checkCupSensor("있음", 3, true);
                    if (!isStartValid) {
                        log.error(`[에러] 컵 센서 상태가 유효하지 않음: menuId ${recipe.menuId}`);
                        throw new Error(`120초 경과로 기계가 초기화되었습니다.`);
                    } else {
                        eventEmitter.emit('order-update', {
                            menu: menuName, // 수정: menuName 변수 대신 recipe.menuName 사용
                            status: 'drink',
                            message: '관리자가 조작중입니다. 음료가 투출 됩니다.'
                        });
                    }
                    log.info(`컵 센서 상태 확인 완료: menuId ${recipe.menuId}`);
                }

                // 각 타입별 작업 처리
                switch (item.type) {
                    case 'coffee':
                        await dispenseCoffee(item.value1, item.value2, item.value3, item.value4);
                        break;
                    case 'garucha':
                        await dispenseGarucha(item.value1, item.value2, item.value3);
                        break;
                    case 'syrup':
                        await dispenseSyrup(item.value1, item.value2, item.value3, item.value4);
                        break;
                    default:
                        log.warn(`아이템 타입을 찾을 수 없습니다.: ${item.type}`);
                        break;
                }

                // 마지막 항목 처리
                if (index === sortedItems.length - 1) {
                    const isEndValid = await checkCupSensor("없음", 3,false);
                    if (!isEndValid) {
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: `"120초 경과로 기계가 초기화되었습니다."`
                        });
                        log.error(`[에러] 컵 센서 상태가 유효하지 않음 (회수 실패): menuId ${recipe.menuId}`);
                        throw new Error(`120초 경과로 기계가 초기화되었습니다.`);
                    } else {
                        log.info(`컵 센서 상태 확인 완료 (회수 성공): menuId ${recipe.menuId}`);
                        log.info("세척 시작...!");
                        eventEmitter.emit('order-update', { status: 'washStart', message: '커피머신 세척중입니다 잠시만 기다려주세요.' });

                        // 필터링 및 중복 제거
                        const combinedList = recipe.items
                            .filter(item => item.type === "garucha" || item.type === "syrup") // 조건 필터링
                            .reduce((unique, item) => {
                                // 중복 여부 확인 (type과 value1 기준)
                                if (!unique.some(existing => existing.type === item.type && existing.value1 === item.value1)) {
                                    unique.push(item); // 중복되지 않은 항목만 추가
                                }
                                return unique;
                            }, []);

                        log.info(`전체 세척 레시피 리스트: ${JSON.stringify(combinedList)}`);

                        for (let i = 0; i < combinedList.length; i++) {

                            const listData = combinedList[i];

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
                        eventEmitter.emit('order-update', { menu: menuName, status: 'completed', message: '전체 세척 작업 완료.' });
                        menuName = "";
                    }
                }
            } catch (error) {
                log.error(`[에러] 제조 item No ${item.no} in menu ${recipe.menuId}: ${error.message}`);
                throw error; // 에러를 상위로 전파
            }
        }
    } catch (error) {
        throw error; // 에러를 상위로 전파
    } finally {
        menuName = "";
        // 종료 이벤트 전송 (성공 또는 실패 모두 포함)
        eventEmitter.emit('order-update', {
            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
            status: 'completed',
            message: '관리자 조작이 완료되었습니다.'
        });
    }
}

const adminCupOrder = (recipe) => {
    try {
        // 시작 이벤트 전송
        eventEmitter.emit('order-update', { menu: recipe.name, status: 'processing', message: '관리자가 조작중입니다. 컵이 준비중입니다.' });
        return new Promise(resolve => {
            setTimeout(async () => {
                const result = await Cup.getCupInfo(); // `getSomeData()`는 조회하는 함수입니다.
                log.info(`menu: ${recipe.name} - [${recipe.menuId}] : 컵디스펜서 상태 cup: ${recipe.cup}, 컵1(PL)모터ON=${result.plasticCup.motorActive}, 컵2(PA)모터ON=${result.paperCup.motorActive}`);
                eventEmitter.emit('order-update', { menu: recipe.name, status: 'processing', message: `메뉴를 준비중입니다.` });
                if (recipe.cup === 'plastic') {
                    log.info(`menu: ${recipe.name} - [${recipe.menuId}] : GoCupOut, cup: 'plastic'`);
                    await Cup.getPlasticCupUsage();
                }

                if (recipe.cup === 'paper') {
                    log.info(`menu: ${recipe.name} - [${recipe.menuId}] : GoCupOut, cup: 'paper'`);
                    await Cup.getPaperCupUsage();
                }

                let stopCup = 0;
                const checkCondition = async (counter = 0) => {
                    // 비동기 함수 실행 후 일정 시간 지연
                    if (counter >= 60) {
                        log.error('Cup time out 동작 정지 요청을 보냅니다.');
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: "60초 경과로 기계가 초기화되었습니다."
                        });
                        await Cup.stopCupMotor();
                        resolve();
                        return;
                    }

                    const result = await Cup.getCupInfo();
                    log.info(`menu: ${recipe.name} - [${recipe.menuId}] : 컵디스펜서 상태 cup: ${recipe.cup}, 컵1(PL)모터ON=${result.plasticCup.motorActive}, 컵2(PA)모터ON=${result.paperCup.motorActive} ${counter + 1} / 60`);

                    // 조회한 값이 false 이면 멈추기
                    if (recipe.cup === "plastic" && result.plasticCup.motorActive === 0 ) {
                        stopCup++;
                    }
                    if (recipe.cup === "paper" && result.paperCup.motorActive === 0) {
                        stopCup++;
                    }

                    if ( stopCup >= 2) {
                        log.info(`menu: ${recipe.name} - [${recipe.menuId}] : 컵 추출이 완료되었습니다. 동작 정지 요청을 보냅니다.`);
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: '관리자 조작이 완료되었습니다.'
                        });
                        await Cup.stopCupMotor();
                        resolve();
                        return;
                    }

                    // 1초 후에 다시 호출
                    setTimeout(() => checkCondition(counter + 1), 1000);
                }

                // 상태 확인 함수 호출
                await checkCondition();
            }, 1000);
        });

    } catch (error) {
        throw error; // 에러를 상위로 전파
    } finally {
        menuName = "";
        // 종료 이벤트 전송 (성공 또는 실패 모두 포함)
        eventEmitter.emit('order-update', {
            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
            status: 'completed',
            message: '관리자 조작이 완료되었습니다.'
        });
    }
};

const adminIceOrder = async (recipe) => {
    try {
        // 시작 이벤트 전송
        eventEmitter.emit('order-update', { menu: recipe.name, status: 'processing', message: '관리자가 조작중입니다. 얼음이 준비중입니다.' });
        return new Promise(async (resolve, reject) => {
            try {
                let totalTime = 0;
                log.info(`얼음 세팅 중: ${recipe.iceTime}초, 물 세팅 중: ${recipe.waterTime}초`);
                await Ice.sendIceTimePacket(recipe.iceTime);
                await Ice.sendWaterTimePacket(recipe.waterTime);
                await Ice.sendIceRunPacket();
                const initialStatus = await Ice.getKaiserInfo();
                totalTime = initialStatus.match(/.{1,2}/g)[7];
                log.info(`menu: ${recipe.name} - [${recipe.menuId}] : ${JSON.stringify(totalTime)}`);
                log.info('출빙 요청이 완료되었습니다. 상태를 감시합니다.');
                log.info('얼음을 받아주세요');
                let initialValue = null; // 최초 상태값 저장
                let stableTime = 0; // 변경 후 유지 시간
                let valueChanged = false; // 값 변경 여부 플래그
                let minWaitTime = 7; // 최소 대기 시간 설정
                let minWaitCounter = 0; // 최소 대기 시간 카운터
                menuName = recipe.name;
                let waterTime = Number(recipe.waterTime);
                if (Number(recipe.waterTime) >= 3) {
                    waterTime = waterTime - 2;
                }
                totalTime = Number(recipe.iceTime) + waterTime
                log.info('[totalTime] : ', totalTime);

                // 화면 노출 메세지
                eventEmitter.emit('order-update', { menu: menuName, status: 'ice', message: '제빙기에서 얼음을 받아주세요.' });

                for (let counter = 0; counter < 120; counter++) {
                    eventEmitter.emit('order-update', { menu: menuName, status: 'iceCount', message: '얼음을 받아주세요.', time: counter });
                    const result = await Ice.getKaiserInfo();
                    const currentHexArray = result.match(/.{1,2}/g); // 2자리씩 끊어서 배열 생성
                    const currentValue = parseInt(currentHexArray[7]); // 16진수 → 10진수 변환

                    log.info(`Current Value (hexArray[7]): ${currentValue}`);

                    if (!valueChanged) {
                        // 값 변경 전 (처음 값 유지)
                        if (initialValue === null) {
                            // 최초로 값을 설정
                            initialValue = currentValue;
                            log.info(`Initial Value Detected: ${initialValue}`);
                        } else if (currentValue === initialValue) {
                            // 같은 값이 유지되는 경우
                            log.info(`Initial Value 유지 중: ${initialValue}`);
                        } else {
                            // 값이 변경된 경우
                            valueChanged = true; // 변경 플래그 설정
                            stableTime = 0; // 변경 후 유지 시간 초기화
                            initialValue = currentValue; // 새로운 값으로 업데이트
                            log.info(`값 변경 감지: 새로운 값(${currentValue})으로 전환. 시간 체크 시작.`);
                        }
                    } else {
                        stableTime++;
                        log.info(`변경된 값 : ${stableTime}/${totalTime}초`);
                    }

                    // 최소 대기 시간 체크
                    if (minWaitCounter < minWaitTime) {
                        minWaitCounter++;
                        log.info(`최소 대기 시간 유지 중: ${minWaitCounter}/${minWaitTime}초`);
                    } else if (valueChanged && stableTime >= totalTime) {
                        menuName = "";
                        // 종료 이벤트 전송 (성공 또는 실패 모두 포함)
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: '관리자 조작이 완료되었습니다.'
                        });
                        // 최소 대기 시간 충족 후 변경된 값이 totalTime만큼 유지된 경우
                        log.info('변경된 값이 일정 시간 동안 유지됨. 다음 루틴으로 진행합니다...');
                        resolve(); // 작업 완료로 처리
                        return;
                    }

                    if (counter >= 119) {
                        await Ice.sendIceStopPacket();
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: "120초 경과로 기계가 초기화되었습니다."
                        });
                        reject(new Error('작업 시간이 초과되었습니다.'));
                        return;
                    }

                    await new Promise(r => setTimeout(r, 1000)); // 1초 대기
                }

            } catch (error) {
                log.error('dispenseIce 오류:', error.message);
                reject(error);
            }
        });
    } catch (error) {
        throw error; // 에러를 상위로 전파
    } finally {
        menuName = "";
        // 종료 이벤트 전송 (성공 또는 실패 모두 포함)
        eventEmitter.emit('order-update', {
            menu: recipe.name, // 수정: menuName 변수 대신 recipe.name 사용
            status: 'completed',
            message: '관리자 조작이 완료되었습니다.'
        });
    }
}

/**
 *  관리자 세척
 *  */
const adminUseWash = async (data) => {
    let washData = data.data;  // 세척 데이터

    // 세척데이터가 리스트로 들어오면 세척 시작
    if (washData.length > 0) {
        try {
            log.info(`어드민 세척 레시피 리스트: ${JSON.stringify(washData)}`);
            for (let i = 0; i < washData.length; i++) {

                const listData = washData[i];
                eventEmitter.emit('order-update', {
                    status: 'washStart',
                    message: '[관리자] 커피머신 세척중입니다 잠시만 기다려주세요.'
                });
                log.info(`전체 세척 실행: ${JSON.stringify(listData)}`);
                if (listData.type === "coffee") {
                    await Order.purifyingCoffee();
                    await checkAutoOperationState("정지", 3);
                }
                if (listData.type === "garucha") {
                    await Order.sendTeaCommand(listData.value1, grinder(0), formatValue(100));
                    await Order.extractTeaPowder();
                    await checkAutoOperationState("정지", 3);
                }
                if (listData.type === "syrup") {
                    await Order.setSyrup(listData.value1, grinder(0), formatValue(100),formatValue(0));
                    await Order.extractSyrup();
                    await checkAutoOperationState("정지", 3);
                }
                await new Promise((r) => setTimeout(r, 1000));
            }
        } catch (e) {
            log.error(`세척중 에러가 발생했습니다. ${e}`);
            eventEmitter.emit('order-update', {status: 'completed', message: '전체 세척 작업 완료.' });
        }
    } else {
        log.warn("[세척] 메뉴 데이터가 없습니다.");
    }
    log.info("전체 세척 작업 완료");
    eventEmitter.emit('order-update', {status: 'completed', message: '전체 세척 작업 완료.' });
};

// 커피머신 예열
const coffeePreheating = async () => {
    eventEmitter.emit('order-update', {
        status: 'washStart',
        message: '커피머신 예열중 입니다 잠시만 기다려주세요.'
    });

    await Order.purifyingCoffee();
    log.info("커피머신 예열 작업 완료");
    eventEmitter.emit('order-update', {status: 'completed', message: '커피머신 예열 완료.' });
}

// 추출기 원점
const extractorHome = async () => {
    try {
        log.info("추출기 원점 동작");
        await Order.extractorHome();
    } catch (e) {
        log.error(`추출기 원점 동작중 에러가 발생했습니다. ${e}`);
    }
}

const formatValue = (value) => value.toString().padStart(3, "0");
const grinder = (moter) => {
    const result = Math.round(moter * 10);
    return formatValue(result);
};

// 주문 처리 시작
processQueue().then();

module.exports = {
    startOrder,
    dispenseCup,
    dispenseIce,
    dispenseCoffee,
    useWash,
    adminDrinkOrder,
    adminCupOrder,
    adminIceOrder,
    adminUseWash,
    coffeePreheating,
    extractorHome
};
