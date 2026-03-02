const log = require("../../logger");
const { ipcRenderer } = require('electron');

// 전역 변수 선언
let userData = null;

function sendLogToMain(level, message) {
    ipcRenderer.send('log-to-main', { level, message });
}

const initializeUserData = async () => {
    try {
        userData = await ipcRenderer.invoke('get-user-data'); // 메인 프로세스에서 데이터 가져오기
        log.info('유저 정보 조회 완료:', userData);
        return true;
    } catch (error) {
        log.error('유저 정보 조회 실패:', error);
        throw error; // 초기화 실패 시 에러 던지기
    }
};

ipcRenderer.on("callBarcode", async (event, data) => {
    const barcode = await reqBarcode_HTTP();
    console.log(barcode);
});


// 초기화 완료 후 호출 가능하도록 보장
const ensureUserDataInitialized = async () => {
    if (!userData) {
        await initializeUserData();
    }
};

/**결제 요청 */
const reqVCAT_HTTP = async (cost, halbu) => {
    let sendMsg;
    let FS = '\x1C';
    let H7 = '\x07';
    let sendbuf;
    let iFlag = '0';

    sendMsg = sendbuf = "NICEVCAT" + H7 + "0200" + FS + "10" + FS + "C" + FS + cost + FS + 0 + FS + 0 + FS + halbu + FS + "" + FS + "" + FS + "" + FS + "" + FS + FS + FS + "" + FS + FS + FS + FS + ""+ FS + H7;

    if (sendMsg.length === 0 || cost === 0) {
        log.error("전송할 데이터가 없습니다.");
    } else {
        if (sendMsg === "REQ_STOP") {
            sendbuf = make_send_data(sendMsg);

            try {
                const response = await fetch("http://127.0.0.1:9188", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    body: encodeURI(sendbuf)
                });

                const data = await response.text();
                // 성공 여부 확인 (예: "SUCCESS"가 성공 메시지라고 가정)
                if (data === "SUCCESS") {
                    log.info("결제 성공: " + data);
                    return { success: true, message: data };
                } else {
                    log.error("결제 실패: " + data);
                    return { success: false, message: data };
                }

            } catch (error) {
                log.error("AJAX 요청 실패!");
            }

        } else {
            if (iFlag === '0') {
                sendbuf = make_send_data(sendMsg);
                iFlag = '1';

                try {
                    const response = await fetch("http://127.0.0.1:9188", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: encodeURI(sendbuf)
                    });
                    const data = await response.text();

                    const responseData = await reqNCData(data);

                    // 성공 여부 확인 (예: "SUCCESS"가 성공 메시지라고 가정)
                    if (responseData.isValid) {
                        sendLogToMain("info", `카드 결제 성공: ${JSON.stringify(data)}`);
                        return { success: true, message: responseData };
                    } else {
                        sendLogToMain("error", `카드 결제 실패: ${JSON.stringify(data)}`);
                        return { success: false, message: responseData };
                    }

                } catch (error) {
                    if (sendMsg === "RESTART\u0007" || sendMsg === "NVCATSHUTDOWN\u0007") {
                        // 서버 종료 처리
                    } else {
                        log.error('AJAX 오류! NVCAT 서버가 정상적으로 동작하지 않음!');
                        return { success: false, message: 'AJAX 오류! NVCAT 서버가 정상적으로 동작하지 않음!' };
                    }
                    iFlag = '0';
                }
            } else {
                log.info('다른 요청이 진행 중입니다.');
            }
        }
    }
}

/*const make_send_data = (senddata) => {
    let m_sendmsg;
    let m_totlen;
    let m_bodylen;

    m_bodylen = senddata.NCbyteLength();
    m_totlen = 12 + m_bodylen;

    return NCpad(m_totlen, 4) + "VCAT    " + NCpad(m_bodylen, 4) + senddata;
}*/

const make_send_data = (senddata) => {
    // senddata는 이미 Buffer 여야 함
    const bodyBuffer =
        Buffer.isBuffer(senddata)
            ? senddata
            : Buffer.from(senddata, "latin1"); // ★ 중요

    const bodyLen = bodyBuffer.length;
    const totalLen = 12 + bodyLen;

    return Buffer.concat([
        Buffer.from(NCpad(totalLen, 4), "ascii"),
        Buffer.from("VCAT    ", "ascii"),
        Buffer.from(NCpad(bodyLen, 4), "ascii"),
        bodyBuffer
    ]);
};


