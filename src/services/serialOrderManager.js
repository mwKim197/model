const log = require('../logger');
const { allProduct } = require("../db/dbProcesses/util/getMenu");
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
const processQueue = async (orderList = [], menuList) => {

    for (const order of orderList) {
        const recipe = menuList.find(menu => menu.menuId === order.menuId); // 제조 레시피 찾기
        if (!recipe) {
            log.error(`레시피를 찾을 수 없음: 메뉴 ID ${order.menuId}`);
            continue;
        }
        log.info(`${recipe.name} - [${recipe.menuId}] : 주문 처리 시작`);
        await processOrder(recipe); // 주문 처리
        log.info(`${recipe.name} - [${recipe.menuId}] : 주문 처리 완료`);
    }
};

// 주문 처리
const processOrder = async (recipe) => {
    //await dispenseCup(recipe);
   //if (recipe.iceYn === 'yes') await dispenseIce(recipe);

     //if (recipe.coffeeYn === 'yes') await dispenseMultipleCoffees(recipe);
     //if (recipe.garuchaYn === 'yes') await dispenseMultipleGarucha(recipe);
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
            log.info(`얼음 세팅 중: ${recipe.iceTime}초, 물 세팅 중: ${recipe.waterTime}초`);
            const initialStatus = await Ice.getKaiserInfo();
            log.info(`menu: ${recipe.name} - [${recipe.menuId}] : wasTrue=${initialStatus.wasTrue}, isIceOutDone=${initialStatus.data.b_wt_drink_rt}`);
            await Ice.sendIceTimePacket(convertTimeToHex(recipe.iceTime));
            await Ice.sendWaterTimePacket(convertTimeToHex(recipe.waterTime));
            await Ice.sendIceRunPacket();
            log.info('출빙 요청이 완료되었습니다. 상태를 감시합니다.');
            log.info('얼음을 받아주세요'); // [TODO] 음성 메시지 호출

            let state = { transitionedToReady: false };

            for (let counter = 0; counter < 7; counter++) {
                const result = await Ice.getKaiserInfo();

                log.info(
                    `menu: ${recipe.name} - [${recipe.menuId}] : wasTrue=${result.wasTrue}, isIceOutDone=${result.data.b_wt_drink_rt} ${counter}/60`
                );

                if (
                    result.wasTrue === 1 &&
                    result.data.b_wt_drink_rt === 1
                ) {
                    log.info('1단계 완료: wasTrue=1, isIceOutDone=1 상태로 전환');
                    state.transitionedToReady = true;
                }

                if (
                    state.transitionedToReady &&
                    result.wasTrue === 1 &&
                    result.data.b_wt_drink_rt === 0
                ) {
                    log.info('2단계 완료: 얼음 배출 완료 및 다음 플로우로 진행');

                    resolve();
                    return;
                }

                await new Promise(r => setTimeout(r, 1000));
            }

            log.error('Ice time out 동작 정지 요청을 보냅니다.');
            await Ice.sendIceStopPacket();
            reject(new Error('제빙기 동작 시간 초과'));
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
            log.info("GET COFFEE INFO " + data);
            log.info(`coffee set!!!  : ${grinderOne}, ${grinderTwo}, ${extraction}, ${hotWater}`);
            await Order.sendCoffeeCommand(grinderOne, grinderTwo, extraction, hotWater);
            log.info("extractCoffee!!!");
            await Order.extractCoffee();
            reject();

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

        // 각 커피 배출을 순차적으로 실행
        await dispenseCoffee(
            coffee.grinderOne,
            coffee.grinderTwo,
            coffee.extraction,
            coffee.hotWater
        );
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
            log.info("extractGarucha!!!");
            await Order.extractTeaPowder();
            await Order.purifyingTae(motor);
            reject();

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
        await dispenseGarucha(
            garucha.garuchaNumber,
            garucha.garuchaExtraction,
            garucha.garuchaHotWater
        );
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
            log.info("extractSyrup!!!");
            await Order.extractSyrup();
            let operationStopped = false; // 상태 플래그 초기화

            for (let counter = 0; counter < 60; counter++) {
                await McData.updateSerialData('RD1', 'RD1');
                const data = McData.getSerialData('RD1');

                log.info(JSON.stringify(data));
                let cupSensor = 0;

                if (data.cupSensor === "없음") {
                    cupSensor++;
                    log.info(cupSensor);
                }

                if (cupSensor > 2) {
                    log.info("Auto operation state is '정지', exiting loop.");
                    operationStopped = true; // 상태 플래그 업데이트
                    break; // 루프 종료
                }

                await new Promise(r => setTimeout(r, 1000));
            }

            // 루프 종료 후 다음 로직
            if (operationStopped) {
                await Order.purifyingSyrup(motor);
                log.info("Purifying syrup completed.");
            } else {
                log.warn("Auto operation state did not reach '정지' within the timeout.");
                reject(new Error("Timeout: Auto operation did not stop."));
            }
            reject();

        } catch (error) {
            log.error('dispenseSyrup 오류:', error.message);
            reject(error);
        }

    });
};

const dispenseMultipleSyrup = async (recipe) => {
    log.info(`JSON.stringify(recipe) : ${JSON.stringify(recipe)}`);
    for (let i = 0; i < recipe.syrup.length; i++) {
        const syrup = recipe.syrup[i];
        log.info(`dispenseSyrup ${i + 1} START!!`);
        log.info(`syrup set!!!  : ${syrup.syrupNumber}, ${syrup.syrupExtraction}, ${syrup.syrupHotWater}, ${syrup.syrupSparklingWater}`);
        // 각 시럽 배출을 순차적으로 실행
        await dispenseSyrup(
            syrup.syrupNumber,
            syrup.syrupExtraction,
            syrup.syrupHotWater,
            syrup.syrupSparklingWater
        );
    }
    log.info('모든 시럽 배출 완료');
};

// 주문 처리 시작
processQueue();

module.exports = {
    startOrder
};
