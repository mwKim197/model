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
    let orderData = data;  // 주문 데이터
    // 전체 메뉴 조회
    const menu = await allProduct();
    let menuData = menu.Items;

    // 메뉴가 정상적으로 로드되었으면 주문 처리 시작
    if (menuData.length > 0 && orderData.length > 0) {
        await processQueue(orderData, menuData);
    } else {
        log.info("주문 데이터나 메뉴 데이터가 비어 있습니다.");
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
   if (recipe.iceYn === 'yes') await dispenseIce(recipe);

     if (recipe.coffeeYn === 'yes') await dispenseMultipleCoffees(recipe);
     /*if (recipe.garuchaYn === 'yes') await dispenseGarucha();
     if (recipe.syrupYn === 'yes') await dispenseSyrup();*/
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
            const initialStatus2 = await Ice.getKaiserInfo("0x02");
            const initialStatus3 = await Ice.getKaiserInfo("0x03");
            const initialStatus4 = await Ice.getKaiserInfo("0x04");
            log.info(`menu: ${recipe.name} - [${recipe.menuId}] : wasTrue=${initialStatus2.wasTrue}, isIceOutDone=${initialStatus2.data2.b_ad_avr_end}`);
            log.info(`menu: ${recipe.name} - [${recipe.menuId}] : wasTrue=${initialStatus3.wasTrue}, isIceOutDone=${initialStatus3.data2.b_ad_avr_end}`);
            log.info(`menu: ${recipe.name} - [${recipe.menuId}] : wasTrue=${initialStatus4.wasTrue}, isIceOutDone=${initialStatus4.data2.b_ad_avr_end}`);
            await Ice.sendIceTimePacket(convertTimeToHex(recipe.iceTime));
            await Ice.sendWaterTimePacket(convertTimeToHex(recipe.waterTime));
            await Ice.sendIceRunPacket();
            log.info('출빙 요청이 완료되었습니다. 상태를 감시합니다.');
            log.info('얼음을 받아주세요'); // [TODO] 음성 메시지 호출

            let state = { wasTrue: 0, isIceOutDone: 0, transitionedToReady: false };

            for (let counter = 0; counter < 60; counter++) {
                const result2 = await Ice.getKaiserInfo("0x02");
                const result3 = await Ice.getKaiserInfo("0x03");
                const result4 = await Ice.getKaiserInfo("0x04");
                log.info("result2", result2);
                log.info("result3", result3);
                log.info("result4", result4);
               /* log.info(
                    `menu: ${recipe.name} - [${recipe.menuId}] : wasTrue=${result.wasTrue}, isIceOutDone=${result.data2.b_ad_avr_end} ${counter}/60`
                );

                if (
                    state.wasTrue === 0 &&
                    state.isIceOutDone === 0 &&
                    result.wasTrue === 1 &&
                    result.data4.b_wt_drink_rt === 1
                ) {
                    log.info('1단계 완료: wasTrue=1, isIceOutDone=1 상태로 전환');
                    state.transitionedToReady = true;
                }

                if (
                    state.transitionedToReady &&
                    result.wasTrue === 1 &&
                    result.data4.b_wt_drink_rt === 0
                ) {
                    log.info('2단계 완료: 얼음 배출 완료 및 다음 플로우로 진행');

                    resolve();
                    return;
                }

                state.wasTrue = result.wasTrue;
                state.isIceOutDone = result.data2.b_ad_avr_end;*/

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
    return new Promise(async (resolve) => {
        log.info(`커피 설정 세팅 : ${grinderOne}, ${grinderTwo}, ${extraction}, ${hotWater}`);
        await Order.sendCoffeeCommand(grinderOne, grinderTwo, extraction, hotWater);
        const data = await McData.getSerialData('RD1');
        log.info("조회 데이터 호출 " + data);
        setTimeout(() => {
            log.info('커피 배출 완료');
            resolve();
        }, 2000);  // 2초 후 완료
    });
};

const dispenseMultipleCoffees = async (recipe) => {
    for (let i = 0; i < recipe.coffee.length; i++) {
        const coffee = recipe.coffee[i];
        log.info(`커피 배출 ${i + 1}번째 시작`);

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


const dispenseGarucha = () => {
    return new Promise(resolve => {
        log.info('가루차 배출 중');
        setTimeout(() => {
            log.info('가루차 배출 완료');
            resolve();
        }, 2000);
    });
};

const dispenseSyrup = () => {
    return new Promise(resolve => {
        log.info('시럽 추가 중');
        setTimeout(() => {
            log.info('시럽 추가 완료');
            resolve();
        }, 1000);
    });
};

// 주문 처리 시작
processQueue();

module.exports = {
    startOrder
};
