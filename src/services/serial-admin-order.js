const log = require('../logger');

function createSerialAdminOrder({
    Cup,
    Ice,
    Order,
    eventEmitter,
    state,
    dispenseCoffee,
    dispenseGarucha,
    dispenseSyrup,
    checkCupSensor,
    checkAutoOperationState
}) {
const adminDrinkOrder = async (recipe) => {
    try {
        log.info('////////--------------- 어드민 음료 요청 --------------------//////');
        log.info('////////--------------- 어드민 음료 요청 --------------------//////');
        log.info('////////--------------- 어드민 음료 요청 --------------------//////');
        // 시작 이벤트 전송
        state.menuName = recipe.name;
        eventEmitter.emit('order-update', { menu: state.menuName, status: 'processing', message: '관리자가 조작중입니다. 음료가 준비중입니다.' });
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
                            menu: state.menuName, // 수정: state.menuName 변수 대신 recipe.state.menuName 사용
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

                        if (parseFloat(item.value1) === 4) {
                            item.value1 = 5;
                        } else if (parseFloat(item.value1) === 5) {
                            item.value1 = 6;
                        }
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
                            menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: `"120초 경과로 기계가 초기화되었습니다."`
                        });
                        log.error(`[어드민] 컵 센서 상태가 유효하지 않음 (회수 실패): menuId ${recipe.menuId}`);
                        throw new Error(`120초 경과로 기계가 초기화되었습니다.`);
                    } else {
                        log.info(`[어드민] 컵 센서 상태 확인 완료 (회수 성공): menuId ${recipe.menuId}`);
                        if (item.type !== "coffee") {
                            log.info("[어드민] 세척 시작...!");
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

                            log.info(`[어드민] 전체 세척 레시피 리스트: ${JSON.stringify(combinedList)}`);

                            for (let i = 0; i < combinedList.length; i++) {

                                const listData = combinedList[i];

                                log.info(`[어드민] 전체 세척 실행: ${JSON.stringify(listData)}`);

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
                            eventEmitter.emit('order-update', { menu: state.menuName, status: 'completed', message: '전체 세척 작업 완료.' });
                            state.menuName = "";
                        }

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
        state.menuName = "";
        // 종료 이벤트 전송 (성공 또는 실패 모두 포함)
        eventEmitter.emit('order-update', {
            menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
            status: 'completed',
            message: '관리자 조작이 완료되었습니다.'
        });
    }
}

