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

// 초기화 완료 후 호출 가능하도록 보장
const ensureUserDataInitialized = async () => {
    if (!userData) {
        await initializeUserData();
    }
};

/**결제 요청
 * */
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
                const response = await fetch("http://127.0.0.1:9189", {
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

const make_send_data = (senddata) => {
    let m_sendmsg;
    let m_totlen;
    let m_bodylen;

    m_bodylen = senddata.NCbyteLength();
    m_totlen = 12 + m_bodylen;

    return NCpad(m_totlen, 4) + "VCAT    " + NCpad(m_bodylen, 4) + senddata;
}

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
    const sendbuf = make_send_data(sendraw); // 여기서 전문 포맷을 완성

    try {
        const response = await fetch("http://127.0.0.1:9188", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: encodeURI(sendbuf)
        });

        const data = await response.text();
        log.info("응답 전문:", data);

        const barcode = extractBarcode(data);
        log.info("추출된 바코드:", barcode);

        return { success: true, barcode };

    } catch (error) {
        log.error("바코드 요청 실패:", error);
        return { success: false, message: "바코드 요청 실패!" };
    }
};

// 바코드 추출
const extractBarcode = (rawData) => {
    return rawData.slice(16); // 앞 16자리 제거 → 바코드 번호
};

// 바코드로 페이 요청
const reqPayproBarcode = async ( amount, barcode, halbu) => {
    const H7 = '\x07';
    const FS = '\x1C';

    const sendraw  =
        "NICEVCATB" + H7 +
        "0300" + FS +
        "10" + FS +
        "L" + FS +
        amount + FS +
        0 + FS +
        0 + FS +
        halbu + FS +
        "" + FS +
        "" + FS +
        "" + FS +
        FS + FS +
        barcode + FS +  // ← 바코드 번호
        FS + FS + FS + FS + FS +
        "" + FS +
        "" + FS +
        "PRO" + FS +
        "" + FS + FS + FS + FS + FS +
        H7;

    const sendbuf = make_send_data(sendraw); // 여기서 전문 포맷을 완성
    try {
        const response = await fetch("http://127.0.0.1:9188", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: encodeURI(sendbuf)
        });

        const data = await response.text();
        log.info("결제 응답:", data);
        return { success: true, data };
    } catch (error) {
        log.error("바코드 결제 요청 실패:", error);
        return { success: false, message: "바코드 결제 요청 실패!" };
    }
};



module.exports = {
    reqVCAT_HTTP,
    reqOrder,
    useWash,
    adminUseWash,
    coffeePreheating,
    reqBarcode_HTTP,
    reqPayproBarcode,
    requestAppRestart
};