String.prototype.NCbyteLength = function() {
    let l = 0;

    for (let idx = 0; idx < this.length; idx++) {
        let c = escape(this.charAt(idx));

        if (c.length === 1) l++;
        else if (c.indexOf("%u") !== -1) l += 3;
        else if (c.indexOf("%") !== -1) l += c.length / 3; // UTF-8과 EUC-KR 고려
    }

    return l;
};

const NCpad = (n, width) => {
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}
const reqOrder = async (orderList) => {
    try {

        await ensureUserDataInitialized();

        const response = await fetch(`http://localhost:3142/start-order`, {
            method: 'POST', // POST 요청
            headers: {
                'Content-Type': 'application/json', // JSON 형식으로 전송
            },
            body: JSON.stringify(orderList),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! Status: ${response.status}`);
        }

        sendLogToMain('info', `ORDER : ${data}`);
    } catch (error) {

        const errMsg = error instanceof Error ? error.message : JSON.stringify(error);
        const errStack = error instanceof Error ? error.stack : '';
        sendLogToMain('error', `ORDER : ${errMsg}\n${errStack}`);
        throw error;
    }
}

const useWash = async (orderList) => {
    try {

        await ensureUserDataInitialized();
        
        const response = await fetch(`http://localhost:3142/wash`, {
            method: 'POST', // POST 요청
            headers: {
                'Content-Type': 'application/json', // JSON 형식으로 전송
            },
            body: JSON.stringify(orderList),
        });

        const data = await response.json();
        sendLogToMain('info',`워시 성공 - ${JSON.stringify(data)}`);

    } catch (error) {
        sendLogToMain('error',`워시 실패: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
    }
}

// 어드민 세척 함수
const adminUseWash = async (data) => {
    try {
        const response = await fetch(`http://localhost:3142/admin-use-wash`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data })
        });

        const result = await response.json();

        if (response.ok) {
            log.info('Success:', result.message);
        } else {
            log.error('Error:', result.message);
            if (result.error) {
                log.error('Details:', result.error.message);
            }
        }
    } catch (error) {
        log.error('Fetch error:', error.message);
    }
};

