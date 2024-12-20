const log = require('../logger');
const { allProduct } = require("../aws/db/utils/getMenu");
const {serialCommCom1, serialCommCom3, serialCommCom4 } = require("../serial/serialCommManager");
const  CupModule = require("../serial/portProcesses/CupModule");
const  IceModule = require("../serial/portProcesses/IceModule");
const  OrderModule = require("../serial/portProcesses/OrderModule");
const serialDataManager  = require('./serialDataManager');
const eventEmitter = require('./events');
const {convertTimeToHex} = require('../util/numberConvert');
const Cup = new CupModule(serialCommCom4);
const Ice = new IceModule(serialCommCom3);
const Order = new OrderModule(serialCommCom1);
const McData = new serialDataManager(serialCommCom1);

let menuName = "";

// 주문 처리 로직
const startOrder = async (data) => {
    try {
        // 주문 데이터 검증
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Invalid or empty order data");
        }
        let orderData = data;  // 주문 데이터

        // 전체 메뉴 조회
        const menu = await allProduct();
        if (!menu || !menu.Items) {
            throw new Error("Failed to load menu data");
        }
        let menuData = menu.Items;

        // 메뉴와 주문 데이터가 정상적으로 로드되었으면 주문 처리 시작
        if (menuData.length > 0) {
            log.info("주문 제조...");
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
    }
};

