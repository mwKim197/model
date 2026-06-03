(function exposeOrderInputModal(root, factory) {
    const api = factory();

    if (typeof module === "object" && module.exports) {
        module.exports = api;
    }

    root.OrderInputModal = api;
})(typeof globalThis !== "undefined" ? globalThis : window, function createOrderInputModalApi() {
    function createInputModalController(dependencies) {
        const {
            ACTIONS,
            getUserInfo,
            getGlobalDim,
            getOrderList,
            setIsPaying,
            electronAPI,
            playAudio,
            resetCountdown,
            openAlertModal,
            openModal,
            cleanNumber,
            getBarcodeScanModal,
            getCouponApi,
        } = dependencies;

        let inputCount = 12; // 입력 제한 초기 값
        const passwordCount = 4; // 비밀번호 제한 값
        let inputTarget = null; // 현재 콘텐츠 상태 저장
        let type = "number";
        let usePoint = 0; // 사용포인트
        let totalAmt = 0; // 전체결제금액
        let availablePoints = 0; // 보유포인트
        let remainingAmount = 0; // 잔여결제액
        let digitCount = 4;
        let isPhone = false;
        
        // 포인트 결제 (모달 열기)
        const pointPayment = (orderAmount) => {
            return new Promise((resolve) => {
        
                playAudio('../../assets/audio/포인트를 적립 혹은 사용하시겠습니까.mp3');
        
                const modal = document.getElementById("pointModal");
               // const globalDim = document.getElementById('globalDim');
                inputCount = getUserInfo().mileageNumber ? getUserInfo().mileageNumber : 12; // 입력 제한 초기화
                usePoint = 0; //
                totalAmt = orderAmount;
                isPhone = getUserInfo()?.isPhone || false; // 휴대폰 여부
                modal.classList.remove("hidden"); // 모달 열기
                getGlobalDim().classList.remove("hidden"); // 딤 열기
                updateDynamicContent("pointInput", orderAmount ,resolve);
            });
        };
        
        // 입력 템플릿 생성 함수
        function createInputTemplate(title = "", count = 4) {
            digitCount = count;
            return `
                <div class="h-32 flex flex-col items-center w-full">
                    ${title ? `<p class="text-5xl text-center mb-4">${title}</p>` : ""}
                </div>
                <div class="h-12 flex justify-center items-center w-full">
                <div class="relative w-[425px] h-[60px] flex flex-col justify-center">
                    <!-- 숫자 표시 (입력 값) -->
                    <div id="inputDisplay" 
                        class="text-5xl text-black tracking-widest w-full text-center min-h-[50px] flex items-center justify-center box-border border-b-4 border-black">
                    </div>
                </div>
            `;
        }
        
        // 모바일번호 폼
        function createPhoneInputTemplate(title) {
            return `
                <div class="h-32 text-center">
                    ${title ? `<p class="text-5xl text-center mb-4">${title}</p>` : ""}
                </div>
                <div class="mt-7 h-4 flex justify-center items-center">
                    <div class="flex gap-2">
                        <!-- 첫 번째 입력칸 (010 고정) -->
                        <div class="relative flex items-center">
                            <div class="text-5xl text-center">010</div>
                            <div class="text-5xl text-center mx-2">-</div>
                        </div>
                        <!-- 두 번째 입력칸 (4자리) -->
                        <div class="relative flex items-center">
                            <div id="inputDigit-101" class="text-5xl text-center text-black">_</div>
                            <div id="inputDigit-102" class="text-5xl text-center text-black">_</div>
                            <div id="inputDigit-103" class="text-5xl text-center text-black">_</div>
                            <div id="inputDigit-104" class="text-5xl text-center text-black">_</div>
                            <div class="text-5xl text-center mx-2">-</div>
                        </div>
                        <!-- 세 번째 입력칸 (4자리) -->
                        <div class="relative flex items-center">
                            <div id="inputDigit-201" class="text-5xl text-center text-black">_</div>
                            <div id="inputDigit-202" class="text-5xl text-center text-black">_</div>
                            <div id="inputDigit-203" class="text-5xl text-center text-black">_</div>
                            <div id="inputDigit-204" class="text-5xl text-center text-black">_</div>
                        </div>
                    </div>
                </div>
        
            `;
        }
        
        // 입력값 저장할 배열
        let inputValue = ""; // 입력된 숫자를 저장하는 문자열 변수
        let phoneValues = [[], []];
        let phoneIndex = 0; // 현재 입력할 위치
        
        // 입력된 숫자를 HTML(`#inputDisplay`)에 업데이트하는 함수
        function updateInputDisplay() {
            const display = document.getElementById("inputDisplay");
            if (display) {
                if (type === "password") {
                    display.textContent = "*".repeat(inputValue.length); // 비밀번호 입력 시 * 로 표시
                } else {
                    display.textContent = inputValue; // 일반 숫자는 그대로 표시
                }
            }
        }
        
        // 번호 버튼 이벤트 등록
        function setupNumberButtons() {
            const numberButtons = document.querySelectorAll("[data-number]");
            inputValue = ""; // 입력된 숫자를 저장하는 문자열 변수
            phoneValues = [[], []];
            phoneIndex = 0; // 현재 입력할 위치
        
            numberButtons.forEach((button) => {
                button.addEventListener("click", () => {
        
                    // 리셋 타이머 초기화
                    resetCountdown();
                    const number = button.getAttribute("data-number");
                    if (type === "coupon") {
                        if (inputValue.length < 6) {
                            inputValue += number; // 입력된 값에 추가
                            updateInputDisplay();
                        } else {
                            openAlertModal(`6 자리까지만 입력 가능합니다.`);
                        }
                    }
                    if (type === "number") {
                        if (inputValue.length < 12) {
                            inputValue += number; // 입력된 값에 추가
                            updateInputDisplay();
                        } else {
                            openAlertModal(`4~12 자리까지만 입력 가능합니다.`);
                        }
                    } if (type === "password") {
                        if (inputValue.length < passwordCount) {
                            inputValue += number; // 입력된 값에 추가
                            updateInputDisplay();
                        } else {
                            openAlertModal(`4 자리까지만 입력 가능합니다.`);
                        }
                    } else if (type === "phone") {
                        if (phoneIndex < 2) {
                            if (phoneValues[phoneIndex].length < 4) {
                                // 현재 칸에 숫자 추가
                                phoneValues[phoneIndex] += number;
                                const targetIndex = phoneIndex === 0 ? 101 : 201; // 첫 번째 칸(101~104), 두 번째 칸(201~204)
        
                                // 해당 칸 업데이트
                                document.getElementById(`inputDigit-${targetIndex + phoneValues[phoneIndex].length - 1}`).textContent = number;
        
                                // 4자리 입력하면 다음 칸으로 이동
                                if (phoneValues[phoneIndex].length === 4) {
                                    phoneIndex++;
                                }
                            }
                        }
                    } else if (type === "point") {
                        if (inputTarget) {
                            // 현재 입력된 텍스트에서 콤마를 제거
                            let currentText = inputTarget.textContent.replace(/,/g, "");
                            let updatedText = currentText + number;
        
                            // 문자열을 숫자로 변환
                            let usedPoints = Number(updatedText);
        
                            // 사용 가능한 최대 포인트 계산
                            if (usedPoints > availablePoints) {
                                usedPoints = availablePoints; // 보유 포인트로 제한
                            }
                            if (usedPoints > totalAmt) {
                                usedPoints = totalAmt; // 총 주문 금액으로 제한
                            }
        
                            // 입력 필드와 남은 금액을 업데이트
                            inputTarget.textContent = usedPoints.toLocaleString(); // 3자리 콤마 추가
                            const remaining = Math.max(totalAmt - usedPoints, 0); // 남은 금액 계산
                            remainingAmount.textContent = remaining.toLocaleString();
                        }
                    }
                });
            });
        }
        
        // 초기화 함수 (삭제 버튼 등에서 호출 가능)
        function resetInput() {
            phoneValues = [[], []];
            phoneIndex = 0; // 현재 입력할 위치
            inputValue = "";  // 저장된 입력 값 초기화
        
            if (type === "number" || type === "password" || type === "coupon") {
                const inputDisplay = document.getElementById("inputDisplay");
                inputDisplay.textContent = ""; // 화면에서도 삭제
            }
        }
        
        let stateStack = []; // 상태 스택
        
        // 동적 콘텐츠 업데이트 함수
        function updateDynamicContent(contentType, data ,resolve) {
            const dynamicContent = document.getElementById("dynamicContent");
            const dynamicButton = document.getElementById('dynamicButton');
            const modal = document.getElementById("pointModal");
            const closeBtn       = document.getElementById("closeModalBtn");
        
            // 닫기 버튼 이벤트 연결
            if (closeBtn) {
                closeBtn.onclick = () => {
                    modal.classList.add("hidden");
                    getGlobalDim()?.classList.add("hidden");
                    resolve?.({ success: true, action: ACTIONS.EXIT });
                };
            }
        
            // 현재 상태를 스택에 저장
            if (stateStack.length === 0 || stateStack[stateStack.length - 1] !== contentType) {
                stateStack.push(contentType);
            }
        
            // 뒤로가기 함수
            function goBack() {
                if (stateStack.length > 1) {
                    stateStack.pop(); // 현재 상태를 제거
                    const previousState = stateStack[stateStack.length - 1]; // 이전 상태 가져오기
                    updateDynamicContent(previousState); // 이전 상태로 복원
                } else {
                    console.warn("더 이상 뒤로 갈 상태가 없습니다.");
                }
            }
        
            // 버튼 추가 함수
            function addButton(id, text, className) {
                const button = document.createElement('button');
                button.id = id;
                button.innerText = text;
                button.className = className;
        
                button.addEventListener('click', () => {
                    resetCountdown(); // 버튼 누를 때마다 타이머 리셋
                });
        
                dynamicButton.appendChild(button);
            }
        
            // 버튼 전체 삭제 함수
            function removeAllButtons() {
                while (dynamicButton.firstChild) {
                    dynamicButton.removeChild(dynamicButton.firstChild); // 첫 번째 자식 요소를 제거
                }
            }
            // 입력값 초기화
            resetInput();
            if (contentType === "pointInput") {
                if (isPhone) {
                    type = "phone";
                    dynamicContent.innerHTML = createPhoneInputTemplate("포인트 적립 혹은 사용");
                } else {
                    type = "number";
                    dynamicContent.innerHTML = createInputTemplate(`포인트 번호 입력 ${inputCount} 자리`, inputCount);
                }
        //        dynamicContent.innerHTML = createPhoneInputTemplate("포인트 적립 혹은 사용");
        
                totalAmt = data;
                removeAllButtons();
        
                // 버튼 설정
                addButton("joinPointBtn", "신규등록", "bg-yellow-400 py-3 text-3xl rounded-lg hover:bg-yellow-500 w-full");
                addButton("addPointBtn", "적립하기", "bg-gray-200 py-3 text-3xl rounded-lg  hover:bg-gray-300 w-full");
                addButton("usePointBtn", "사용하기", "bg-blue-500 text-white py-3 text-3xl rounded-lg hover:bg-blue-600 w-full h-48");
        
                // 포인트 적립버튼
                document.getElementById("addPointBtn").addEventListener("click", async () => {
                    let mileageInfo = {mileageNo: inputValue, tel: ""};
                    // 휴대폰일경우 inputValue 휴대폰번호로 변경
                    if (isPhone) {
                        inputValue = "010" + phoneValues.join(""); // 전화번호 배열 to String
                        const regex = new RegExp(`^\\d{11}$`);
        
                        // 입력값 검증
                        if (!regex.test(inputValue)) {
                            openAlertModal(`번호는 11 자리 숫자여야 합니다.`);
                            return;
                        }
                        mileageInfo = {mileageNo: "", tel: inputValue};
                    }
        
                    if (inputValue.length >= 4 && inputValue.length <= 12) {
        
                        const pointNumberCheck = await electronAPI.checkMileageExists(mileageInfo);
                        if (pointNumberCheck) {
                            if (pointNumberCheck.data.exists) {
                                modal.classList.add("hidden"); // 모달 닫기
                                getGlobalDim().classList.add("hidden"); // 모달딤 닫기
                                const data = pointNumberCheck.data;
                                resolve({success: true, action: ACTIONS.IMMEDIATE_PAYMENT, point: data.uniqueMileageNo, discountAmount: 0}); // 확인 시 resolve 호출
                            } else {
                                openAlertModal("등록되지 않은 번호입니다.");
                            }
                        } else {
                            openAlertModal("유저정보 조회에 실패하였습니다.");
                        }
                    } else {
                        openAlertModal(`마일리지 번호는 4~12 자리 입니다.`);
                    }
                });
        
                // 포인트 사용버튼
                document.getElementById("usePointBtn").addEventListener("click", async () => {
                    let mileageInfo = {mileageNo: inputValue, tel: ""};
                    // 휴대폰일경우 inputValue 휴대폰번호로 변경
                    if (isPhone) {
                        inputValue = "010" + phoneValues.join(""); // 전화번호 배열 to String
                        const regex = new RegExp(`^\\d{11}$`);
        
                        // 입력값 검증
                        if (!regex.test(inputValue)) {
                            openAlertModal(`번호는 11 자리 숫자여야 합니다.`);
                            return;
                        }
                        mileageInfo = {mileageNo: "", tel: inputValue};
                    }
        
                    if (inputValue.length >= 4 && inputValue.length <= 12) {
        
                        const pointNumberCheck = await electronAPI.checkMileageExists(mileageInfo);
        
                        if (pointNumberCheck) {
        
                            if (pointNumberCheck.data.exists) {
                                const item = pointNumberCheck.data.item;
                                const mileageInfo = {mileageNo: item.mileageNo, tel: item.tel, uniqueMileageNo:pointNumberCheck.data.uniqueMileageNo };
                                updateDynamicContent("passwordInput", mileageInfo ,resolve);
                            } else {
                                openAlertModal("등록되지 않은 번호입니다.");
                            }
        
                        } else {
                            openAlertModal("유저정보 조회에 실패하였습니다.");
                        }
        
                    } else {
                        openAlertModal(`마일리지 번호는 4~12 자리 입니다.`);
                    }
                });
        
                // 포인트가입
                document.getElementById("joinPointBtn").addEventListener("click", () => {
        
                    if (isPhone) {
                        updateDynamicContent("addPhone", data ,resolve);
                    } else {
                        updateDynamicContent("joinPoints", data ,resolve);
                    }
        
                });
        
                // 즉시결제 포인트 적립 X
                /*document.getElementById("immediatePaymentBtn").addEventListener("click", () => {
                    // 즉시결제 포인트적립 X
                    resolve({ success: true, action: ACTIONS.IMMEDIATE_PAYMENT, discountAmount: 0  }); // 결과 전달
        
                    modal.classList.add("hidden"); // 모달 닫기
                });*/
        
            } else if (contentType === "passwordInput") {
        
                playAudio('../../assets/audio/비밀번호 4자리를 입력해주세요.mp3');
        
                // 비밀번호 입력 화면
                dynamicContent.innerHTML = createInputTemplate("비밀번호 입력", passwordCount);
                type = "password";
                removeAllButtons();
        
                addButton("exit", "사용취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");
                addButton("usePointBtn", "사용하기", "bg-blue-500 text-white py-3 text-3xl rounded-lg hover:bg-blue-600 w-full h-48");
        
                document.getElementById("exit").addEventListener("click", () => {
                    modal.classList.add("hidden"); // 모달닫기
                    getGlobalDim().classList.add("hidden"); // 모달딤 닫기
                    // 통합결제 취소
                    resolve({success: true, action: ACTIONS.EXIT});
                });
        
                // 비밀번호 검증
                document.getElementById("usePointBtn").addEventListener("click", async () => {
        
                    // 비밀번호 검증후 사용하기화면으로 이동
                    if (inputValue.length === passwordCount) {
                        try {
                            const mileageInfo = {...data, password: inputValue};
                            // 포인트 password
                            const pointPasswordCheck = await electronAPI.verifyMileageAndReturnPoints(mileageInfo);
        
                            if (pointPasswordCheck) {
        
                                if (pointPasswordCheck.data.success) {
                                    const pointData = {...pointPasswordCheck.data, ...data, totalAmt: totalAmt};
                                    updateDynamicContent("usePoints", pointData ,resolve);
                                } else {
                                    openAlertModal("패스워드가 틀렸습니다.");
                                }
        
                            } else {
                                openAlertModal("패스워드 조회에 실패하였습니다.");
                            }
                        } catch (e) {
                            openAlertModal("에러가 발생했습니다. 관리자에게 문의하세요.", "error");
                        }
        
                    } else {
                        openAlertModal(`마일리지 패스워드 번호는 ${passwordCount} 자리 입니다.`);
                    }
                    
                });
        
            } else if (contentType === "usePoints") {
                // 입력폼 초기화
                resetInput();
                const pointData = data;
                type = "point";
        
                // 3자리 콤마 추가를 toLocaleString으로 처리
                const formattedPoints = pointData.points.toLocaleString(); // 보유 포인트 포맷팅
                availablePoints = pointData.points; // 보유포인트
                const pointNo = pointData.uniqueMileageNo; // 조회된 포인트 번호
                // 포인트 사용 화면
                dynamicContent.innerHTML = `
                    <div class="text-center">
                        <div class="text-left mx-auto w-full max-w-lg">
                            <p class="text-4xl mb-4">총 주문 금액: <span id="totalOrderAmount">${totalAmt}</span>원</p>
                            <div class="flex gap-2">
                            <p class="text-2xl mb-4">보유 포인트:</p>
                            <span id="availablePoints" class="text-right text-2xl mb-4 w-40 ml-1">${formattedPoints}</span><span class="text-2xl"> P</span>
                            </div>
                            
                            <div class="flex gap-2">
                                <p class="text-2xl">사용 포인트:</p>
                                <div id="usePoint" class="text-right text-2xl mb-4 border-b-2 border-gray-300 w-40 ml-1"></div><span class="text-2xl"> P</span>
                                <button id="useAllPointsBtn" class="border-gray-300 py-1 px-4 text-xl rounded-lg bg-gray-200 hover:bg-gray-300">전액 사용</button>
                            </div>
                            <p class="text-4xl mt-4">결제 금액: <span id="remainingAmount"></span>원</p>   
                        </div>
                    </div>
                `;
        
                remainingAmount = document.getElementById("remainingAmount");
                remainingAmount.innerText = totalAmt; // 초기화
                inputTarget = document.getElementById("usePoint");
                inputTarget.innerText = "0"; // 초기화
                removeAllButtons();
        
                addButton("exit", "결제취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");
        
                document.getElementById("exit").addEventListener("click", () => {
                    modal.classList.add("hidden"); // 모달닫기
                    getGlobalDim().classList.add("hidden"); // 모달딤 닫기
        
                    // 통합결제 취소
                    resolve({success: true, action: ACTIONS.EXIT});
                });
        
                // 전체 사용
                document.getElementById("useAllPointsBtn").addEventListener("click", () => {
                    if (type === "point" && inputTarget) {
                        const maxUsablePoints = Math.min(availablePoints, totalAmt);
                        inputTarget.innerText = maxUsablePoints.toLocaleString(); // 포인트 업데이트
                        const remaining = Math.max(totalAmt - maxUsablePoints, 0);
                        remainingAmount.innerText = remaining.toLocaleString(); // 남은 금액 업데이트
                    }
                });
        
                addButton("pointPaymentBtn", "포인트 사용", "bg-blue-500 text-white py-3 text-3xl rounded-lg hover:bg-blue-600 w-full h-48");
                document.getElementById("pointPaymentBtn").addEventListener("click", () => {
                    // 포인트 포멧 to number
                    const usePoint = cleanNumber(inputTarget.innerText);
        
                    if (usePoint > 0) {
                        // 포인트 결제,사용할포인트번호, 사용포인트
                        resolve({success: true, action: ACTIONS.USE_POINTS, point: pointNo, discountAmount: usePoint, pointData: pointData}); // 포인트 사용 금액 반환
                        modal.classList.add("hidden"); // 모달 닫기
        
                    } else {
                        playAudio('../../assets/audio/사용할 금액을 입력후 결제를 눌러주세요.mp3');
                    }
        
                });
            } else if (contentType === "joinPoints") {
        
                playAudio('../../assets/audio/등록하실 고객번호를입력해주세요.mp3');
        
                type = "number";
                // 마일리지 가입 화면
                dynamicContent.innerHTML = createInputTemplate(`마일리지 가입 번호 입력 ${inputCount} 자리`, inputCount);
                removeAllButtons();
        
                addButton("exit", "취소하기", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");
        
                document.getElementById("exit").addEventListener("click", () => {
                    modal.classList.add("hidden"); // 모달닫기
                    getGlobalDim().classList.add("hidden"); // 모달딤 닫기
                    // 통합결제 취소
                    resolve({success: true, action: ACTIONS.EXIT});
                });
        
                addButton("addPhone", "전화번호입력", "bg-gray-400 py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48");
        
                // 마일리지 번호 검증 후 비밀번호입력으로 이동
                document.getElementById("addPhone").addEventListener("click", async () => {
        
                    // 가입시에는 관리자가지정한 자리수로 가입
                    if (inputValue.length === inputCount) {
                        const regex = new RegExp(`^\\d{${inputCount}}$`);
        
                        // 입력값 검증
                        if (!regex.test(inputValue)) {
                            openAlertModal(`번호는 ${inputCount}자리 숫자여야 합니다.`);
                            return;
                        }
        
                        const mileageInfo = {mileageNo: inputValue, tel: ""};
                        const pointNumberCheck = await electronAPI.checkMileageExists(mileageInfo);
        
                        if (pointNumberCheck) {
        
                            if (!pointNumberCheck.data.exists) {
                                updateDynamicContent("addPhone", inputValue, resolve);
                            } else {
                                openAlertModal("이미 등록된 유저입니다.");
                            }
        
                        } else {
                            openAlertModal("유저정보 조회에 실패하였습니다.");
                        }
        
                    } else {
                        openAlertModal(`마일리지 번호는 ${inputCount} 자리 입니다.`);
                    }
        
                });
            } else if (contentType === "addPhone") {
        
                playAudio('../../assets/audio/연락처를 입력해주세요.mp3');
        
                // 입력폼 초기화
                resetInput();
                type = "phone";
                // 마일리지 가입 화면
                dynamicContent.innerHTML = createPhoneInputTemplate("마일리지 등록 휴대전화 번호 입력");
                removeAllButtons();
        
                addButton("exit", "등록취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");
        
                document.getElementById("exit").addEventListener("click", () => {
                    modal.classList.add("hidden"); // 모달닫기
                    getGlobalDim().classList.add("hidden"); // 모달딤 닫기
                    // 통합결제 취소
                    resolve({success: true, action: ACTIONS.EXIT});
                });
        
                addButton("addPassword", "비밀번호입력", "bg-gray-400 py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48");
        
                // 마일리지 번호 검증 후 비밀번호입력으로 이동
                document.getElementById("addPassword").addEventListener("click", async () => {
                    const phoneNumber = "010" + phoneValues.join(""); // 전화번호 배열 to String
                    const regex = new RegExp(`^\\d{11}$`);
        
                    // 입력값 검증
                    if (regex.test(phoneNumber)) {
                        const mileageInfo = {mileageNo: "", tel: phoneNumber};
                        const pointNumberCheck = await electronAPI.checkMileageExists(mileageInfo);
        
                        if (pointNumberCheck) {
        
                            if (!pointNumberCheck.data.exists) {
                                // 휴대폰번호 설정되어있을경우 mileageNo 휴대폰 번호로 설정
                                if (isPhone) {
                                    updateDynamicContent("addPassword", {mileageNo: phoneNumber, tel: phoneNumber}, resolve);
                                } else {
                                    updateDynamicContent("addPassword", {mileageNo: data, tel: phoneNumber}, resolve);
                                }
        
                            } else {
                                openAlertModal("이미 등록된 유저입니다.");
                            }
        
                        } else {
                            openAlertModal("유저정보 조회에 실패하였습니다.");
                        }
        
                    } else {
                        openAlertModal(`번호는 11자리 숫자여야 합니다.`);
                    }
        
                });
            } else if (contentType === "addPassword") {
        
                playAudio('../../assets/audio/비밀번호 4자리를 입력해주세요.mp3');
        
                type = "password";
                // 마일리지 가입 화면
                dynamicContent.innerHTML = createInputTemplate("비밀번호 등록", passwordCount);
        
                removeAllButtons();
                addButton("exit", "등록취소", "bg-gray-200 py-3 text-3xl rounded-lg hover:bg-gray-300 w-full");
        
                document.getElementById("exit").addEventListener("click", () => {
                    modal.classList.add("hidden"); // 모달닫기
                    getGlobalDim().classList.add("hidden"); // 모달딤 닫기
        
                    // 등록 취소
                    resolve({success: true, action: ACTIONS.EXIT});
                });
        
                addButton("addPoint", "마일리지등록", "bg-gray-400 py-3 text-3xl rounded-lg hover:bg-gray-500 w-full h-48");
        
                // 마일리지 번호 검증 후 비밀번호입력으로 이동
                document.getElementById("addPoint").addEventListener("click", async () => {
                    let mileageData = data;
                    // 비밀번호 검증 후 마일리지 가입
                    if (inputValue.length === passwordCount) {
                        try {
                            // 입력값 검증
                            const regex = new RegExp(`^\\d{${passwordCount}}$`);
                            if (!regex.test(inputValue)) {
                                openAlertModal(`비밀번호는 정확히 ${passwordCount}자리 숫자여야 합니다.`);
                                return;
                            }
        
                            const mileageInfo = { ...mileageData, password: inputValue };
        
                            // 마일리지 등록 API 호출
                            const addPoint = await electronAPI?.saveMileageToDynamoDB?.(mileageInfo);
        
                            if (!addPoint || !addPoint.success) {
                                const mangageError = addPoint?.message ?? "마일리지 등록에 실패하였습니다.";
                                openAlertModal(`${mangageError}`);
                                return;
                            }
        
                            const data = addPoint.data || {};
        
                            if (!data?.uniqueMileageNo) {
                                openAlertModal("마일리지 번호를 가져올 수 없습니다.");
                                return;
                            }
        
                            if (addPoint.success || data?.uniqueMileageNo) {
        
                                playAudio('../../assets/audio/가입이 완료되었습니다 확인버튼을눌러주세요.mp3');
                            }
        
                            // 컴펌 창 띄우기
                            openModal(
                                "마일리지 등록이 완료되었습니다.<br>즉시 결제하시겠습니까?",
                                () => {
                                    if (modal) {
                                        modal.classList.add("hidden"); // 모달 닫기
                                    } else {
                                        console.error("modal 요소가 존재하지 않습니다.");
                                    }
        
                                    if (typeof resolve === "function") {
                                        resolve({ success: true, action: ACTIONS.IMMEDIATE_PAYMENT, point: data.uniqueMileageNo });
                                    } else {
                                        console.error("resolve 함수가 정의되지 않았습니다.");
                                    }
                                },
                                () => {
                                    if (modal) {
                                        modal.classList.add("hidden"); // 모달 닫기
                                    } else {
                                        console.error("modal 요소가 존재하지 않습니다.");
                                    }
        
                                    if (typeof resolve === "function") {
                                        resolve({ success: true, action: ACTIONS.EXIT });
                                    } else {
                                        console.error("resolve 함수가 정의되지 않았습니다.");
                                    }
                                }
                            );
                        } catch (e) {
                            console.error("예외 발생:", e);
                            openAlertModal("에러가 발생했습니다. 관리자에게 문의하세요.", "error");
                        }
                    } else {
                        openAlertModal(`마일리지 패스워드는 ${passwordCount} 자리 입니다.`);
                    }
        
                });
            }
        }
        
        // 동적 콘텐츠 가입,적립만 가능
        function updateDynamicContent2(contentType, data = {}) {
            return new Promise((resolve) => {
                const dynamicContent = document.getElementById("dynamicContent");
                const dynamicButton = document.getElementById('dynamicButton');
                const modal = document.getElementById("pointModal");
               // const globalDim = document.getElementById('globalDim'); // 모달 딤
        
                let resolved = false;
                const aborter = new AbortController();
        
                modal.classList.remove("hidden");
                getGlobalDim()?.classList.remove("hidden");
                dynamicButton.innerHTML = "";
        
                function safeResolve(result) {
                    if (resolved) return;
                    resolved = true;
                    modal?.classList.add("hidden");
                    getGlobalDim()?.classList.add("hidden");
                    aborter.abort();                 // ✅ 이 턴에서 붙인 모든 리스너 정리
                    resolve(result);
                    setIsPaying(false);
                }
        
                // ✅ 닫기 버튼: 전역 위임 1개만
                document.addEventListener(
                    "click",
                    (e) => {
                        const closeBtn = e.target?.closest?.("#closeModalBtn");
        
                        if (!closeBtn) return;
                        e.preventDefault();
                        safeResolve({ success: true, action: ACTIONS.EXIT });
                    },
                    { signal: aborter.signal, capture: true }
                );
        
                // 버튼 이벤트 초기화
                function clearButtons() {
                    dynamicButton.innerHTML = "";
                }
        
                function addButton(id, text, className, handler) {
                    const btn = document.createElement("button");
                    btn.id = id;
                    btn.innerText = text;
                    btn.className = className;
                    btn.onclick = () => {
                        resetCountdown();
                        handler();
                    };
                    dynamicButton.appendChild(btn);
                }
        
                // ----- 단계별 화면 처리 -----
                if (contentType === "couponInput") {
                    // 기존 유저 적립 단계
                    resetInput();
                    type = "coupon";
                    dynamicContent.innerHTML = createPhoneInputTemplate("쿠폰 바코드 스캔 및 쿠폰 번호 입력");
                    dynamicContent.innerHTML = createInputTemplate("쿠폰사용");
                    clearButtons();
        
                    // 바코드 스캔 버튼
                    addButton("scanBarcodeBtn", "바코드스캔", "bg-red-400 py-3 text-white text-3xl rounded-lg hover:bg-red-500 w-full", async () => {
                        const barcodeScan = await getBarcodeScanModal();
                        inputValue = barcodeScan || ""; // 입력된 값에 추가
                        updateInputDisplay();
                    });
        
                    addButton("useBarCodeBtn", "사용하기", "bg-blue-500 py-3 text-white text-3xl rounded-lg hover:bg-blue-600 w-full", async () => {
                        const couponCode = inputValue.trim();
                        if (!couponCode) return openAlertModal("쿠폰 번호를 입력하세요.", "error");
        
                        // 안전망
                        let couponResult;
                        try {
                            couponResult = await getCouponApi(couponCode);
                        } catch (e) {
                            openAlertModal(e?.message || "쿠폰 조회 실패(예외)", "error");
                            return;
                        }
        
                        if (!couponResult.ok || !couponResult.item) {
                            openAlertModal(couponResult.message || "해당 쿠폰을 찾을 수 없습니다.", "error");
                            return;
                        }
        
                        const couponItem = couponResult.item;
                        const menuId = parseInt(couponItem.menuId, 10);
        
                        const matchedOrder = getOrderList().find(order => {
                            if (parseInt(order.menuId, 10) !== menuId) return false;
        
                            const used = order.couponUsed || 0;
                            if (used >= order.count) return false;
        
                            const alreadyUsed = (order.usedCoupons || [])
                                .some(c => c.couponId === couponItem.couponId);
        
                            if (alreadyUsed) {
                                openAlertModal("이미 사용한 쿠폰입니다.", "error");
                                return false;
                            }
                            return true;
                        });
        
                        if (!matchedOrder) {
                            openAlertModal("적용 가능한 주문이 없거나\n 이미 사용된 쿠폰입니다.", "error");
                            return;
                        }
        
                        matchedOrder.couponUsed = (matchedOrder.couponUsed || 0) + 1;
                        matchedOrder.usedCoupons = matchedOrder.usedCoupons || [];
                        matchedOrder.usedCoupons.push({
                            couponId: couponItem.couponId,
                            couponCode: couponItem.couponCode,
                        });
        
                        openAlertModal(`${couponItem.title} 쿠폰을 적용했습니다.`, "success");
                        safeResolve({ success: true, action: ACTIONS.COUPON_APPLIED });
                    });
                }
        
            });
        }
        
        
        //[TODO] 임시제거 포인트 모달 닫기
        /*document.getElementById("closeModalBtn").addEventListener("click", () => {
            closePointModal();
        });*/
        
        // 마일리지 초기화
        document.addEventListener("DOMContentLoaded", () => {
            const backspaceBtn = document.getElementById("backspaceBtn"); // 단건 지우기 버튼
            const clearAllBtn = document.getElementById("clearAllBtn"); // 전체 삭제 버튼
        
            setupNumberButtons(); // 번호 버튼 이벤트 초기화
        
            // 단건 지우기 (Backspace 버튼)
            backspaceBtn.addEventListener("click", () => {
                resetCountdown(); // 버튼 누를 때마다 타이머 리셋
        
                if (type === "point" && inputTarget.textContent) {
                    // 기존 콤마를 제거하고 숫자 처리
                    const currentText = inputTarget.textContent.replace(/,/g, ""); // 콤마 제거
                    const updatedText = currentText.slice(0, -1); // 마지막 문자 제거
        
                    // 결과를 다시 3자리 콤마 형식으로 표시
                    inputTarget.textContent = updatedText ? Number(updatedText).toLocaleString() : "0";
        
                    // 남은 금액 업데이트
                    const usedPoints = Number(updatedText) || 0;
                    const remaining = Math.max(totalAmt - usedPoints, 0);
                    remainingAmount.textContent = remaining.toLocaleString();
                } else if (type === "phone") {
        
                    if (phoneIndex >= 0) {
                        if (phoneIndex === 2) {
                            phoneIndex = phoneIndex - 1;
                        }
        
                        if (phoneValues[phoneIndex].length > 0) {
                            // 현재 칸에서 숫자 하나 삭제
                            phoneValues[phoneIndex] = phoneValues[phoneIndex].slice(0, -1);
                        } else if (phoneIndex > 0) {
                            // 이전 칸으로 이동하여 삭제
                            phoneIndex--;
                            phoneValues[phoneIndex] = phoneValues[phoneIndex].slice(0, -1);
                        }
        
                        // 화면 업데이트
                        const targetIndex = phoneIndex === 0 ? 101 : 201;
                        const digitToClear = targetIndex + phoneValues[phoneIndex].length;
                        document.getElementById(`inputDigit-${digitToClear}`).textContent = "_";
                    }
                } else if (type === "password") {
                    const inputDisplay = document.getElementById("inputDisplay");
        
                    if (inputValue.length > 0) {
                        inputValue = inputValue.slice(0, -1); // 내부 변수에서도 마지막 문자 삭제
                        inputDisplay.textContent = "*".repeat(inputValue.length); // 비밀번호 입력 시 * 로 표시; // 화면에서도 삭제
                    }
                } else if (type === "coupon") {
                    const inputDisplay = document.getElementById("inputDisplay");
        
                    if (inputValue.length > 0) {
                        inputValue = inputValue.slice(0, -1); // 내부 변수에서도 마지막 문자 삭제
                        inputDisplay.textContent = inputValue; // 화면에서도 삭제
                    }
                } else {
                    const inputDisplay = document.getElementById("inputDisplay");
        
                    if (inputValue.length > 0) {
                        inputValue = inputValue.slice(0, -1); // 내부 변수에서도 마지막 문자 삭제
                        inputDisplay.textContent = inputValue; // 화면에서도 삭제
                    }
                }
            });
        
            // 전체 삭제 (Clear All 버튼)
            clearAllBtn.addEventListener("click", () => {
                resetCountdown(); // 버튼 누를 때마다 타이머 리셋
        
                if (type === "point") {
                    inputTarget.textContent = "0"; // 입력 초기화
                    // 남은 금액 초기화
                    remainingAmount.textContent = totalAmt.toLocaleString();
                } else if (type === "phone") {
                    phoneValues = [[], []];
                    phoneIndex = 0; // 현재 입력할 위치
        
                    document.getElementById(`inputDigit-101`).textContent = "_";
                    document.getElementById(`inputDigit-102`).textContent = "_";
                    document.getElementById(`inputDigit-103`).textContent = "_";
                    document.getElementById(`inputDigit-104`).textContent = "_";
                    document.getElementById(`inputDigit-201`).textContent = "_";
                    document.getElementById(`inputDigit-202`).textContent = "_";
                    document.getElementById(`inputDigit-203`).textContent = "_";
                    document.getElementById(`inputDigit-204`).textContent = "_";
                } else {
                    resetInput();
                }
            });
        });
        
        
        // 카드 결제

        return {
            pointPayment,
            createInputTemplate,
            createPhoneInputTemplate,
            updateInputDisplay,
            setupNumberButtons,
            resetInput,
            updateDynamicContent,
            updateDynamicContent2,
        };
    }

    return {
        createInputModalController,
    };
});