// 커피머신 예열
const coffeePreheating = async () => {
    try {
        const response = await fetch(`http://localhost:3142/coffee-preheating`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (response.ok) {
            log.info('Success:', result.message);
        } else {
            log.error('Error:', result.message);
            if (result.error) {
                log.error('Details:', result.error.message);
            }
        }
    } catch (error) {
        log.error('Fetch error:', error.message);
    }
};

// 프로그램 재시작 API 호출 함수
const requestAppRestart = async () => {
    try {
        const response = await fetch(`http://localhost:3142/restart-app`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        if (result.success) {
            alert('재부팅 요청 성공');
            console.log('재부팅 요청 성공:', result.message);
        } else {
            console.error('재부팅 요청 실패:', result.message);
        }
    } catch (error) {
        console.error('재부팅 요청 중 오류 발생:', error);
    }
}


const reStartCheck = async (orderList) => {
    try {

        await ensureUserDataInitialized();
        
        const response = await fetch(`http://localhost:3142/start-order`, {
            method: 'POST', // POST 요청
            headers: {
                'Content-Type': 'application/json', // JSON 형식으로 전송
            },
            body: JSON.stringify(orderList),
        });
        if (!response.ok) throw new Error('네트워크 응답 실패');

        const data = await response.json();
        log.info(data);

    } catch (error) {
        sendLogToMain('error','RD2: 데이터 가져오기 실패:', error);
    }
}
const reqNCData = async (rawData) => {
    const fieldDefinitions = [
        { name: "거래구분", length: 4, description: "승인 : 0210, 취소 : 0430" },
        { name: "거래유형", length: 2, description: "신용(10), 현금영수증(21)" },
        { name: "응답코드", length: 4, description: "정상: 0000" },
        { name: "거래금액", length: 12, description: "거래금액" },
        { name: "부가세", length: 12, description: "부가세" },
        { name: "봉사료", length: 12, description: "봉사료" },
        { name: "할부개월", length: 2, description: "할부개월" },
        { name: "승인번호", length: 12, description: "승인번호" },
        { name: "승인일시", length: 12, description: "승인일시(YYMMDDhhmmss)" },
        { name: "발급사코드", length: 2, description: "발급사코드" },
        { name: "발급사명", length: 20, description: "발급사명" },
        { name: "매입사코드", length: 2, description: "매입사코드" },
        { name: "매입사명", length: 20, description: "매입사명" },
        { name: "가맹점번호", length: 15, description: "가맹점번호" },
        { name: "승인CATID", length: 10, description: "승인CATID" },
        { name: "잔액", length: 9, description: "잔액(누적포인트)" },
        { name: "응답메시지", length: 112, description: "응답메시지" },
        { name: "카드Bin", length: 12, description: "Bin 6자리 + '*'" },
        { name: "카드구분", length: 1, description: "0: 신용카드, 1: 체크카드, 2: 선불카드" },
        { name: "전문관리번호", length: 20, description: "POS 전달 전문관리번호" },
        { name: "거래일련번호", length: 20, description: "카드번호 대체 거래일련번호" },
        { name: "기기번호", length: 10, description: "기기번호" },
        { name: "캐시백가맹점", length: 15, description: "캐시백 가맹점 정보" },
        { name: "캐시백승인번호", length: 12, description: "캐시백 승인번호" },
        { name: "VAN NAME", length: 10, description: "멀티VAN 사용 시 승인 VAN사" },
        { name: "전문TEXT", length: 3, description: "전문TEXT (예: 'PRO')" },
        { name: "기종구분", length: 2, description: "'H1': 일반거래" },
        { name: "사업자번호", length: 10, description: "사업자번호" },
        { name: "거래고유번호", length: 12, description: "거래고유번호" },
        { name: "DDC여부", length: 1, description: "1: DDC, 3: DSC/ESC 사인 있을 때, 4: DSC/ESC 사인 없을 때" },
        { name: "실승인금액", length: 9, description: "실승인금액" },
    ];

    const fields = rawData.split(/\x1C/);

    const parsedData = fields.map((value, index) => ({
        name: fieldDefinitions[index]?.name || `Field${index + 1}`,
        value: value.trim(),
        description: fieldDefinitions[index]?.description || "N/A",
    }));

    // 정상적인 응답인지 확인하는 함수
    function isValidResponse(parsedData) {
        // 응답코드를 찾아서 0000인지 확인
        const responseCode = parsedData.find(field => field.name === "응답코드");
        return responseCode && responseCode.value === "0000";
    }

    const isValid = await isValidResponse(parsedData);

    return {isValid: isValid, parsedData: parsedData};
}

// 바코드 조회
const reqBarcode_HTTP = async () => {
    const H7 = '\x07';
    const sendraw = "REQ_BARCODE" + H7 + "1" + H7;
    const sendbuf = make_send_data(sendraw);

    try {
        const response = await fetch("http://127.0.0.1:9188", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: encodeURI(sendbuf)
        });

        const data = await response.text();
        log.info("응답 전문:", data);

        // 바코드 추출
        const barcode = extractBarcode(data);
        log.info("추출된 바코드:", barcode);

        // ✅ 공통 데이터 구조
        return {
            success: true,
            raw: data,           // 전문 원본
            barcode: barcode,    // 바코드 문자열
            timestamp: Date.now()
        };

    } catch (error) {
        log.error("바코드 요청 실패:", error);
        return { success: false, message: "바코드 요청 실패!" };
    }
};

// 바코드 조회 중단
const stopBarcode_HTTP = async () => {
    const sendraw = "REQ_STOP";
    const sendbuf = make_send_data(sendraw); // "0020VCAT    0008REQ_STOP"

    try {
        const res = await fetch("http://127.0.0.1:9189", {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=UTF-8",
            },
            body: sendbuf, // ❗ encodeURI 제거
        });

        const data = await res.text();
        log.info("✅ 바코드 중단 응답:", data);
    } catch (e) {
        log.error("❌ 실패:", e);
    }
};

// 바코드 추출
const extractBarcode = (rawData) => {
    return rawData.slice(16); // 앞 16자리 제거 → 바코드 번호
};

