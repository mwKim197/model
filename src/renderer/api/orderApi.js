const log = require("../../logger");

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

                log.info(data);
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

                    log.info(data);
                    // 성공 여부 확인 (예: "SUCCESS"가 성공 메시지라고 가정)
                    if (data === "SUCCESS") {
                        log.info("결제 성공: " + data);
                        return { success: true, message: data };
                    } else {
                        log.error("결제 실패: " + data);
                        return { success: false, message: data };
                    }

                    iFlag = '0';
                } catch (error) {
                    if (sendMsg === "RESTART\u0007" || sendMsg === "NVCATSHUTDOWN\u0007") {
                        // 서버 종료 처리
                    } else {
                        log.error('AJAX 오류! NVCAT 서버가 정상적으로 동작하지 않음!');
                    }
                    iFlag = '0';
                }
            } else {
                log.info('다른 요청이 진행 중입니다.');
            }
        }
    }
}

function make_send_data(senddata) {
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

function NCpad(n, width) {
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n;
}

module.exports = {
    reqVCAT_HTTP,
};