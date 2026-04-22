/**
 * busyState.js
 * 머신 작업 중복 방지 상태관리
 * CommonJS / JS 기준
 */

let busyState = {
    isBusy: false,
    busyType: "",
    currentJobId: "",
    startedAt: "",
};

/**
 * 현재 상태 조회
 */
function getBusyState() {
    return { ...busyState };
}

/**
 * 작업 시작 가능 여부 체크
 */
function canStartJob(nextType) {
    if (!busyState.isBusy) {
        return { ok: true };
    }

    return {
        ok: false,
        message: `현재 [${getBusyTypeName(busyState.busyType)}] 작업이 진행 중입니다.`,
    };
}

/**
 * 작업 시작
 */
function startJob(busyType, currentJobId) {
    busyState.isBusy = true;
    busyState.busyType = busyType || "";
    busyState.currentJobId = currentJobId || "";
    busyState.startedAt = new Date().toISOString();

    console.log(
        `🟢 작업 시작 | 종류: ${getBusyTypeName(busyType)} | ID: ${busyState.currentJobId}`
    );
}

/**
 * 작업 종료
 */
function endJob() {
    console.log(
        `🔵 작업 종료 | 종류: ${getBusyTypeName(busyState.busyType)} | ID: ${busyState.currentJobId}`
    );

    busyState.isBusy = false;
    busyState.busyType = "";
    busyState.currentJobId = "";
    busyState.startedAt = "";
}

/**
 * 작업 종류 한글 변환
 */
function getBusyTypeName(type) {
    const typeMap = {
        order: "일반 주문 제조",
        adminDrink: "관리자 음료 제조",
        adminCup: "컵 배출",
        adminIce: "얼음 배출",
        wash: "세척 작업",
        preheat: "예열 작업",
        extractorHome: "추출기 홈 이동",
        fridgeOpen: "냉장고 개방",
        restart: "프로그램 재시작",
        shutdown: "프로그램 종료",
    };

    return typeMap[type] || type || "알 수 없는 작업";
}

module.exports = {
    getBusyState,
    canStartJob,
    startJob,
    endJob,
};