// 쿠폰 조회 (메인/프리로드 쪽에서 사용 가정)
const getCoupon = async (couponCode) => {
    await ensureUserDataInitialized();

    if (!couponCode || !couponCode.trim()) {
        // 항상 래핑해서 반환
        return {
            statusCode: 400,
            body: JSON.stringify({
                code: "INVALID_PARAMETER",
                message: "쿠폰번호를 입력해주세요."
            })
        };
    }

    const url =
        `https://api.narrowroad-model.com/model_coupon?func=getCouponOne` +
        `&userId=${encodeURIComponent(userData.userId)}` +
        `&couponCode=${encodeURIComponent(couponCode)}`;

    try {
        const res = await fetch(url, {
            method: "GET",
            // GET은 Content-Type 불필요하지만 있어도 무해
            headers: { "Content-Type": "application/json" }
        });

        // fetch는 4xx/5xx에서도 throw 안 하므로 여기서 항상 결과를 래핑해서 돌려줌
        const text = await res.text(); // 문자열 보장
        return {
            statusCode: res.status,
            body: text || "{}"
        };
    } catch (e) {
        // 네트워크/IPC 오류도 throw하지 말고 래핑해서 반환
        return {
            statusCode: 0,
            body: JSON.stringify({
                code: "IPC_ERROR",
                message: e?.message || "쿠폰 조회 중 내부 통신 오류"
            })
        };
    }
};

// ✅ 쿠폰 사용 (여러 개 동시 처리)
const useCoupon = async (couponArray) => {
    await ensureUserDataInitialized();

    // ✅ 유효성 검사
    if (!Array.isArray(couponArray) || couponArray.length === 0) {
        return {
            statusCode: 400,
            body: JSON.stringify({
                code: "INVALID_PARAMETER",
                message: "사용할 쿠폰을 선택해주세요."
            })
        };
    }

    const url = "https://api.narrowroad-model.com/model_coupon?func=useCoupon";

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId: userData.userId,
                coupons: couponArray
            })
        });

        const text = await res.text(); // 항상 문자열
        return {
            statusCode: res.status,
            body: text || "{}"
        };
    } catch (e) {
        return {
            statusCode: 0,
            body: JSON.stringify({
                code: "IPC_ERROR",
                message: e?.message || "쿠폰 사용 중 내부 통신 오류가 발생했습니다."
            })
        };
    }
};

