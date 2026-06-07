const log = require('../logger');

function createSerialDispense({
    Cup,
    Ice,
    Order,
    McData,
    eventEmitter,
    state,
    checkAutoOperationState
}) {
// 제조 단계 함수
const dispenseCup = (recipe, count, totalCount) => {
    log.info('////////--------------- 컵 투출 요청 --------------------//////');
    log.info('////////--------------- 컵 투출 요청 --------------------//////');
    log.info('////////--------------- 컵 투출 요청 --------------------//////');
    return new Promise((resolve, reject) => {
        setTimeout(async () => {
            try {
                const result = await Cup.getCupInfo(); // `getSomeData()`는 조회하는 함수입니다.
                log.info(`컵 디스펜서 menu: ${recipe.name} - [${recipe.menuId}] : 컵 종류: ${recipe.cup}, 컵1(PL)모터ON=${result.plasticCup.motorActive}, 컵2(PA)모터ON=${result.paperCup.motorActive}`);
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
                        log.error('컵 시간초과 동작 정지 요청을 보냅니다.');
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
            } catch (err) {
                log.error("❌ dispenseCup 중 에러 발생:", err.message);
                reject(err); // 반드시 reject 해야 상위에서 catch 됨
            }
        }, 1000);
    });
};

const dispenseIce = (recipe, count, totalCount) => {
    log.info('////////--------------- 제빙기 추출 요청 --------------------//////');
    log.info('////////--------------- 제빙기 추출 요청 --------------------//////');
    log.info('////////--------------- 제빙기 추출 요청 --------------------//////');
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
            let minWaitTime = 10; // 최소 대기 시간 설정
            let minWaitCounter = 0; // 최소 대기 시간 카운터

            let waterTime = Number(recipe.waterTime);
            if (Number(recipe.waterTime) >= 3) {
                waterTime = waterTime - 2;
            }
            totalTime = Number(recipe.iceTime) + waterTime
            log.info('[totalTime] 제빙기 카운트 : ', totalTime);

            // 화면 노출 메세지 (3초 뒤 한 번만 표시)
            setTimeout(() => {
                eventEmitter.emit('order-update', {
                    menu: `${state.menuName} ${count} / ${totalCount}`,
                    status: 'ice',
                    message: `제빙기에서 얼음을 받아주세요.`
                });
            }, 3000);

            for (let counter = 0; counter < 123; counter++) {
                const result = await Ice.getKaiserInfo();
                const currentHexArray = result.match(/.{1,2}/g); // 2자리씩 끊어서 배열 생성
                const currentValue = parseInt(currentHexArray[7]); // 16진수 → 10진수 변환

                log.info(`제빙기 변경값: ${currentValue}`);

                // --- 앞의 3초 동안은 화면에 안보냄 (컵 모달 유지) ---
                if (counter >= 3) {
                    const displayTime = counter - 3; // 화면에는 0~119까지만 보이게
                    eventEmitter.emit('order-update', {
                        menu: `${state.menuName} ${count} / ${totalCount}`,
                        status: 'iceCount',
                        message: `제빙기에서 얼음을 받아주세요.`,
                        time: displayTime
                    });
                }

                if (!valueChanged) {
                    // 값 변경 전 (처음 값 유지)
                    if (initialValue === null) {
                        // 최초로 값을 설정
                        initialValue = currentValue;
                        log.info(`제빙기 기본 값: ${initialValue}`);
                    } else if (currentValue === initialValue) {
                        // 같은 값이 유지되는 경우
                        log.info(`제빙기 기본 값 유지 중: ${initialValue}`);
                    } else {
                        // 값이 변경된 경우
                        valueChanged = true; // 변경 플래그 설정
                        stableTime = 0; // 변경 후 유지 시간 초기화
                        initialValue = currentValue; // 새로운 값으로 업데이트
                        log.info(`값 변경 감지: 새로운 값(${currentValue})으로 전환. 시간 체크 시작.`);
                    }
                } else {
                    stableTime++;
                    log.info(`변경된 값 유지 시간: ${stableTime}/${totalTime}초`);
                }

                // 최소 대기 시간 체크
                if (minWaitCounter < minWaitTime) {
                    minWaitCounter++;
                    log.info(`제빙기 최소 대기 시간 유지 중: ${minWaitCounter}/${minWaitTime}초`);
                } else if (valueChanged && stableTime >= totalTime) {
                    // 최소 대기 시간 충족 후 변경된 값이 totalTime만큼 유지된 경우
                    log.info('제빙기 변경된 값이 일정 시간 동안 유지됨. 다음 루틴으로 진행합니다...');
                    resolve(); // 작업 완료로 처리
                    return;
                }

                // 120초 제한 기준은 여전히 counter 123으로
                if (counter >= 122) {
                    await Ice.sendIceStopPacket();
                    reject(new Error(`"제빙기 123초 경과로 기계가 초기화되었습니다."`));
                    return;
                }

                await new Promise(r => setTimeout(r, 1000)); // 1초 대기
            }

        } catch (error) {
            log.error('제빙기 추출 오류:', error.message);
            reject(error);
        }
    });
};

