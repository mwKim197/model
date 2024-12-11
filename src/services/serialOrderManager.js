const log = require('../logger');
const { allProduct } = require("../aws/db/utils/getMenu");
const {serialCommCom1, serialCommCom3, serialCommCom4 } = require("../serial/serialCommManager");
const  CupModule = require("../serial/portProcesses/CupModule");
const  IceModule = require("../serial/portProcesses/IceModule");
const  OrderModule = require("../serial/portProcesses/OrderModule");
const serialDataManager  = require('./serialDataManager');
const {convertTimeToHex} = require('../util/numberConvert');
const Cup = new CupModule(serialCommCom4);
const Ice = new IceModule(serialCommCom3);
const Order = new OrderModule(serialCommCom1);
const McData = new serialDataManager(serialCommCom1);

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
            log.info("Processing order...");
            await processQueue(orderData, menuData);
        } else {
            log.warn("Menu data is empty, cannot process order.");
        }
    } catch (error) {
        log.error("Error in startOrder:", error.message);
        throw error; // 명시적으로 에러를 다시 던짐
    }
};

// 주문 처리 큐
const processQueue = async (orderList, menuList) => {

    for (const order of orderList) {
        const recipe = menuList.find(menu => menu.menuId === order.menuId); // 제조 레시피 찾기

        if (!recipe) {
            log.error(`레시피를 찾을 수 없음: 메뉴 ID ${order.menuId}`);
            continue;
        }
        log.info(`${recipe.name} - [${recipe.menuId}] : 주문 처리 시작`);
        await processOrder(recipe); // 주문 처리
        await useWash(recipe);
        log.info(`${recipe.name} - [${recipe.menuId}] : 주문 처리 완료`);
    }
};

// 주문 처리
const processOrder = async (recipe) => {

    await dispenseCup(recipe);
    if (recipe.iceYn === 'yes') await dispenseIce(recipe);
    if (recipe.coffeeYn === 'yes') await dispenseMultipleCoffees(recipe);
    if (recipe.garuchaYn === 'yes') await dispenseMultipleGarucha(recipe);
    if (recipe.syrupYn === 'yes') await dispenseMultipleSyrup(recipe);
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
                if (result.plasticCup.motorActive === 0 || result.paperCup.motorActive === 0) {
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
            console.log(`menu: ${recipe.name} - [${recipe.menuId}] : ${JSON.stringify(totalTime)}`);
            log.info('출빙 요청이 완료되었습니다. 상태를 감시합니다.');
            log.info('얼음을 받아주세요'); // [TODO] 음성 메시지 호출

            for (let counter = 0; counter < 60; counter++) {
                const result = await Ice.getKaiserInfo();

                log.info(`menu: ${recipe.name} - [${recipe.menuId}] : ${JSON.stringify(result)} ${counter}/60`);
                const hexArray = result.match(/.{1,2}/g);
                console.log(`menu: ${recipe.name} - [${recipe.menuId}] : ${JSON.stringify(hexArray)}`);
                if (hexArray[6] !== totalTime) {
                    log.info('2단계 완료: 얼음 배출 완료 및 다음 플로우로 진행');
                    await Ice.sendIceStopPacket();
                    resolve();
                    return;
                }
                if(counter >= 59) {
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
            await McData.updateSerialData('RD1', 'RD1');
            const data = McData.getSerialData('RD1');
            log.info("GET COFFEE INFO ", data);
            log.info(`coffee set!!!  : ${grinderOne}, ${grinderTwo}, ${extraction}, ${hotWater}`);
            await Order.sendCoffeeCommand(grinderOne, grinderTwo, extraction, hotWater);

            // "있음" 상태 3회 체크
            const isStartValid = await checkCupSensor("있음", 1);
            if (isStartValid) {
                log.info(`coffee 추출 실행`);
                await Order.extractCoffee();
            } else {
                reject(new Error("Timeout: Cup sensor did not reach '있음' state."));
                return;
            }

            resolve(); // 성공 시

        } catch (error) {
            log.error('dispenseCoffee 오류:', error.message);
            reject(error);
        }

    });
};

const dispenseMultipleCoffees = async (recipe) => {
    log.info(`JSON.stringify(recipe) : ${JSON.stringify(recipe)}`);
    for (let i = 0; i < recipe.coffee.length; i++) {
        const coffee = recipe.coffee[i];
        log.info(`dispenseCoffee ${i + 1} START!!`);
        const isAutoOperation =  await checkAutoOperationState("정지", 3);

        const formatValue = (value) => value.toString().padStart(3, "0");
        const grinder = (coffee) => {
            const result = Math.round(coffee * 10);
            return formatValue(result);
        };
        if (isAutoOperation) {
            // 각 커피 배출을 순차적으로 실행
            await dispenseCoffee(
                grinder(coffee.grinderOne),
                grinder(coffee.grinderTwo),
                formatValue(coffee.extraction),
                formatValue(coffee.hotWater)
            );
        }

    }
    log.info('모든 커피 배출 완료');
};

const dispenseGarucha = (motor, extraction, hotwater) => {
    return new Promise(async (resolve, reject) => {
        try {
            await McData.updateSerialData('RD1', 'RD1');
            const data = McData.getSerialData('RD1');
            log.info("GET GARUCHA INFO ", JSON.stringify(data));
            await Order.sendTeaCommand(motor, extraction, hotwater);

            // "있음" 상태 3회 체크
            const isStartValid = await checkCupSensor("있음", 1);
            if (isStartValid) {
                log.info(`${motor} Tea 추출 실행`);
                await Order.extractTeaPowder();
                resolve(); // 모든 작업 완료 후 Promise 성공
            } else {
                reject(new Error("Timeout: Cup sensor did not reach '있음' state."));

            }

        } catch (error) {
            log.error('dispenseGarucha 오류:', error.message);
            reject(error);
        }

    });
};