// 바코드 결제
const reqPayproBarcode = async (amount, halbu = "00") => {
    // 1️⃣ 바코드 먼저 조회
    const barcodeData = await reqBarcode_HTTP();

    if (!barcodeData.success) return barcodeData;

    const barcode = barcodeData.barcode;

    sendLogToMain("info", `추출된바코드: ${barcode}`);
    
    // 2️⃣ 결제수단 구분
    const isKakaoPay = barcode.startsWith("28");
    const isOnlyNumbers = /^[0-9]+$/.test(barcode);
    const isNaverPay = barcode.startsWith("hQV") || barcode.startsWith("hQVC") || barcode.startsWith("hQVE");
    const isQRType = !isOnlyNumbers && !isKakaoPay;

    // 3️⃣ 네이버페이 QR 필터링
    if (isNaverPay) {
        sendLogToMain("error", "네이버페이 QR 감지됨");
        return { success: false, message: "지원하지 않는 결제수단입니다.\n" +
                "관리자에게 문의하세요." };
    }

    // 4️⃣ 기타 알파벳 포함된 QR류(미지원) 필터링
    if (isQRType) {
        sendLogToMain("error", `미지원 QR형식 감지: ${barcode.slice(0, 10)}...`);
        return { success: false, message: "지원하지 않는 결제수단입니다.\n" +
                "관리자에게 문의하세요." };
    }

    if (isKakaoPay) {
        sendLogToMain("info", "카카오페이 바코드 감지됨");

        // ✅ 2-1. 승인인증 (KKS)
        const authRaw = buildKakaoAuthRequest(amount, barcode, halbu);
        const authBuf = make_send_data(authRaw);
        const authRes = await fetch("http://127.0.0.1:9188", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: encodeURI(authBuf),
        });

        const authData = await authRes.text();
        const authParsed = await reqNCData(authData);

        if (!authParsed.isValid) {
            // parsedData에서 "응답메시지" 항목 찾기
            const messageItem = authParsed.parsedData.find(item => item.name === "응답메시지");
            const message = messageItem?.value || "카카오페이 승인인증 실패";

            sendLogToMain("error", message);
            return { success: false, message: "지원하지 않는 결제수단입니다.\n" +
                    "관리자에게 문의하세요." };
        }

        // ✅ 2-2. 머니승인 (MONY)
        const moneyRaw = buildKakaoMoneyRequest(amount, barcode, halbu);
        const moneyBuf = make_send_data(moneyRaw);
        const moneyRes = await fetch("http://127.0.0.1:9188", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: encodeURI(moneyBuf),
        });

        const moneyData = await moneyRes.text();
        const moneyParsed = await reqNCData(moneyData);

        if (moneyParsed.isValid) {

            // moneyParsed "응답메시지" 항목 찾기
            const messageItem = moneyParsed.parsedData.find(item => item.name === "응답메시지");
            const message = messageItem?.value || "카카오페이 머니승인 성공";

            sendLogToMain("info", message);

            return { success: true, message: moneyParsed };
        } else {
            // moneyParsed "응답메시지" 항목 찾기
            const messageItem = moneyParsed.parsedData.find(item => item.name === "응답메시지");
            const message = messageItem?.value || "카카오페이 머니승인 실패";

            sendLogToMain("error", message);
            return { success: false, message :"지원하지 않는 결제수단입니다.\n" +
                    "관리자에게 문의하세요." };

        }

    } else {
        // ✅ 일반 바코드 결제
        const sendraw = buildBarcodeRequest(amount, barcode, halbu);
        const sendbuf = make_send_data(sendraw);

        console.log("typeof sendbuf:", typeof sendbuf);
        console.log("isBuffer:", Buffer.isBuffer(sendbuf));

        if (Buffer.isBuffer(sendbuf)) {
            console.log("HEX:", sendbuf.toString("hex"));
        } else {
            console.log("STRING HEX:", Buffer.from(sendbuf, "latin1").toString("hex"));
        }

        const sendStr = sendbuf.toString("latin1");
        sendLogToMain("info", "바코드 메세지" + sendStr);
        try {
            const response = await fetch("http://127.0.0.1:9188", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: encodeURI(sendStr)   // ★ 핵심
            });

            const data = await response.text();
            const responseData = await reqNCData(data);

            if (responseData.isValid) {

                // responseData "응답메시지" 항목 찾기
                const messageItem = responseData.parsedData.find(item => item.name === "응답메시지");
                const message = messageItem?.value || "바코드 결제 성공";

                sendLogToMain("info", message);

                return { success: true, message: responseData };
            } else {
                // responseData "응답메시지" 항목 찾기
                const messageItem = responseData.parsedData.find(item => item.name === "응답메시지");
                const message = messageItem?.value || "일반 바코드 결제 실패";

                sendLogToMain("error", message);
                return { success: false, message: "지원하지 않는 결제수단입니다.\n" +
                        "관리자에게 문의하세요." };
            }
        } catch (error) {
            sendLogToMain("error", `바코드 결제 요청 실패: ${error}`);
            return { success: false, message: "바코드 결제 요청 실패!" };
        }
    }
};


// 1️⃣ 카카오 승인인증 전문
function buildKakaoAuthRequest(amount, barcode, halbu = "00") {
    const H7 = '\x07';
    const FS = '\x1C';
    const amtStr = String(amount || 0); // ✅ 패딩 제거 (12자리 금지)
    const halbuStr = String(halbu ?? "00").padStart(2, "0");
    const barcodeStr = String(barcode || "");

    const fields = [
        "0300", "10", "L", amtStr, "0", "0", halbuStr,
        "", "", "", "", "",      // 빈 필드 5개
        barcodeStr,
        "", "", "", "", "","",      // 빈 필드 6개
        "KKS",                   // ✅ 카카오 승인인증
        "", "", "", "", "",""       // 마지막 6개 빈 필드
    ];

    return "NICEVCATB" + H7 + fields.join(FS) + H7;
}