const dispenseCoffee = async (grinderOne, grinderTwo, extraction, hotWater) => {
    log.info('////////--------------- 커피 추출 요청 --------------------//////');
    log.info('////////--------------- 커피 추출 요청 --------------------//////');
    log.info('////////--------------- 커피 추출 요청 --------------------//////');

    // RD1 데이터 확인
    await McData.updateSerialData('RD1', 'RD1');
    const data = McData.getSerialData('RD1');
    log.info("커피추출 데이터: ", JSON.stringify(data));

    // Coffee 추출 명령
    await Order.sendCoffeeCommand(
        grinder(grinderOne),
        grinder(grinderTwo),
        formatValue(extraction),
        formatValue(hotWater)
    );

    await Order.extractCoffee();

    const isCoffee = await checkAutoOperationState("커피", 2);

    // 커피 동작 확인
    if (!isCoffee) {
        log.error(`커피 동작 감지 실패`);
        throw new Error(`커피 동작 감지 실패`);
    }

    const isStopped = await checkAutoOperationState("정지", 3);

    if (!isStopped) {
        log.error(`커피 정지 상태 감지 실패`);
        throw new Error(`커피 정지 상태 감지 실패`);
    }

    log.info(`커피 추출 완료`);
};

const dispenseGarucha = async (motor, extraction, hotwater) => {
    log.info('////////---------------가루차 추출 요청 --------------------//////');
    log.info('////////---------------가루차 추출 요청 --------------------//////');
    log.info('////////---------------가루차 추출 요청 --------------------//////');

    // RD1 데이터 확인
    await McData.updateSerialData('RD1', 'RD1');
    const data = McData.getSerialData('RD1');
    log.info("가루차 추출 데이터: ", JSON.stringify(data));

    // Tea 추출 명령
    await Order.sendTeaCommand(motor, grinder(extraction), formatValue(hotwater));
    log.info(`${motor} 번 가루차 추출 실행`);
    await Order.extractTeaPowder();

    const isGarucha = await checkAutoOperationState("가루차", 2);
    if (!isGarucha) {
        log.error(`가루차 동작 감지 실패 → 가루차 넘버: ${motor}`);
        throw new Error(`가루차 동작 감지 실패: 가루차 넘버 ${motor}`);
    }

    const isStopped = await checkAutoOperationState("정지", 3);
    if (!isStopped) {
        log.error(`가루차 정지 상태 감지 실패`);
        throw new Error(`가루차 정지 상태 감지 실패: 가루차 넘버 ${motor}`);
    }

    log.info(`가루차 추출 완료`);
};

const dispenseSyrup = async (motor, extraction, hotwater, sparkling) => {
    log.info('////////--------------- 시럽 추출 요청 --------------------//////');
    log.info('////////--------------- 시럽 추출 요청 --------------------//////');
    log.info('////////--------------- 시럽 추출 요청 --------------------//////');

    // RD1 데이터 확인
    await McData.updateSerialData('RD1', 'RD1');
    const data = McData.getSerialData('RD1');
    log.info("시럽 추출 데이터: ", JSON.stringify(data));

    // Syrup 추출 명령
    await Order.setSyrup(motor, grinder(extraction), formatValue(hotwater), formatValue(sparkling));
    log.info(`${motor} 번 시럽 추출 실행`);
    await Order.extractSyrup();

    const isSyrup = await checkAutoOperationState("시럽", 2);

    // 시럽 동작 확인
    if (!isSyrup) {
        log.error(`시럽 동작 감지 실패 → 가루차 넘버: ${motor}`);
        throw new Error(`시럽 동작 감지 실패: 가루차 넘버 ${motor}`);
    }

    const isStopped = await checkAutoOperationState("정지", 3);

    if (!isStopped) {
        log.error(`시럽 정지 상태 감지 실패`);
        throw new Error(`시럽 정지 상태 감지 실패: 가루차 넘버 ${motor}`);
    }

    log.info(`시럽 추출 완료`);
};

/*
*  washChk : true 메세지 노출
* */

const formatValue = (value) => value.toString().padStart(3, "0");
const grinder = (moter) => {
    const result = Math.round(moter * 10);
    return formatValue(result);
};


    return { dispenseCup, dispenseIce, dispenseCoffee, dispenseGarucha, dispenseSyrup };
}

module.exports = { createSerialDispense };