// 주문 처리 큐
const processQueue = async (orderList, menuList) => {
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
                log.info(`주문 처리 시작 (${i + 1}/${order.count}): ${recipe.name} - [메뉴 ID: ${recipe.menuId}, 주문 ID: ${order.orderId}]`);
                // 주문 데이터 처리 시작
                eventEmitter.emit('order-update', { menu: menuName, status: 'processing', message: '주문 시작되었습니다.' });

                try {
                    await processOrder(recipe); // 레시피 처리
                    log.info(`주문 처리 완료 (${i + 1}/${order.count}): ${recipe.name} - [메뉴 ID: ${recipe.menuId}, 주문 ID: ${order.orderId}]`);
                    eventEmitter.emit('order-update', { menu: menuName, status: 'completed', message: '주문 완료되었습니다.' });
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
const processOrder = async (recipe) => {
    try {
        await dispenseCup(recipe);

        if (recipe.iceYn === 'yes') await dispenseIce(recipe);

        const sortedItems = [...recipe.items].sort((a, b) => a.no - b.no);
        for (const [index, item] of sortedItems.entries()) {
            try {

                // 첫 번째 항목에만 컵 센서 체크 로직 추가
                if (index === 0) {

                    // 타임아웃 체크
                    const isStartValid = await checkCupSensor("있음", 3);
                    if (!isStartValid) {
                        log.error(`[에러] 컵 센서 상태가 유효하지 않음: menuId ${recipe.menuId}`);
                        throw new Error(`Invalid cup sensor state for menuId ${recipe.menuId}`);
                    } else {
                        // 화면에 전달하는 메세지
                        eventEmitter.emit('order-update', { menu: menuName, status: 'drink', message: '맛있는 음료를 만들고 있습니다. 잠시만 기다려주세요.' });
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
                    const isEndValid = await checkCupSensor("없음", 3);
                    if (!isEndValid) {
                        log.error(`[에러] 컵 센서 상태가 유효하지 않음 (회수 실패): menuId ${recipe.menuId}`);
                        throw new Error(`Invalid cup sensor state after manufacturing for menuId ${recipe.menuId}`);
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
const dispenseCup = (recipe) => {
    return new Promise(resolve => {
        setTimeout(async () => {
            const result = await Cup.getCupInfo(); // `getSomeData()`는 조회하는 함수입니다.
            log.info(`menu: ${recipe.name} - [${recipe.menuId}] : 컵디스펜서 상태 cup: ${recipe.cup}, 컵1(PL)모터ON=${result.plasticCup.motorActive}, 컵2(PA)모터ON=${result.paperCup.motorActive}`);

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

const dispenseIce = (recipe) => {
    return new Promise(async (resolve, reject) => {
        try {
            let totalTime = "";
            log.info(`얼음 세팅 중: ${recipe.iceTime}초, 물 세팅 중: ${recipe.waterTime}초`);
            await Ice.sendIceTimePacket(convertTimeToHex(recipe.iceTime));
            await Ice.sendWaterTimePacket(convertTimeToHex(recipe.waterTime));
            await Ice.sendIceRunPacket();
            const initialStatus = await Ice.getKaiserInfo();
            totalTime = initialStatus.match(/.{1,2}/g)[6];
            log.info(`menu: ${recipe.name} - [${recipe.menuId}] : ${JSON.stringify(totalTime)}`);
            log.info('출빙 요청이 완료되었습니다. 상태를 감시합니다.');
            log.info('얼음을 받아주세요'); // [TODO] 음성 메시지 호출

            // 화면 노출 메세지
            eventEmitter.emit('order-update', { menu: menuName, status: 'ice', message: '얼음을 받아주세요.' });

            for (let counter = 0; counter < 120; counter++) {
                const result = await Ice.getKaiserInfo();
                if (counter >= 90) {
                    eventEmitter.emit('order-update', { menu: menuName, status: 'iceCount', message: '30 초뒤에 초기화됩니다.', time: counter });
                } else {
                    eventEmitter.emit('order-update', { menu: menuName, status: 'iceCount', message: '얼음을 받아주세요.', time: counter });
                }

                log.info(`menu: ${recipe.name} - [${recipe.menuId}] : ${JSON.stringify(result)} ${counter}/120`);
                const hexArray = result.match(/.{1,2}/g);
                log.info(`menu: ${recipe.name} - [${recipe.menuId}] : ${JSON.stringify(hexArray)}`);
                if (hexArray[6] !== totalTime) {
                    log.info('2단계 완료: 얼음 배출 완료 및 다음 플로우로 진행');
                    //await Ice.sendIceStopPacket();
                    resolve();
                    return;
                }
                if(counter >= 119) {
                    await Ice.sendIceStopPacket();
                    reject(new Error('작업 시간이 초과되었습니다.'));
                    return;
                }

                await new Promise(r => setTimeout(r, 1000));
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
            const formatValue = (value) => value.toString().padStart(3, "0");
            const grinder = (coffee) => {
                const result = Math.round(coffee * 10);
                return formatValue(result);
            };

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
            const formatValue = (value) => value.toString().padStart(3, "0");
            const grinder = (coffee) => {
                const result = Math.round(coffee * 10);
                return formatValue(result);
            };

            // RD1 데이터 확인
            await McData.updateSerialData('RD1', 'RD1');
            const data = McData.getSerialData('RD1');
            log.info("GET GARUCHA INFO ", JSON.stringify(data));

            // Tea 추출 명령
            await Order.sendTeaCommand(motor, grinder(extraction), formatValue(hotwater));
            log.info(`${motor} Tea 추출 실행`);
            await Order.extractTeaPowder();

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
            const formatValue = (value) => value.toString().padStart(3, "0");
            const grinder = (coffee) => {
                const result = Math.round(coffee * 10);
                return formatValue(result);
            };

            // RD1 데이터 확인
            await McData.updateSerialData('RD1', 'RD1');
            const data = McData.getSerialData('RD1');
            log.info("GET SYRUP INFO ", JSON.stringify(data));

            // Syrup 추출 명령
            await Order.setSyrup(motor, grinder(extraction), formatValue(hotwater), formatValue(sparkling));
            log.info(`${motor} Syrup 추출 실행`);
            await Order.extractSyrup();

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

const checkCupSensor = async (expectedState, threshold) => {
    let stateCount = 0; // 상태 카운터
    for (let counter = 0; counter < 120; counter++) {
        const startTime = Date.now(); // 루프 시작 시간 기록
        await McData.updateSerialData('RD1', 'RD1');
        const data = McData.getSerialData('RD1');
        log.info(`컵 센서 time out 여부 ${expectedState} :  ${counter}/ 120`);

        // 모달 동작
        if (expectedState === "있음" ) {
            eventEmitter.emit('order-update', { menu: menuName, status: 'drinkCount', message: '컵을 음료 투출구에 놓아주세요.', time: counter });
        }

        if (expectedState === "없음" ) {
            eventEmitter.emit('order-update', { menu: menuName, status: 'completedCount', message: '음료가 완성되었습니다. 컵을꺼내주세요.', time: counter });

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
                const isStopValid = await checkCupSensor("없음", 3);
                if (!isStopValid) {
                    log.error("컵 센서 상태가 '없음'이 아니어서 세척 작업을 중단합니다.");
                    return; // 작업 중단
                }
            }
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

    } else {
        log.warn("[세척] 메뉴 데이터가 없거나, 오더 데이터가 없습니다.");
    }
    log.info("전체 세척 작업 완료");
};

// 주문 처리 시작
processQueue().then();

module.exports = {
    startOrder,
    useWash
};
