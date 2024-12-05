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
        await processOrder(orderData, menuData);
    } else {
        log.info("주문 데이터나 메뉴 데이터가 비어 있습니다.");
    }
};

// 주문 처리 함수
async function processOrder(orderlist, menuData) {
    if (orderlist.length === 0) {
        log.info("all order end");
        return; // 주문이 없으면 종료
    }

    // 첫 번째 주문을 처리합니다.
    const currentOrder = orderlist[0]; // 첫 번째 주문
    const menuItem = menuData.find(menu => menu.menuId === currentOrder.menuId);

    if (menuItem) {
        // 제조 작업을 진행합니다.
        log.info(`menu: ${menuItem.name} - [${menuItem.menuId}]`);

        // 제조가 완료되면 주문을 삭제
        const count = currentOrder.count;
        // 제조 작업을 count 수만큼 반복
        for (let i = 0; i < count; i++) {
            log.log(`${menuItem.name} making... ${i + 1} ing`);

            if (menuItem.cup === 'plastic' || menuItem.cup === 'paper') {
                log.info(`menu: ${menuItem.name} - [${menuItem.menuId}] : UseCupDispenser 사용`);
                await useCup(menuItem);

            } else {
                log.info(`menu: ${menuItem.name} - [${menuItem.menuId}] : UseCupDispenser 미사용`);
            }






            // end cup!!!

            // 추가적인 제조 작업을 진행할 수 있습니다.
            // 예: 재고 차감, 대기 시간 등

            // 여기서 실제 제조 작업을 처리하는 코드를 추가할 수 있습니다.
        }

        // 제조가 완료되면 주문을 삭제
        orderlist.shift(); // 첫 번째 항목을 삭제 (완료된 주문)

        // 제조가 완료된 후 계속해서 반복
        await processOrder(orderlist, menuData);  // 재귀적으로 호출하여 계속 진행
    } else {
        log.error(`not find menu : menuId = ${currentOrder.menuId}`);
        // 메뉴 항목을 찾을 수 없는 경우에도 삭제하고 계속 진행
        orderlist.shift(); // 메뉴 항목이 없을 경우에도 주문 삭제
        await processOrder(orderlist, menuData);  // 재귀적으로 호출하여 계속 진행
    }
}

/*
* 2024-11-21 15:42:11 [DEBUG] : 제품코드 '160' : UseCupDispenser=True
2024-11-21 15:42:11 [DEBUG] : 제품코드 '160' : GoCupOut, CupNo=1 (1:플라스틱, 2:종이)
2024-11-21 15:42:11 [DEBUG] : ZERO[COM4] : Recv=524430303130383031303031303130313030310D0A
2024-11-21 15:42:11 [DEBUG] : 제품코드 '160' : 컵디스펜서 상태 CupNo=1, 컵1(PL)모터ON=False, 컵2(PA)모터ON=False
2024-11-21 15:42:11 [DEBUG] : ZERO[COM4] : Recv=504C0D0A
2024-11-21 15:42:11 [DEBUG] : 제품코드 '160' : CupOut 호출 성공, CupNo=1 (1:플라스틱, 2:종이)
2024-11-21 15:42:11 [INFO] : 컵 자판기에서 컵을 꺼내주세요.
2024-11-21 15:42:12 [DEBUG] : ZERO[COM4] : Recv=524430303131383030303031303130313030310D0A
2024-11-21 15:42:12 [DEBUG] : 제품코드 '160' : 컵디스펜서 상태 CupNo=1, 컵1(PL)모터ON=True, 컵2(PA)모터ON=False (0/60)
2024-11-21 15:42:13 [DEBUG] : ZERO[COM4] : Recv=524430303131383030303031303130313030310D0A
2024-11-21 15:42:13 [DEBUG] : 제품코드 '160' : 컵디스펜서 상태 CupNo=1, 컵1(PL)모터ON=True, 컵2(PA)모터ON=False (1/60)
2024-11-21 15:42:14 [DEBUG] : ZERO[COM4] : Recv=524430303130383131303031303130313030310D0A
2024-11-21 15:42:14 [DEBUG] : 제품코드 '160' : 컵디스펜서 상태 CupNo=1, 컵1(PL)모터ON=False, 컵2(PA)모터ON=False (2/60)
2024-11-21 15:42:14 [DEBUG] : 제품코드 '160' : 컵 추출이 완료되었습니다. 동작 정지 요청을 보냅니다.
2024-11-21 15:42:14 [DEBUG] : ZERO[COM4] : Recv=53544F500D0A
2024-11-21 15:42:14 [INFO] : 컵 추출이 완료되었습니다. 잠시 기다려주세요.
2024-11-21 15:42:15 [DEBUG] : 제품코드 '160' : UseIceMaker=True
* */
// 컵 디스펜서 사용여부 true 플라스틱이나 페이퍼 있으면

const useCup = async (menuItem) => {
    // start cup!!!
    if (menuItem.cup === 'plastic') {
        log.info(`menu: ${menuItem.name} - [${menuItem.menuId}] : GoCupOut, cup: 'plastic'`);
        await Cup.getPlasticCupUsage();
    }

    if (menuItem.cup === 'paper') {
        log.info(`menu: ${menuItem.name} - [${menuItem.menuId}] : GoCupOut, cup: 'paper'`);
        await Cup.getPaperCupUsage();
    }

    const checkCondition = () => {
        // 1초 간격으로 호출할 함수
        let counter = 0; // 호출 횟수 카운터
        const intervalId = setInterval(async () => {
            counter++;

            // 여기서 조회를 하는 로직을 추가
            const result = await Cup.getCupInfo(); // `getSomeData()`는 조회하는 함수입니다.

            // 조회한 값이 true이면 멈추기
            if (result === true) {
                log.info('Condition met, stopping the function.');
                clearInterval(intervalId);  // 반복 중지
            }

            // 120회 호출 시 멈추기
            if (counter >= 120) {
                log.info('Reached 120 calls, stopping the function.');
                clearInterval(intervalId);  // 반복 중지
            }
        }, 1000);  // 1초 간격
    }

    // 예시: 조회하는 함수 (이 부분을 실제 데이터 조회에 맞게 수정)
    async function getSomeData() {
        // 여기에 실제 데이터 조회 로직이 들어가야 합니다.
        // 예를 들어, API 호출하거나 상태를 체크하는 등의 작업
        // 예시로 임의로 1초마다 true를 반환하도록 함
        return Math.random() > 0.95;  // 임의로 true일 확률을 5%로 설정
    }

    // 함수 실행
    checkCondition();

}

module.exports = {
    startOrder
};
