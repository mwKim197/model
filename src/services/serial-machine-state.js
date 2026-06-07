const log = require('../logger');

function createSerialMachineState({ McData, eventEmitter, state }) {
const checkCupSensor = async (expectedState, threshold, washChk, count = null, totalCount = null, admin = false) => {
    log.info('////////--------------- 컵센서 체크 요청 --------------------//////');
    log.info('////////--------------- 컵센서 체크 요청 --------------------//////');
    log.info('////////--------------- 컵센서 체크 요청 --------------------//////');
    let stateCount = 0; // 상태 카운터
    for (let counter = 0; counter < 120; counter++) {
        const startTime = Date.now(); // 루프 시작 시간 기록
        await McData.updateSerialData('RD1', 'RD1');
        const data = McData.getSerialData('RD1');
        log.info(`컵 센서 time out 여부: ${expectedState} :  ${counter}/ 120`);

        if (admin && expectedState === "있음" && washChk) {
            eventEmitter.emit('order-update', { menu: `${state.menuName}`, status: 'drinkCount', message: `컵을 음료 투출구에 놓아주세요.`, time: counter });
        }

        // 모달 동작
        if (expectedState === "있음" && washChk) {
            if (count && totalCount) {
                eventEmitter.emit('order-update', { menu: `${state.menuName} ${count} / ${totalCount}`, status: 'drinkCount', message: `컵을 음료 투출구에 놓아주세요.`, time: counter });
            } else {
                eventEmitter.emit('order-update', { menu: `${state.menuName}`, status: 'drinkCount', message: `컵을 음료 투출구에 놓아주세요.`, time: counter });
            }

        }

        if (expectedState === "없음" && washChk ) {
            eventEmitter.emit('order-update', { menu: `${state.menuName} ${count} / ${totalCount}`, status: 'completedCount', message: `음료가 완성되었습니다. 컵을꺼내주세요.`, time: counter });
        }

        if (data.cupSensor === expectedState) {
            stateCount++;
            log.info(`컵 센서 여부: '${expectedState}', 횟수: ${stateCount} 회`);
            if (stateCount >= threshold) {
                log.info(`컵 센서 여부: '${expectedState}' 상태,  ${threshold} 회 반복 완료.`);
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

    log.warn(`센서 타임아웃, 카테고리명 '${expectedState}'.`);
    return false; // 타임아웃 처리
};

// 머신 동작 체크
const checkAutoOperationState = async (expectedState, threshold) => {
    let stateCount = 0; // 상태 카운터
    const initialFailTimeout = 3000; // ✅ 초기 실패 감지 시간(ms)
    const startTimeOverall = Date.now();

    const fastFailCategories = ['커피', '시럽', '가루차']; // ✅ 빠른 실패 감지할 카테고리

    for (let counter = 0; counter < 1200; counter++) {
        const loopStartTime = Date.now();

        await McData.updateSerialData('RD1', 'RD1');
        const data = McData.getSerialData('RD1');
        console.log(`머신상태: ${data.autoOperationState} `);

        if (data.autoOperationState === expectedState) {
            stateCount++;
            // ✅ 로그 출력
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

        // ✅ 초기 실패 감지 (특정 category만)
        if (
            fastFailCategories.includes(expectedState) && // ✅ category가 fastFail 대상인지 체크
            (Date.now() - startTimeOverall) >= initialFailTimeout &&
            stateCount === 0
        ) {
            log.warn(`빠른 실패: '${expectedState}' 상태 ${initialFailTimeout / 1000}s 안에 감지 못함`);
            return false;
        }

        // 루프 실행 시간 측정
        const elapsedTime = Date.now() - loopStartTime;
        const remainingTime = 100 - elapsedTime; // 남은 시간 계산
        if (remainingTime > 0) {
            await new Promise((r) => setTimeout(r, remainingTime));
        }
    }

    log.warn(`머신 동작확인 타임아웃, 카테고리명: '${expectedState}'.`);
    return false; // 타임아웃 처리
};



    return { checkCupSensor, checkAutoOperationState };
}

module.exports = { createSerialMachineState };
