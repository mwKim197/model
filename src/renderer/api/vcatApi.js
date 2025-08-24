// smtcat-agent.js  (CommonJS + ESM 호환, 최소 의존성)
// - 기본 WebSocket: window.WebSocket
// - Node/프리로드에서 window.WebSocket 없으면 require('ws') 시도 (선택)

(function factorySetup() {
    // 안전한 WS 결정 (브라우저 우선, 없으면 ws 모듈 시도)
    function resolveWebSocket() {
        if (typeof window !== 'undefined' && window.WebSocket) return window.WebSocket;
        try {
            // 프리로드/Node 테스트 환경
            // eslint-disable-next-line global-require
            return require('ws');
        } catch (_) {
            throw new Error('WebSocket 구현을 찾을 수 없습니다. (브라우저 WebSocket 또는 ws 모듈 필요)');
        }
    }

    // smtcat-agent.js
    class SmTCatAgentClient {
        constructor({
                        wsUrl = "ws://127.0.0.1:8000",
                        channel = "SMTCatAgent_WEB_SAMPLE",
                        keyType = "VNUMBER",
                        logger = console,
                        returnShape = "compat", // "compat" | "raw"
                    } = {}) {
            this.wsUrl = wsUrl;
            this.channel = channel;
            this.keyType = keyType;
            this.logger = logger;
            this.ws = null;
            this.status = "IDLE";
            this._pending = null;
            this.returnShape = returnShape;
        }

        _send(method, input = null, param = null) {
            const payload = {
                CHANNEL_NAME: this.channel,
                METHOD: method,
                PARAM: { KEY_TYPE: this.keyType, ...(param || {}) },
                ...(input ? { INPUT: input } : {}),
            };
            const json = JSON.stringify(payload);
            this.logger.debug?.("[TX]", json);
            this.ws.send(json);
        }

        async _cycle(buildInputFn) {
            if (this.ws) throw new Error("WebSocket busy");
            return new Promise((resolve, reject) => {
                this.ws = new WebSocket(this.wsUrl);
                this.status = "CONNECTING";

                const cleanup = () => {
                    try { this.ws?.close(); } catch {}
                    this.ws = null;
                    this.status = "IDLE";
                    this._pending = null;
                };

                this._pending = { resolve, reject, cleanup };

                this.ws.onerror = (evt) => {
                    this.logger.error?.("[WS-ERR]", evt?.message || evt);
                    this.status = "ERROR";
                };

                this.ws.onopen = () => {
                    this.logger.debug?.("[WS-OPEN]");
                    this.status = "OPEN";
                    this._send("SMTCONNECT", { CONN_TYPE: "0", DESTINATION: "127.0.0.1:13855" });
                };

                this.ws.onmessage = (evt) => {
                    this.logger.debug?.("[RX]", evt.data);
                    let data;
                    try { data = JSON.parse(evt.data); } catch (e) {
                        this.logger.error?.("Invalid JSON", e);
                        return;
                    }

                    const ret = data["RET_CODE"];
                    if (typeof ret === "number" && ret < 0) {
                        this.status = "ERROR";
                        this._send("SMTDISCONNECT");
                        this._pending?.reject(new Error(`RET_CODE ${ret}`));
                        cleanup();
                        return;
                    }

                    if (this.status === "OPEN") {
                        this.status = "INIT";
                        this._send("SMTINITDATA");
                        return;
                    }

                    if (this.status === "INIT") {
                        this.status = "TIMEOUT";
                        this._send("SMTTIMEOUTSET", { SENDTIME: "100", RCVTIME: "100" });
                        return;
                    }

                    if (this.status === "TIMEOUT") {
                        this.status = "TRADE";
                        const input = buildInputFn();
                        this._send("SMTTRADE", input);
                        return;
                    }

                    if (this.status === "TRADE") {
                        const output = data?.OUTPUT || {};
                        this.status = "CLOSE";
                        this._send("SMTDISCONNECT");

                        // ▲ 여기서 “통일 포맷”으로 변환해서 리턴
                        if (this.returnShape === "compat") {
                            const shaped = adaptWsOutputToHttpShape(output);
                            this._pending?.resolve(shaped);
                        } else {
                            this._pending?.resolve(output); // raw
                        }
                        cleanup();
                    }
                };

                this.ws.onclose = () => {
                    this.logger.debug?.("[WS-CLOSE]");
                    if (this.status !== "IDLE" && this.status !== "CLOSE") {
                        this._pending?.reject?.(new Error("WebSocket closed unexpectedly"));
                        cleanup();
                    }
                };
            });
        }

        // ===== 내부 매핑 유틸 =====
        _clean(v) {
            if (v == null) return "";
            const s = String(v).trim();
            return s.toLowerCase() === "null" ? "" : s;
        }

        _getYYMMDDhhmmss(output) {
            const t12 = this._clean(output["0019"]); // 12자리
            if (/^\d{12}$/.test(t12)) return t12;

            const d8 = this._clean(output["0036"]);  // YYYYMMDD
            const t6 = this._clean(output["0035"]);  // hhmmss
            if (/^\d{8}$/.test(d8) && /^\d{6}$/.test(t6)) {
                return d8.slice(2) + t6; // YY + MMDD + hhmmss
            }
            return "";
        }

        _deriveCardBin(maskedPan) {
            const pan = this._clean(maskedPan).replace(/\*/g, "");
            if (/^\d{6,}$/.test(pan)) return pan.slice(0, 6) + "*";
            const six = this._clean(maskedPan).replace(/[^0-9]/g, "").slice(0, 6);
            return six ? six + "*" : "";
        }

        _toParsedDataLikeHttp(output) {
            const clean = (k) => this._clean(output[k]);
            const fieldDefs = [
                { name: "거래구분",     value: clean("0021"), desc: "승인: 01" },
                { name: "거래유형",     value: clean("0062"), desc: "0101/2101 등" },
                { name: "응답코드",     value: clean("0073"), desc: "정상: 00" },
                { name: "거래금액",     value: clean("0064"), desc: "거래금액" },
                { name: "부가세",       value: clean("0063"), desc: "세금" },
                { name: "봉사료",       value: clean("0051"), desc: "봉사료" },
                { name: "할부개월",     value: clean("0094"), desc: "할부개월/사용구분" },
                { name: "승인번호",     value: clean("0065"), desc: "승인번호" },
                { name: "승인일시",     value: this._getYYMMDDhhmmss(output), desc: "YYMMDDhhmmss" },
                { name: "발급사코드",   value: clean("0002"), desc: "발급사코드" },
                { name: "발급사명",     value: clean("0039"), desc: "발급사명" },
                { name: "매입사코드",   value: "",            desc: "" },
                { name: "매입사명",     value: clean("0033"), desc: "매입사명" },
                { name: "가맹점번호",   value: clean("0015"), desc: "가맹점번호" },
                { name: "승인CATID",    value: "",            desc: "" },
                { name: "잔액",         value: clean("0078"), desc: "" },
                { name: "응답메시지",   value: this._clean(String(output["0101"] || "").replace(/\u001e/g, "")), desc: "" },
                { name: "카드Bin",      value: this._deriveCardBin(output["0091"]), desc: "BIN 6자리+*" },
                { name: "카드구분",     value: "",            desc: "" },
                { name: "전문관리번호", value: "",            desc: "" },
                { name: "거래일련번호", value: clean("0019"), desc: "거래고유번호" },
                { name: "기기번호",     value: clean("0029"), desc: "단말기 번호" },
                { name: "사업자번호",   value: clean("0054"), desc: "사업자번호" },
                { name: "DDC여부",      value: clean("0002"), desc: "장비코드 유사 맵" },
                { name: "실승인금액",   value: clean("0064"), desc: "" },
            ];
            return fieldDefs.map(f => ({ name: f.name, value: f.value ?? "", description: f.desc || "N/A" }));
        }
    }

// ===== 모듈 외부에서 재사용할 수 있게, 공용 어댑터 함수 =====
    function adaptWsOutputToHttpShape(output) {
        const clean = (v) => {
            if (v == null) return "";
            const s = String(v).trim();
            return s.toLowerCase() === "null" ? "" : s;
        };
        const respCode = clean(output["0073"]);
        const isValid = respCode === "00";

        // 임시 인스턴스 없이 간단 맵핑(중복 로직 피하려면 위 클래스의 메서드를 써도 됨)
        const tmp = new SmTCatAgentClient({ returnShape: "raw" });
        const parsedData = tmp._toParsedDataLikeHttp(output);

        return { success: isValid, message: { isValid, parsedData } };
    }

    // ===== 공개 API (샘플 5종) =====
    SmTCatAgentClient.prototype.tradeCreditApprove = function ({
        amount = "1004", tax = "0", installment = "00", sign = "3",
    } = {}) {
        return this._cycle(() => ({
            "0062": "0101", // 서비스유형
            "0021": "01",   // 거래구분
            "0094": installment,
            "0058": sign,
            "0064": String(amount),
            "0063": String(tax),
        }));
    };

    SmTCatAgentClient.prototype.tradeCreditCancel = function ({
        amount = "1004", tax = "0", installment = "00", sign = "3", approvalNo, baseTradeDate,
    } = {}) {
        return this._cycle(() => ({
            "0062": "2101",
            "0021": "01",
            "0094": installment,
            "0058": sign,
            "0064": String(amount),
            "0063": String(tax),
            "0065": approvalNo || "",
            "0071": baseTradeDate || "",
        }));
    };

    SmTCatAgentClient.prototype.tradeCashApprove = function ({ amount = "1004", tax = "0" } = {}) {
        return this._cycle(() => ({
            "0062": "0101",
            "0021": "02",
            "0094": "03",
            "0058": "0",
            "0064": String(amount),
            "0063": String(tax),
        }));
    };

    SmTCatAgentClient.prototype.tradeCashCancel = function ({ amount = "1004", tax = "0", cancelReason = "1", approvalNo, baseTradeDate } = {}) {
        return this._cycle(() => ({
            "0062": "2101",
            "0021": "02",
            "0094": "03",
            "0090": cancelReason,
            "0058": "0",
            "0064": String(amount),
            "0063": String(tax),
            "0065": approvalNo || "",
            "0071": baseTradeDate || "",
        }));
    };

    SmTCatAgentClient.prototype.infoCheck = function () {
        return this._cycle(() => ({
            "0062": "5201",
            "0004": "8500207",
        }));
    };

    // ===== CommonJS export =====
    module.exports = {
        SmTCatAgentClient,
        adaptWsOutputToHttpShape,
    };
})();