const adminCupOrder = (recipe) => {
    try {
        log.info('////////--------------- 어드민 컵 요청 --------------------//////');
        log.info('////////--------------- 어드민 컵 요청 --------------------//////');
        log.info('////////--------------- 어드민 컵 요청 --------------------//////');
        // 시작 이벤트 전송
        eventEmitter.emit('order-update', { menu: recipe.name, status: 'processing', message: '관리자가 조작중입니다. 컵이 준비중입니다.' });
        return new Promise((resolve, reject) => {
            setTimeout(async () => {
                try {
                    const result = await Cup.getCupInfo(); // `getSomeData()`는 조회하는 함수입니다.
                    log.info(`menu: ${recipe.name} - [${recipe.menuId}] : 컵디스펜서 상태 cup: ${recipe.cup}, 컵1(PL)모터ON=${result.plasticCup.motorActive}, 컵2(PA)모터ON=${result.paperCup.motorActive}`);
                    eventEmitter.emit('order-update', {
                        menu: recipe.name,
                        status: 'processing',
                        message: `메뉴를 준비중입니다.`
                    });
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
                            log.error('[어드민] 어드민 컵 타임아웃 발생. 동작 정지 요청을 보냅니다.');
                            eventEmitter.emit('order-update', {
                                menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
                                status: 'completed',
                                message: "60초 경과로 기계가 초기화되었습니다."
                            });
                            await Cup.stopCupMotor();
                            resolve();
                            return;
                        }

                        const result = await Cup.getCupInfo();
                        log.info(`[어드민] menu: ${recipe.name} - [${recipe.menuId}] : 컵디스펜서 상태 cup: ${recipe.cup}, 컵1(PL)모터ON=${result.plasticCup.motorActive}, 컵2(PA)모터ON=${result.paperCup.motorActive} ${counter + 1} / 60`);

                        // 조회한 값이 false 이면 멈추기
                        if (recipe.cup === "plastic" && result.plasticCup.motorActive === 0) {
                            stopCup++;
                        }
                        if (recipe.cup === "paper" && result.paperCup.motorActive === 0) {
                            stopCup++;
                        }

                        if (stopCup >= 2) {
                            log.info(`[어드민] menu: ${recipe.name} - [${recipe.menuId}] : 컵 추출이 완료되었습니다. 동작 정지 요청을 보냅니다.`);
                            eventEmitter.emit('order-update', {
                                menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
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
                } catch (err) {
                    log.error("❌ dispenseCup 중 에러 발생:", err.message);
                    reject(err); // 반드시 reject 해야 상위에서 catch 됨
                }
            }, 1000);
        });

    } catch (error) {
        throw error; // 에러를 상위로 전파
    } finally {
        state.menuName = "";
        // 종료 이벤트 전송 (성공 또는 실패 모두 포함)
        eventEmitter.emit('order-update', {
            menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
            status: 'completed',
            message: '관리자 조작이 완료되었습니다.'
        });
    }
};

const adminIceOrder = async (recipe) => {
    try {
        log.info('////////--------------- 어드민 출빙 요청 --------------------//////');
        log.info('////////--------------- 어드민 출빙 요청 --------------------//////');
        log.info('////////--------------- 어드민 출빙 요청 --------------------//////');
        // 시작 이벤트 전송
        eventEmitter.emit('order-update', { menu: recipe.name, status: 'processing', message: '관리자가 조작중입니다. 얼음이 준비중입니다.' });
        return new Promise(async (resolve, reject) => {
            try {
                let totalTime = 0;
                log.info(`[어드민] 얼음 세팅 중: ${recipe.iceTime}초, 물 세팅 중: ${recipe.waterTime}초`);
                await Ice.sendIceTimePacket(recipe.iceTime);
                await Ice.sendWaterTimePacket(recipe.waterTime);
                await Ice.sendIceRunPacket();
                const initialStatus = await Ice.getKaiserInfo();
                totalTime = initialStatus.match(/.{1,2}/g)[7];
                log.info(`[어드민] menu: ${recipe.name} - [${recipe.menuId}] : ${JSON.stringify(totalTime)}`);
                log.info('[어드민] 출빙 요청이 완료되었습니다. 상태를 감시합니다.');
                log.info('[어드민] 얼음을 받아주세요');
                let initialValue = null; // 최초 상태값 저장
                let stableTime = 0; // 변경 후 유지 시간
                let valueChanged = false; // 값 변경 여부 플래그
                let minWaitTime = 7; // 최소 대기 시간 설정
                let minWaitCounter = 0; // 최소 대기 시간 카운터
                state.menuName = recipe.name;
                let waterTime = Number(recipe.waterTime);
                if (Number(recipe.waterTime) >= 3) {
                    waterTime = waterTime - 2;
                }
                totalTime = Number(recipe.iceTime) + waterTime
                log.info('[어드민][totalTime] 제빙기 카운트 : ', totalTime);

                // 화면 노출 메세지
                eventEmitter.emit('order-update', { menu: state.menuName, status: 'ice', message: '제빙기에서 얼음을 받아주세요.' });

                for (let counter = 0; counter < 120; counter++) {
                    eventEmitter.emit('order-update', { menu: state.menuName, status: 'iceCount', message: '얼음을 받아주세요.', time: counter });
                    const result = await Ice.getKaiserInfo();
                    const currentHexArray = result.match(/.{1,2}/g); // 2자리씩 끊어서 배열 생성
                    const currentValue = parseInt(currentHexArray[7]); // 16진수 → 10진수 변환

                    log.info(`[어드민] 제빙기 변경값: ${currentValue}`);

                    if (!valueChanged) {
                        // 값 변경 전 (처음 값 유지)
                        if (initialValue === null) {
                            // 최초로 값을 설정
                            initialValue = currentValue;
                            log.info(`[어드민] 제빙기 기본 값: ${initialValue}`);
                        } else if (currentValue === initialValue) {
                            // 같은 값이 유지되는 경우
                            log.info(`[어드민] 제빙기 기본 값 유지 중: ${initialValue}`);
                        } else {
                            // 값이 변경된 경우
                            valueChanged = true; // 변경 플래그 설정
                            stableTime = 0; // 변경 후 유지 시간 초기화
                            initialValue = currentValue; // 새로운 값으로 업데이트
                            log.info(`[어드민] 값 변경 감지: 새로운 값(${currentValue})으로 전환. 시간 체크 시작.`);
                        }
                    } else {
                        stableTime++;
                        log.info(`[어드민] 변경된 값 유지 시간: ${stableTime}/${totalTime}초`);
                    }

                    // 최소 대기 시간 체크
                    if (minWaitCounter < minWaitTime) {
                        minWaitCounter++;
                        log.info(`[어드민] 최소 대기 시간 유지 중: ${minWaitCounter}/${minWaitTime}초`);
                    } else if (valueChanged && stableTime >= totalTime) {
                        state.menuName = "";
                        // 종료 이벤트 전송 (성공 또는 실패 모두 포함)
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: '관리자 조작이 완료되었습니다.'
                        });
                        // 최소 대기 시간 충족 후 변경된 값이 totalTime만큼 유지된 경우
                        log.info('[어드민] 변경된 값이 일정 시간 동안 유지됨. 다음 루틴으로 진행합니다...');
                        resolve(); // 작업 완료로 처리
                        return;
                    }

                    if (counter >= 119) {
                        await Ice.sendIceStopPacket();
                        eventEmitter.emit('order-update', {
                            menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
                            status: 'completed',
                            message: "120초 경과로 기계가 초기화되었습니다."
                        });
                        reject(new Error('[어드민] 작업 시간이 초과되었습니다.'));
                        return;
                    }

                    await new Promise(r => setTimeout(r, 1000)); // 1초 대기
                }

            } catch (error) {
                log.error('[어드민] 제빙기 추출 오류:', error.message);
                reject(error);
            }
        });
    } catch (error) {
        throw error; // 에러를 상위로 전파
    } finally {
        state.menuName = "";
        // 종료 이벤트 전송 (성공 또는 실패 모두 포함)
        eventEmitter.emit('order-update', {
            menu: recipe.name, // 수정: state.menuName 변수 대신 recipe.name 사용
            status: 'completed',
            message: '관리자 조작이 완료되었습니다.'
        });
    }
}