// 2️⃣ 카카오 머니 승인 전문
function buildKakaoMoneyRequest(amount, barcode, halbu = "00") {
    const H7 = '\x07';
    const FS = '\x1C';

    // ✅ 카카오머니 승인에서는 패딩 금지
    const amtStr = String(amount || 0);
    const halbuStr = String(halbu ?? "00").padStart(2, "0");
    const barcodeStr = String(barcode || "");

    const fields = [
        "0300", "10", "L", amtStr, "0", "0", halbuStr,
        "", "", "", "", "",               // 빈 필드 5개
        barcodeStr,
        "", "", "", "", "",               // 빈 필드 5개
        "MONY         ",                  // ✅ 'MONY' + 공백 포함
        "KKE",                            // ✅ VAN 구분코드
        "", "", "",                       // 빈 필드 3개
        "KKE000001004",                   // ✅ VAN 거래ID
        "", ""                            // ✅ 마지막 2개 빈 필드
    ];

    return "NICEVCATB" + H7 + fields.join(FS) + H7;
}


// 바코드 결제 전문 생성
function buildBarcodeRequest(amount, barcode, halbu = "00") {
    const H7 = '\x07';
    const FS = '\x1C';

    const amtStr = String(amount || 0);
    const halbuStr = (typeof halbu === "number" || typeof halbu === "string")
        ? String(halbu).padStart(2, "0") // 1 → "01"
        : "00";
    const barcodeStr = String(barcode || "");

    const fields = [
        /* 01 */ "0300",
        /* 02 */ "10",
        /* 03 */ "L",
        /* 04 */ amtStr,
        /* 05 */ "0",
        /* 06 */ "0",
        /* 07 */ halbuStr,
        /* 08 */ "",
        /* 09 */ "",
        /* 10 */ "",
        /* 11 */ "",
        /* 12 */ "",
        /* 13 */ barcodeStr,
        /* 14 */ "",
        /* 15 */ "",
        /* 16 */ "",
        /* 17 */ "",
        /* 18 */ "",
        /* 19 */ "",
        /* 20 */ "PRO",
        /* 21 */ "",
        /* 22 */ "",
        /* 23 */ "",
        /* 24 */ "",
        /* 25 */ ""
    ];

    return "NICEVCATB" + H7 + fields.join(FS) + H7;
}

// 재고 조회
const getInventoryStatus = async (userId) => {
    try {
        const res = await fetch(
            `https://api.narrowroad-model.com/model_inventory_calculate?func=get-runtime&userId=${userId}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        if (!res.ok) {
            throw new Error("Inventory API error");
        }

        return await res.json();
    } catch (err) {
        console.error("❌ inventory api error:", err);
        return null;
    }
}

// RF 전문생성
function buildReqCmdHttp(type, cmd, senddata = "  ") {
    const H7 = '\x07';
    const FS = '\x1C';

    if (!senddata || senddata.length < 2) {
        senddata = "  ";
    }

    // 실제 명령부
    const commandBody =
        "REQ_CMD" +
        H7 +
        String(type) + FS +
        String(cmd) + FS +
        senddata +
        H7;

    const bodyLength = commandBody.length.toString().padStart(4, "0");

    const fullPacket =
        bodyLength + "VCAT    " + bodyLength + commandBody;

    return fullPacket;
}

// RF전송
async function sendNvcAtHttp(packet) {

    const url = "http://127.0.0.1:9188";

    try {

        const buffer = Buffer.from(packet, "ascii");

        console.log("📤 전송 HEX:", buffer.toString("hex"));

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: encodeURI(packet)
        });

        const text = await res.text();

        console.log("📥 ASCII:", text);
        console.log("📥 HEX:", Buffer.from(text, "ascii").toString("hex"));


        return text;

    } catch (err) {
        console.error("❌ NVCAT 전송 실패:", err);
        throw err;
    }
}

// 실제 RF조회
async function requestEmployeeCardId() {

    const packet = buildReqCmdHttp(1, 147, "  "); // 공백 2Byte 필수

    const response = await sendNvcAtHttp(packet);

    return response;
}


module.exports = {
    reqVCAT_HTTP,
    reqOrder,
    useWash,
    adminUseWash,
    coffeePreheating,
    reqBarcode_HTTP,
    stopBarcode_HTTP,
    getCoupon,
    useCoupon,
    reqPayproBarcode,
    requestAppRestart,
    requestEmployeeCardId,
    getInventoryStatus
};