const dispenseMultipleGarucha = async (recipe) => {
    log.info(`JSON.stringify(recipe) : ${JSON.stringify(recipe)}`);
    for (let i = 0; i < recipe.garucha.length; i++) {
        const garucha = recipe.garucha[i];
        log.info(`dispenseGarucha ${i + 1} START!!`);
        log.info(`garucha set!!!  : ${garucha.garuchaNumber}, ${garucha.garuchaExtraction}, , ${garucha.garuchaHotWater}`);
        // 각 가루차 배출을 순차적으로 실행
        const isAutoOperation =  await checkAutoOperationState("정지", 3);
        const formatValue = (value) => value.toString().padStart(3, "0");
        const grinder = (coffee) => {
            const result = Math.round(coffee * 10);
            return formatValue(result);
        };
        if (isAutoOperation) {
            await dispenseGarucha(
                garucha.garuchaNumber,
                grinder(garucha.garuchaExtraction),
                formatValue(garucha.garuchaHotWater)
            );
        }
    }
    log.info('모든 차 배출 완료');
};

const dispenseSyrup = (motor, extraction, hotwater, sparkling) => {
    return new Promise(async (resolve, reject) => {
        try {
            await McData.updateSerialData('RD1', 'RD1');
            const data = McData.getSerialData('RD1');
            log.info("GET SYRUP INFO ", JSON.stringify(data));
            await Order.setSyrup(motor, extraction, hotwater, sparkling);

            // "있음" 상태 3회 체크
            const isStartValid = await checkCupSensor("있음", 1);
            if (isStartValid) {
                log.info(`${motor} Syrup 추출 실행`);
                await Order.extractSyrup();
                resolve(); // 모든 작업 완료 후 Promise 성공
            } else {
                reject(new Error("Timeout: Cup sensor did not reach '있음' state."));
            }


        } catch (error) {
            log.error('dispenseSyrup 오류:', error.message);
            reject(error);
        }

    });
};

const dispenseMultipleSyrup = async (recipe) => {
    for (let i = 0; i < recipe.syrup.length; i++) {
        const syrup = recipe.syrup[i];
        log.info(`dispenseSyrup ${i + 1} START!!`);
        log.info(`syrup set!!!  : ${syrup.syrupNumber}, ${syrup.syrupExtraction}, ${syrup.syrupHotWater}, ${syrup.syrupSparklingWater}`);
        // 각 시럽 배출을 순차적으로 실행
        const isAutoOperation = await checkAutoOperationState("정지", 3);

        const formatValue = (value) => value.toString().padStart(3, "0");
        const grinder = (coffee) => {
            const result = Math.round(coffee * 10);
            return formatValue(result);
        };
        if (isAutoOperation) {
            await dispenseSyrup(
                syrup.syrupNumber,
                grinder(syrup.syrupExtraction),
                formatValue(syrup.syrupHotWater),
                formatValue(syrup.syrupSparklingWater)
            );
        }
    }
    log.info('모든 시럽 배출 완료');
};

const checkCupSensor = async (expectedState, threshold) => {
    let stateCount = 0; // 상태 카운터

    for (let counter = 0; counter < 120; counter++) {
        await McData.updateSerialData('RD1', 'RD1');
        const data = McData.getSerialData('RD1');
        log.info(JSON.stringify(data));

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

        await new Promise((r) => setTimeout(r, 500));
    }

    log.warn(`Sensor state did not reach '${expectedState}' threshold within timeout.`);
    return false; // 타임아웃 처리
};

const checkAutoOperationState = async (expectedState, threshold) => {
    let stateCount = 0; // 상태 카운터

    for (let counter = 0; counter < 60; counter++) {
        await McData.updateSerialData('RD1', 'RD1');
        const data = McData.getSerialData('RD1');

        if (data.autoOperationState === expectedState) {
            stateCount++;
            log.info(`자동운전 동작상태: '${expectedState}', count: ${stateCount}`);
            if (stateCount >= threshold) {
                log.info(`자동운전 동작상태: '${expectedState}' ${threshold} 회 END.`);
                return true; // 조건 충족 시 함수 종료
            }
        } else {
            stateCount = 0; // 상태가 맞지 않으면 카운터 초기화
        }

        await new Promise((r) => setTimeout(r, 500));
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

        // 컵 센서 체크
        const isStopValid = await checkCupSensor("없음", 3);
        if (!isStopValid) {
            log.error("컵 센서 상태가 '없음'이 아니어서 세척 작업을 중단합니다.");
            return; // 작업 중단
        }
        const recipe = menuData.filter(menu => orderData.some(ord => ord.menuId === menu.menuId));

        log.info(`전체 세척 레시피: ${JSON.stringify(recipe)}!`);
        const combinedList = recipe.flatMap(item => [...item.garucha, ...item.syrup]);

        log.info(`전체 세척 레시피 리스트: ${JSON.stringify(combinedList)}`);

        for (let i = 0; i < combinedList.length; i++) {
            const listData = combinedList[i];

            log.info(`전체 세척 실행: ${JSON.stringify(listData)}`);

            if (listData.garuchaNumber) {
                await Order.purifyingTae(listData.garuchaNumber);
                await checkAutoOperationState("정지", 3);
            }
            if (listData.syrupNumber) {
                await Order.purifyingSyrup(listData.syrupNumber);
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
processQueue();

module.exports = {
    startOrder,
    useWash
};
