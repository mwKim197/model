const log = require('../logger');
const { allProduct } = require("../db/dbProcesses/util/getMenu");
const { serialCommCom4 } = require("../serial/serialCommManager");
const  CupModule = require("../serial/portProcesses/CupModule");
const Cup = new CupModule(serialCommCom4);

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
const processQueue = async (orderList, menuList) => {
    for (const order of orderList) {
        const recipe = menuList.find(menu => menu.menuId === order.menuId); // 제조 레시피 찾기
        if (!recipe) {
            console.error(`레시피를 찾을 수 없음: 메뉴 ID ${order.menuId}`);
            continue;
        }
        console.log(`주문 처리 시작: ${recipe.name}`);
        await processOrder(recipe); // 주문 처리
        console.log(`주문 처리 완료: ${recipe.name}`);
    }
};

// 주문 처리
const processOrder = async (recipe) => {
    await dispenseCup(recipe);
   /* if (recipe.iceYn === 'yes') await dispenseIce(recipe.iceTime);
    await dispenseWater(recipe.waterTime);
    if (recipe.coffeeYn === 'yes') await dispenseCoffee();
    if (recipe.garuchaYn === 'yes') await dispenseGarucha();
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

const dispenseIce = (time) => {
    return new Promise(resolve => {
        console.log(`얼음 배출 중: ${time}초`);
        setTimeout(() => {
            console.log('얼음 배출 완료');
            resolve();
        }, time * 1000);
    });
};

const dispenseWater = (time) => {
    return new Promise(resolve => {
        console.log(`물 배출 중: ${time}초`);
        setTimeout(() => {
            console.log('물 배출 완료');
            resolve();
        }, time * 1000);
    });
};

const dispenseCoffee = () => {
    return new Promise(resolve => {
        console.log('커피 배출 중');
        setTimeout(() => {
            console.log('커피 배출 완료');
            resolve();
        }, 2000);
    });
};

const dispenseGarucha = () => {
    return new Promise(resolve => {
        console.log('가루차 배출 중');
        setTimeout(() => {
            console.log('가루차 배출 완료');
            resolve();
        }, 2000);
    });
};

const dispenseSyrup = () => {
    return new Promise(resolve => {
        console.log('시럽 추가 중');
        setTimeout(() => {
            console.log('시럽 추가 완료');
            resolve();
        }, 1000);
    });
};

// 주문 처리 시작
processQueue();

module.exports = {
    startOrder
};