/**
 *  관리자 세척
 *  */
const adminUseWash = async (data) => {
    log.info('////////--------------- 어드민 세척 요청 --------------------//////');
    log.info('////////--------------- 어드민 세척 요청 --------------------//////');
    log.info('////////--------------- 어드민 세척 요청 --------------------//////');
    let washData = data.data;  // 세척 데이터

    // 세척데이터가 리스트로 들어오면 세척 시작
    if (washData.length > 0) {

        const syrupList = washData.filter(item => item.type === "syrup");
        const otherList = washData.filter(item => item.type !== "syrup");

        try {
            log.info(`[어드민] 세척 레시피 리스트: ${JSON.stringify(washData)}`);

            // 1. 커피/가루차 세척 먼저 처리
            for (let i = 0; i < otherList.length; i++) {
                const listData = otherList[i];
                eventEmitter.emit('order-update', {
                    status: 'washStart',
                    message: '[관리자] 커피머신 세척중입니다 잠시만 기다려주세요.'
                });
                log.info(`[어드민] 전체 세척 실행: ${JSON.stringify(listData)}`);

                if (listData.type === "coffee") {
                    await Order.purifyingCoffee();
                    await checkAutoOperationState("정지", 3);
                }
                if (listData.type === "garucha") {
                    await Order.purifyingTae(listData.value1);
                    await checkAutoOperationState("정지", 3);
                }

                await new Promise((r) => setTimeout(r, 1000));
            }

            // 2. 시럽 세척만 따로 3회 반복
            for (let round = 0; round < 3; round++) {
                log.info(`[어드민] 시럽 세척 ${round + 1}회차 시작`);
                for (const syrup of syrupList) {
                    let number = syrup.value1;
                    if (parseFloat(syrup.value1) === 5) {
                        number = 4;
                    } if (parseFloat(syrup.value1) === 6) {
                        number = 5;
                    }
                    eventEmitter.emit('order-update', {
                        status: 'washStart',
                        message: `[관리자] 시럽(${number}) 세척중입니다.`
                    });
                    await Order.purifyingSyrup(syrup.value1);
                    await checkAutoOperationState("정지", 10);
                    await new Promise((r) => setTimeout(r, 2000));
                }
            }

        } catch (e) {
            log.error(`[어드민] 세척중 에러가 발생했습니다. ${e}`);
            eventEmitter.emit('order-update', { status: 'completed', message: '전체 세척 작업 완료.' });
        }
    } else {
        log.warn("[세척] 메뉴 데이터가 없습니다.");
    }
    log.info("[어드민] 전체 세척 작업 완료");
    eventEmitter.emit('order-update', { status: 'completed', message: '전체 세척 작업 완료.' });
};

// 커피머신 예열
const coffeePreheating = async () => {
    eventEmitter.emit('order-update', {
        status: 'preheatingStart',
        message: '커피머신 예열중 입니다.'
    });

    await Order.purifyingCoffee();
    await checkAutoOperationState("정지", 3);

    log.info("커피머신 예열 작업 완료");
    eventEmitter.emit('order-update', {
        status: 'completed',
        message: '커피머신 예열 완료.'
    });
}

// 추출기 원점
const extractorHome = async () => {
    log.info('////////--------------- 어드민 추출기 원점 요청 --------------------//////');
    log.info('////////--------------- 어드민 추출기 원점 요청 --------------------//////');
    log.info('////////--------------- 어드민 추출기 원점 요청 --------------------//////');
    try {
        log.info("추출기 원점 동작");
        await Order.extractorHome();
    } catch (e) {
        log.error(`추출기 원점 동작중 에러가 발생했습니다. ${e}`);
    }
}


    return { adminDrinkOrder, adminCupOrder, adminIceOrder, adminUseWash, coffeePreheating, extractorHome };
}

module.exports = { createSerialAdminOrder };
