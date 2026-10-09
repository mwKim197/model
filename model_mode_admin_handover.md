# Model / Mode Admin 인수인계 자료

참고
2026-07-04 - 지금은 AWS 계정 설정이 안되어있습니다. 차주 계정을 받으면 설정을 진행 할 예정이고 지금은 현 문서 및 소스 분석을 진행하시면됩니다. 
             테스트 계정은 직접생성 해서 사용하셔도 됩니다.
2026-07-17 - 머신 빌드 위치 
             C:\modelRoot\model
             머신 빋드 명령어 
             npm run build
             머신 빌드파일 경로 .exe
|            C:\modelRoot\model\dist
             

mode-admin
로컬로그분석: http://localhost:5173/html/localLogAnalyzer.html

작성일: 2026-06-26  
최종 보완일: 2026-07-03  
대상 프로젝트:

- 키오스크 앱: `C:\modelRoot\model`
- 관리자 웹: `C:\modelRoot\mode-admin`
- 회사홈페이지 웹: `C:\modelRoot\modeHomePage`
- 운영 API: `https://api.narrowroad-model.com`
- AWS 리전: `ap-northeast-2`

## 1. 전체 구조

`model`은 Windows Electron 기반 키오스크 앱이다. 매장 키오스크에서 주문, 결제, 바코드/쿠폰/마일리지, 시리얼 장비 제어, 로컬 Express 서버, Cloudflare Tunnel, AWS DynamoDB/S3 연동을 담당한다.

`mode-admin`은 Vite + TypeScript 기반 관리자 웹이다. 매장/상품/매출/쿠폰/마일리지/공지/권한/기기관리/후불결제 설정 화면을 제공하며, 정적 빌드 결과물을 S3/CloudFront로 배포한다.

두 프로젝트는 DynamoDB 테이블과 Lambda/API를 공유한다. 결제 원본은 `model_payment`, 상품 통계는 `model_menu_statistics`, 후불결제는 `model_billing_*` 테이블을 사용한다.

## 2. 로컬 실행

### model

경로:

```powershell
cd C:\modelRoot\model
```

명령:

```powershell
npm.cmd install
npm.cmd start
npm.cmd run build
```

주의:

- `npm.cmd start`는 Tailwind CSS를 빌드한 뒤 Electron을 실행한다.
- 실제 테스트에는 Windows 환경, 결제 단말기, 시리얼 장비, 로컬 설정값이 필요하다.
- `npm test`는 실제 테스트가 아니며 실패하도록 되어 있다.
- 빌드 산출물은 `dist/`에 생성된다.

### mode-admin

경로:

```powershell
cd C:\modelRoot\mode-admin
```

명령:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run preview
```

주의:

- 멀티 페이지 Vite 앱이다. 각 화면은 `html/*.html`에 있고, `src/main.ts`가 현재 URL에 따라 페이지 모듈을 동적 import한다.
- `dist/`는 빌드 결과물이다. 직접 수정하지 않는다.

## 3. Git 상태

### model

현재 확인 기준:

- 브랜치: `master`
- 원격: `origin/master`
- 최근 커밋: `117f678 맥설정 적용`

작업 중 변경이 있다:

- `src/renderer/order/order.js`
- `src/renderer/order/order.html`
- `src/renderer/api/orderApi.js`
- `src/preload.js`
- `src/aws/db/utils/getPayment.js`
- `src/windows/mainWindow.js`
- `resources/loading/loading.html`
- `src/styles/output.css`
- `POSTPAID_PAYMENT_DESIGN.md`
- `work/`

주요 변경 내용은 후불결제, 공통 `orderId`, 결제 팝업 UI, 로딩 파일 경로 관련이다.

### mode-admin

현재 확인 기준:

- 브랜치: `fix/log-analyzer`
- 원격: 현재 `git status --branch` 출력 기준 upstream 표시 없음
- 최근 커밋: `f10832c 안드로이드 설명추가`

작업 중 변경이 있다:

- `html/billing.html`
- `src/ts/page/billing.ts`
- `src/css/billing.css`
- `html/localLogAnalyzer.html`
- `src/ts/page/localLogAnalyzer.ts`
- `html/normalSet.html`
- `src/ts/page/normalSet.ts`
- `src/main.ts`
- `src/ts/common/auth.ts`
- `src/ts/types/user.ts`
- `vite.config.ts`
- `dist/` 빌드 산출물 다수
- 기존 `dist/assets/*` 해시 파일 삭제와 새 해시 파일 생성 다수

주의: `dist/`는 `npm.cmd run build`로 생성된 결과물이다. 커밋 대상 여부를 배포 방식에 맞게 판단해야 한다. 현재 `fix/log-analyzer` 작업에는 `localLogAnalyzer` 산출물과 기존 asset 해시 변경이 섞여 있으므로, 커밋 전 소스 변경과 빌드 산출물을 분리해서 확인한다.

## 4. model 주요 파일

- `src/main.js`
  - Electron 앱 진입점.
  - `.env.local` 로드, 단일 인스턴스 보장, Express 서버 시작, 메인 윈도우 생성, Cloudflare/시리얼 폴링/IPC 등록.

- `src/server.js`
  - 로컬 Express 서버.
  - 기본 포트는 `3142`.
  - 메뉴, 주문, 시리얼, 기기 제어, 로그, 업데이트, 바코드 API를 제공한다.

- `src/windows/mainWindow.js`
  - Electron `BrowserWindow` 생성.
  - preload 연결 및 초기 화면 로드.

- `src/preload.js`
  - Renderer에서 `window.electronAPI`로 사용할 API를 노출한다.
  - 주문, 결제, 마일리지, 쿠폰, 후불결제, 장비 제어 관련 브릿지가 여기에 있다.

- `src/renderer/order/order.js`
  - 키오스크 주문 화면 핵심 로직.
  - 장바구니, 결제 팝업, 마일리지/쿠폰/후불결제, 제조 시작, 세션 상태를 관리한다.

- `src/renderer/api/orderApi.js`
  - 주문/결제/후불결제 API wrapper.

- `src/aws/db/utils/getPayment.js`
  - 주문을 `model_payment`에 저장한다.
  - `model_menu_statistics` 통계도 함께 갱신한다.

- `src/vcat`, `src/nvcat`
  - 결제 단말기 연동.
  - VCAT은 웹소켓 방식, NVCAT/NVCAT 계열은 실제 카드/바코드 결제 흐름에 사용된다.

- `src/serial`, `src/services`
  - 시리얼 장비 제어, 제조 진행, 상태 폴링, busy 상태 관리.

## 5. mode-admin 주요 파일

- `src/main.ts`
  - 전체 페이지 공통 부트스트랩.
  - 로그인/권한 체크, 공통 레이아웃 로드, 메뉴 렌더링, 페이지별 모듈 로딩.

- `src/ts/api/api.ts`
  - API 기본 설정.
  - 운영 API 베이스는 `https://api.narrowroad-model.com`.

- `src/ts/api/apiHelpers.ts`
  - 인증 헤더가 포함된 `apiGet`, `apiPost` 등 공통 호출 함수.

- `src/ts/common/auth.ts`
  - 페이지 접근 권한 관리.

- `src/ts/page/sales.ts`
  - 매출 화면.
  - 건별/상품별 탭을 처리한다.

- `src/ts/page/normalSet.ts`
  - 기본 설정 화면.
  - 현재 후불결제 사용 여부(`billingPay`)도 여기서 관리하도록 작업 중이다.

- `src/ts/page/billing.ts`
  - 후불결제 전체 관리 화면.
  - 결제 식별방식, 기본 한도, 초기화일 등을 관리한다.

- `vite.config.ts`
  - 멀티 페이지 HTML entry 설정.
  - 새 HTML 화면을 추가하면 여기에 input 등록이 필요하다.

## 6. AWS / DynamoDB

현재 확인된 주요 테이블:

- `model_user`
- `model_menu`
- `model_payment`
- `model_menu_statistics`
- `model_mileage`
- `model_mileage_history`
- `model_coupon`
- `model_inventory`
- `model_inventory_history`
- `model_admin_user`
- `model_admin_franchise`
- `model_admin_sessions`
- `model_billing_account`
- `model_billing_config`
- `model_billing_transaction`

후불결제 관련:

- `model_billing_account`
  - 후불결제 사용자/동호수/사원증 계정.

- `model_billing_config`
  - 매장 또는 프랜차이즈별 후불결제 설정.
  - 예: 한도, 초기화일, 식별방식.

- `model_billing_transaction`
  - 후불결제 승인/결제 이력.

Lambda:

- `model_billing_payment`
  - 후불결제 조회, 승인, 취소, 히스토리, 설정 조회/저장.

- `model_payment`
  - 관리자 매출 조회, 상품별 통계 조회, 엑셀 다운로드, 요약 조회.

AWS CLI:

```powershell
aws sts get-caller-identity --profile model
aws dynamodb list-tables --profile model --region ap-northeast-2
aws lambda get-function --function-name model_payment --profile model --region ap-northeast-2
```

주의:

- 운영 AWS를 직접 조회/수정할 때는 반드시 `--profile model --region ap-northeast-2`를 명시한다.
- 민감 키, 토큰, JWT secret은 문서나 커밋에 남기지 않는다.

## 7. 후불결제 작업 현황

목표:

- 키오스크 결제 팝업에 후불결제 버튼 추가.
- 후불결제 승인 시 즉시 실제 결제를 처리하지 않고 결제 세션에 저장.
- 전체 결제가 완료되는 시점에 후불결제를 실제 처리.
- 후불결제 금액만큼 남은 결제금액을 차감하여 카드/마일리지 등 추가 결제가 가능하게 함.
- 관리자에서 후불결제 사용 여부와 식별방식/한도/초기화일을 관리.

현재 반영된 내용:

- `model` 주문 화면에 후불결제 UI 추가.
- 동호수는 `1011203`처럼 입력하고 표시 시 `101동 1203호`로 변환.
- 마일리지 팝업과 유사하게 동호수 입력 -> 비밀번호 입력 -> 금액 입력 순서로 구성.
- 후불결제 금액은 결제 세션에 pending 상태로 저장한 뒤 전체 결제 완료 시 처리.
- 공통 `orderId`를 결제/주문/후불결제에 사용하도록 조정.
- `mode-admin`에 후불결제 전체 관리 화면 추가.
- `normalSet` 기본 설정에서 후불결제 사용 여부를 관리하도록 변경.
- 후불결제 사용이 켜져 있으면 관리자 메뉴에 후불결제 화면이 노출되도록 변경.

테스트 계정:

- 실제 운영 계정 `zero170`은 테스트에 사용하지 않는다.
- 테스트는 `model0000` 기준으로 진행한다.

테스트 데이터 예:

- `model_billing_account`
  - `franchiseId`: `model0000`
  - `accountKey`: `apartment#101-1203`
  - 비밀번호: 별도 전달 필요
  - 월 한도: `100000`

남은 작업:

- 사원증 방식에서 실제 RF/바코드 입력 흐름을 어떻게 받을지 확정 필요.
- 후불결제 사용자 일괄 등록/조회/상세 관리 화면 필요.
- 정산 다운로드, 상세 사용내역 다운로드 API/화면 필요.
- 운영 배포 전 실제 결제 단말기와 전체 결제 플로우 테스트 필요.

## 8. 상품별 현황 이슈

최근 문의:

`zero185` / 카페하루 2호점에서 2026년 4월 말 판매한 `상하이버터떡`이 매출 원본에는 있는데 상품별 현황에 보이지 않는다는 문의가 있었다.

확인 결과:

- `model_payment` 원본 기준 `2026-04-27 ~ 2026-04-30`
- `상하이버터떡` 판매내역 존재.
- 총 `3건`, 수량 `5개`, 상품금액 `10,000원`.

상세:

```text
2026-04-28 19:00  1개  2,000원  orderId 202604281900-zero185
2026-04-30 12:34  3개  6,000원  orderId 202604301234-zero185
2026-04-30 18:50  1개  2,000원  orderId 202604301850-zero185
```

원인:

- 상품별 현황 API는 원본 `model_payment`를 직접 기간별 집계하지 않는다.
- 현재 `model_menu_statistics` 테이블을 조회한다.
- 원본 주문 당시 `상하이버터떡`의 `menuId`는 `90`.
- 현재 `model_menu`와 `model_menu_statistics`의 `zero185/menuId=90`은 `뉴욕치즈케이크`로 바뀌어 있다.
- 따라서 과거 판매상품명이 현재 상품명으로 덮여 상품별 현황에서 `상하이버터떡`으로 조회되지 않는다.

수정 방향:

- `get-menu-statistics`를 선택 기간의 `model_payment.menuSummary` 기준으로 직접 집계하도록 변경한다.
- 통계 기준은 `menuId` 단독이 아니라 결제 당시 상품명 또는 `menuId + 당시 상품명` 기준으로 잡아야 한다.
- `mode-admin/src/ts/page/sales.ts`의 상품별 API 호출에도 `startDate/endDate`를 붙여야 한다.
- 상품별 엑셀 API도 동일 기준으로 맞춰야 한다.

## 9. 데이터 설계 주의점

### orderId

기존 방식은 분 단위 `YYYYMMDDHHmm-userId` 형태라 같은 분에 여러 주문이 들어오면 `orderId`가 겹칠 수 있다.

최근 작업에서는 결제 세션 시작 시 공통 `orderId`를 생성해 `model_payment`, 후불결제, 주문 흐름에서 동일하게 쓰도록 조정했다.

주의:

- 구버전 요청은 기존 방식으로 fallback한다.
- 과거 데이터에는 같은 `orderId`가 여러 건 있을 수 있다.

### 상품 통계

현재 `model_menu_statistics`는 `userId + menuId` 기준이다.

문제:

- 상품명이 변경되거나 `menuId`가 재사용되면 과거 상품별 현황이 현재 상품명으로 보일 수 있다.
- 기간별 상품별 매출 조회에는 부적합하다.

권장:

- 원본 주문 `model_payment.menuSummary`에서 기간별로 집계한다.
- 장기적으로 별도 통계를 유지한다면 `userId + period + menuId + menuNameSnapshot` 또는 주문 당시 상품명 스냅샷 기준을 포함한다.

## 10. 배포

### model

`electron-builder` 사용:

```powershell
npm.cmd run build
```

설정:

- `productName`: `model`
- Windows target: `nsis`
- 결과물: `dist/model-setup-${version}.exe`
- GitHub release 설정: `mwkim197/model`

빌드 전제:

- Node.js/npm 환경에서 `npm.cmd install`이 완료되어 있어야 한다.
- exe 생성 명령은 `package.json` 기준 `electron-builder`만 실행한다.
- 현재 소스와 `package.json` 빌드 설정 기준 PHP 런타임은 exe 생성 필수 조건이 아니다.
- PHP 파일, `php.exe`, `php.ini`도 현재 `model` 소스 빌드 대상에서 확인되지 않았다.
- 단, `serialport`, `bcrypt` 같은 native 모듈이 있어 깨끗한 PC에서 `npm.cmd install` 또는 Electron native rebuild가 걸리면 Python/MSVC 문제가 날 수 있다.
- `package-lock.json` 기준 `node-gyp`는 `9.4.1` 계열이다. Python은 3.11 계열을 우선 권장하고, Python 3.12는 `node-gyp` 10 이상이 필요할 수 있으므로 피하는 편이 안전하다.
- Windows에서는 Visual Studio Build Tools의 C++ 빌드 도구도 함께 필요할 수 있다.
- 현재 확인한 작업 환경은 `node v22.19.0`, `npm config get python`은 미설정, `py --list`는 설치된 Python 없음으로 나왔다. 이 상태에서도 기존 `node_modules`/prebuilt binary가 있으면 빌드는 통과할 수 있지만, 신규 설치 환경에서는 Python을 준비해야 한다.

주의:

- `asar: false`
- `resources/cloudflared.exe`, `resources/cert.pem`이 extraFiles로 포함된다.
- 패키징 후 `resources/app/...` 경로 문제를 반드시 확인한다.

### mode-admin

빌드:

```powershell
npm.cmd run build
```

GitHub Actions:

- `.github/workflows/deploy.yml`
- `master` push 시 `s3://zeroadmin.kr`로 배포
- CloudFront `E2F4R34LX88V05` invalidation

주의:

- 현재 작업 브랜치는 `fix/log-analyzer` 기준으로 확인했다.
- 일반 작업은 feature branch에서 진행하고, 배포 전 master 병합 정책을 확인한다.

## 11. 자주 보는 점검 명령

### DynamoDB 테이블 목록

```powershell
aws dynamodb list-tables --profile model --region ap-northeast-2
```

### Lambda 정보

```powershell
aws lambda get-function --function-name model_payment --profile model --region ap-northeast-2
aws lambda get-function --function-name model_billing_payment --profile model --region ap-northeast-2
```

### model 문법 점검

```powershell
node --check src\renderer\order\order.js
node --check src\renderer\api\orderApi.js
node --check src\preload.js
```

### mode-admin 빌드 점검

```powershell
npm.cmd run build
```

예상 경고:

- `html/log.html`의 jQuery non-module 경고.
- `deviceManage.ts`가 정적/동적 import 양쪽에 걸려 chunk split 경고.

## 12. 인수자 우선 확인 순서

1. 두 프로젝트에서 `npm.cmd install` 후 빌드가 되는지 확인.
2. `model`의 키오스크 주문/결제 화면이 실행되는지 확인.
3. `mode-admin`의 로그인, 기본 설정, 매출 화면, 후불결제 화면 확인.
4. AWS CLI `model` 프로필 접근 가능 여부 확인.
5. `model_payment` Lambda와 `model_billing_payment` Lambda 소스 백업 위치 확인.
6. 후불결제 테스트는 반드시 `model0000`으로 진행.
7. `zero185` 상품별 현황 문제는 `model_payment.menuSummary` 기준 재집계 방식으로 수정.
8. `dist/` 변경분은 빌드 산출물인지, 실제 커밋 대상인지 구분.

## 13. 남은 주요 작업

- 상품별 현황 API를 원본 결제 기준으로 수정.
- 상품별 현황 프론트에서 `startDate/endDate` 전달.
- 상품별 엑셀 다운로드도 동일 기준으로 수정.
- 후불결제 사용자 일괄 등록/조회/상세 관리 화면 구현.
- 후불결제 정산/상세 사용내역 다운로드 구현.
- 사원증 방식 입력/스캔 UX 확정.
- 실제 결제 단말기에서 후불결제 + 카드 복합결제 전체 테스트.
- `model` 빌드 후 `loading.html` 경로 이슈 재확인.

## 14. 운영 응대 메모

### 상하이버터떡 문의 답변 예시

```text
확인 결과 4/27~4/30 결제 원본 데이터에는 상하이버터떡 판매내역이 3건, 총 5개 존재합니다.
다만 상품별 현황은 결제 원본이 아니라 별도 상품 통계 테이블 기준으로 조회되고 있는데,
해당 상품이 사용하던 menuId가 이후 다른 상품명으로 변경되어 상품별 현황에서 상하이버터떡 명칭으로 조회되지 않는 것으로 확인됩니다.
원본 매출 데이터는 정상 저장되어 있으며, 상품별 현황 집계 기준을 결제 당시 상품명 기준으로 보완할 예정입니다.
```

### 후불결제 작업 설명 예시

```text
후불결제는 결제 버튼을 누르는 즉시 실제 처리하지 않고 결제 세션에 임시 반영합니다.
전체 결제가 완료되는 시점에 후불결제 API를 호출해 실제 거래를 확정하며,
실패 시 기존 결제 흐름과 충돌하지 않도록 보상 처리 로직을 둡니다.
```

## 15. 초보자용 상세 가이드

이 섹션은 프로젝트 경험이 짧은 사람이 실제로 업무를 이어받을 때 보는 보조 설명이다. 위의 문서는 전체 지도이고, 이 섹션은 “어디부터 눌러보고, 어떤 파일을 열고, 어떤 순서로 의심해야 하는지”를 설명한다.

### 15.1 큰 그림 다시 보기

이 시스템은 크게 세 덩어리다.

```text
1. model
   매장 키오스크 PC에서 실행되는 Electron 프로그램

2. mode-admin
   브라우저에서 접속하는 관리자 웹사이트

3. AWS
   DynamoDB, Lambda, S3 같은 운영 데이터와 API
```

고객 주문이 들어오면 보통 아래 흐름으로 움직인다.

```text
고객이 키오스크에서 상품 선택
        ↓
model/src/renderer/order/order.js에서 장바구니와 결제 흐름 처리
        ↓
카드/마일리지/쿠폰/후불결제 등 결제 처리
        ↓
model/src/aws/db/utils/getPayment.js에서 model_payment에 주문 저장
        ↓
mode-admin의 매출 화면에서 model_payment 또는 통계 API로 조회
```

처음 문제를 분석할 때는 “화면에서 안 보인다”는 말만 믿고 바로 화면 코드를 고치면 안 된다. 먼저 데이터가 실제로 저장됐는지 확인해야 한다.

```text
데이터가 없다  → 키오스크 저장/결제 흐름 문제 가능성
데이터가 있다  → 관리자 조회/API/통계 문제 가능성
```

### 15.2 model 프로젝트를 처음 볼 때

가장 먼저 볼 파일은 아래 순서가 좋다.

```text
1. package.json
   실행 명령과 Electron 진입점을 확인

2. src/main.js
   Electron 앱이 어떻게 시작되는지 확인

3. src/server.js
   로컬 Express API가 어떤 route를 여는지 확인

4. src/preload.js
   화면에서 window.electronAPI로 무엇을 호출할 수 있는지 확인

5. src/renderer/order/order.html
   실제 주문 화면 버튼과 HTML 구조 확인

6. src/renderer/order/order.js
   주문, 결제, 팝업, 제조 시작의 핵심 로직 확인

7. src/renderer/api/orderApi.js
   주문 화면에서 호출하는 API wrapper 확인

8. src/aws/db/utils/getPayment.js
   결제 완료 후 주문을 DB에 저장하는 부분 확인
```

검색할 때는 `rg`를 사용한다.

```powershell
rg -n "paymentSession|startPayment|ordStart|postpaid|mileage|coupon" src\renderer\order\order.js
rg -n "saveOrdersToDynamoDB|model_payment|model_menu_statistics" src
```

`order.js`는 크기 때문에 한 번에 다 이해하려고 하면 힘들다. 기능별로 키워드를 잡고 흐름을 따라가야 한다.

결제 흐름을 볼 때는 아래 질문을 순서대로 던진다.

```text
1. 사용자가 누르는 버튼은 어디에 있는가?
2. 버튼 클릭 이벤트는 어디에서 바인딩되는가?
3. 클릭 후 paymentSession이 어떻게 바뀌는가?
4. 실제 결제 API는 언제 호출되는가?
5. 결제 성공 후 주문 저장은 어디서 호출되는가?
6. 실패하면 취소 또는 복구 처리가 있는가?
```

### 15.3 mode-admin 프로젝트를 처음 볼 때

`mode-admin`은 React/Vue 라우터 앱이 아니다. HTML 파일이 여러 개 있고, `src/main.ts`가 현재 주소를 보고 필요한 TypeScript 파일을 불러온다.

예:

```text
브라우저 주소: /html/sales.html
        ↓
src/main.ts
        ↓
src/ts/page/sales.ts 동적 import
        ↓
sales.ts가 매출 화면 이벤트 처리
```

새 화면을 추가하거나 기존 화면을 수정할 때는 다음 세트를 함께 봐야 한다.

```text
html/화면.html
src/ts/page/화면.ts
src/css/화면.css
src/main.ts
src/ts/common/auth.ts
vite.config.ts
```

하나라도 빠지면 이런 문제가 생긴다.

```text
vite.config.ts 누락       → 빌드 결과에 HTML이 안 들어감
main.ts import 누락       → 화면은 열리지만 JS가 동작 안 함
auth.ts 누락              → 권한 체크에서 막힘
메뉴 로직 누락            → 사이드 메뉴에 안 보임
CSS import 누락           → 화면 스타일 깨짐
```

관리자 API 호출은 보통 `src/ts/api/apiHelpers.ts`의 `apiGet`, `apiPost`를 사용한다. 직접 `fetch`를 쓰면 인증 헤더가 빠질 수 있으므로 기존 helper를 우선 사용한다.

### 15.4 DynamoDB를 볼 때 기본 원칙

운영 문의를 받으면 “어느 테이블을 먼저 볼지”가 중요하다.

```text
결제/매출 문의
  → model_payment

상품명/가격/현재 메뉴 문의
  → model_menu

상품별 현황 문의
  → model_payment 먼저 보고, 그 다음 model_menu_statistics 비교

마일리지 문의
  → model_mileage, model_mileage_history

후불결제 문의
  → model_billing_account, model_billing_transaction, model_billing_config

관리자 로그인/권한 문의
  → model_admin_user, model_admin_sessions
```

`model_payment`는 원본 데이터다. 매출 문제에서 가장 신뢰도가 높다.

`model_menu_statistics`는 누적 통계다. 빠르게 상품별 현황을 보여주기 위해 만든 테이블에 가깝고, 상품명이 바뀌거나 `menuId`가 재사용되면 과거 데이터가 현재 상품명으로 보일 수 있다.

복잡한 DynamoDB 조회는 PowerShell에서 JSON 따옴표가 깨지기 쉽다. 이럴 때는 `work/query.json` 파일을 만들고 아래처럼 실행한다.

```powershell
aws dynamodb query --cli-input-json file://work/query.json --profile model --region ap-northeast-2
```

운영 AWS를 만질 때는 항상 이 옵션을 붙인다.

```text
--profile model --region ap-northeast-2
```

### 15.5 매출 문제 분석 루틴

점주가 “매출이 안 맞는다”, “상품별 현황에 안 나온다”고 하면 아래 순서로 본다.

```text
1. 매장 계정 확인
   예: zero185

2. 기간 확인
   예: 2026-04-27 ~ 2026-04-30

3. 상품명 확인
   예: 상하이버터떡

4. model_payment 원본 조회
   menuSummary 안에 상품이 있는지 확인

5. 원본에 있으면 주문 저장은 정상

6. 관리자 화면/API 결과와 비교

7. model_menu_statistics 확인

8. model_menu 현재 상품명 확인

9. menuId 재사용/상품명 변경/기간 파라미터 누락 여부 판단
```

이번 `zero185` 상하이버터떡 케이스는 다음과 같이 판정했다.

```text
model_payment 원본
  → 4/27~4/30에 상하이버터떡 3건, 5개, 10,000원 존재

model_menu_statistics
  → 같은 menuId 90이 뉴욕치즈케이크로 표시됨

원인
  → 과거 상하이버터떡이 쓰던 menuId가 현재 뉴욕치즈케이크로 변경됨
  → 상품별 현황이 원본이 아니라 통계 테이블을 봐서 과거 상품명이 사라져 보임
```

수정할 때는 `model_payment.menuSummary` 기준으로 기간별 직접 집계하는 방식이 맞다.

### 15.6 후불결제 흐름 상세

후불결제는 버튼을 누르는 순간 바로 실제 결제를 처리하면 안 된다. 카드 결제나 마일리지 결제처럼 다른 결제수단과 함께 쓰일 수 있기 때문이다.

올바른 흐름:

```text
1. 고객이 후불결제 선택
2. 동호수 또는 사원증 번호 입력
3. 비밀번호 입력
4. 사용 가능 금액 조회
5. 사용할 금액 입력
6. paymentSession에 pending 상태로 저장
7. 화면의 남은 결제금액 차감
8. 남은 금액을 카드/마일리지 등으로 결제
9. 전체 결제가 완료되면 후불결제 API 호출
10. 주문 저장
11. 실패하면 후불결제 취소/보상 처리
```

중요한 이유:

```text
후불결제를 먼저 실제 처리해버리고 카드 결제가 실패하면,
고객은 전체 결제를 완료하지 않았는데 후불결제만 차감되는 문제가 생긴다.
```

확인 파일:

```text
model/src/renderer/order/order.html
model/src/renderer/order/order.js
model/src/renderer/api/orderApi.js
model/src/preload.js
mode-admin/src/ts/page/normalSet.ts
mode-admin/src/ts/page/billing.ts
```

테스트할 때는 `zero170` 같은 실제 계정을 쓰지 않는다. 후불결제 테스트는 `model0000`을 사용한다.

### 15.7 후불결제 관리자 화면 구분

후불결제 관련 관리자 화면은 역할을 나눠서 이해해야 한다.

```text
normalSet
  → 후불결제를 사용할지 ON/OFF

billing
  → 후불결제를 사용할 때의 설정값 관리
     예: 아파트 방식/사원증 방식, 기본 월 한도, 초기화일
```

즉 `billing` 화면에 “사용 여부”를 다시 넣지 않는다. 사용 여부는 기존 관리자 기본설정 쪽에서 관리한다.

메뉴 노출도 이 원칙을 따른다.

```text
model_user.billingPay === true
        ↓
관리자 사이드 메뉴에 후불결제 메뉴 표시
```

### 15.8 새 기능을 만들 때 체크리스트

관리자 웹에 새 화면을 추가하는 경우:

```text
1. html 파일 만들기
2. src/ts/page 파일 만들기
3. CSS가 필요하면 src/css 파일 만들기
4. vite.config.ts input 추가
5. src/main.ts에 path별 import 추가
6. src/ts/common/auth.ts 접근 권한 추가
7. 사이드 메뉴에 노출할지 결정
8. npm.cmd run build
9. 브라우저에서 화면 열어보기
```

키오스크에 새 버튼을 추가하는 경우:

```text
1. order.html에 버튼 추가
2. order.js에서 DOM 선택자 확인
3. 클릭 이벤트 바인딩
4. 필요한 API가 있으면 orderApi.js에 추가
5. renderer에서 쓰려면 preload.js에 노출
6. 세션 상태(paymentSession)와 충돌 없는지 확인
7. node --check 실행
8. 실제 UI에서 버튼 표시/동작 확인
```

Lambda/API를 수정하는 경우:

```text
1. 현재 Lambda 소스 또는 ZIP 백업
2. 로컬에서 수정
3. 가능하면 샘플 이벤트로 테스트
4. zip 생성
5. aws lambda update-function-code로 배포
6. aws lambda wait function-updated
7. 실제 API 호출 테스트
8. 실패 시 CloudWatch 로그 확인
```

### 15.9 위험도별 작업 분류

쉬운 작업:

```text
문구 수정
CSS 간격 조정
관리자 메뉴 노출 조건 수정
API 파라미터 누락 추가
테이블 컬럼 표시 수정
```

보통 작업:

```text
상품별 현황 집계 방식 변경
엑셀 다운로드 컬럼 추가
후불결제 관리자 사용자 목록 추가
기존 API 응답 구조 확장
```

어려운 작업:

```text
실제 결제 흐름 수정
카드/마일리지/후불 복합결제 수정
시리얼 제조 흐름 수정
주문 저장/취소 보상 처리
Lambda 권한 또는 DynamoDB 키 구조 변경
```

어려운 작업은 반드시 테스트 계정과 실제 장비 확인이 필요하다.

### 15.10 자주 나는 실수

1. `model_payment`를 안 보고 관리자 화면만 보고 판단한다.
2. `model_menu_statistics`를 원본 데이터처럼 믿는다.
3. `menuSummary.price`를 단가로 착각한다. 실제로는 라인 합계인 경우가 많다.
4. PowerShell에서 AWS CLI JSON 따옴표가 깨진다.
5. `mode-admin` 새 화면 추가 시 `vite.config.ts` 등록을 빼먹는다.
6. `src/main.ts`에 동적 import를 추가하지 않는다.
7. `auth.ts` 권한 추가를 빼먹는다.
8. `dist/`를 직접 수정한다.
9. 실제 운영 계정으로 테스트한다.
10. 결제 버튼 클릭 시점과 실제 결제 확정 시점을 구분하지 않는다.

### 15.11 인수자가 처음 맡으면 좋은 작은 작업

처음부터 결제나 시리얼을 만지면 위험하다. 아래 순서로 익숙해지는 것이 좋다.

1. `mode-admin`에서 문구나 CSS 수정.
2. 관리자 화면에 API 파라미터 하나 추가.
3. 매출 화면에서 표시 컬럼 하나 추가.
4. `model_payment` 조회 스크립트 작성.
5. 상품별 현황 집계 로직을 원본 기준으로 바꾸는 작업.
6. 후불결제 관리자 사용자 목록 화면.
7. 키오스크 결제 흐름 수정.

### 15.12 용어 정리

- Electron: 웹 기술로 Windows 앱을 만드는 런타임.
- Main Process: Electron 앱 생성, 윈도우 관리, OS 기능 담당.
- Renderer: 실제 화면을 그리는 HTML/JS 영역.
- Preload: Renderer에서 안전하게 Node/Electron 기능을 쓰게 해주는 연결부.
- DynamoDB: AWS NoSQL 데이터베이스.
- Lambda: AWS 서버리스 함수.
- `model_payment`: 결제/주문 원본 테이블.
- `menuSummary`: 주문 당시 메뉴명, 메뉴 ID, 수량, 금액 배열.
- `model_menu_statistics`: 상품별 누적 통계 테이블.
- `orderId`: 주문과 결제 흐름을 연결하는 ID.
- VCAT/NVCAT: 결제 단말기 연동 모듈.
- 후불결제: 아파트 동호수 또는 사원증 기준으로 나중에 정산하는 결제 방식.
## 16. 2026-07-03 보완 메모

이 섹션은 2026-06-26 작성본 이후 확인된 현재 작업 상태와 인수자가 바로 봐야 할 보완 내용이다.

### 16.1 현재 브랜치/변경 상태

`model`:

```text
브랜치: master
원격 추적: origin/master
최근 커밋: 117f678 맥설정 적용
작업 중 변경: 후불결제, 공통 orderId, 주문/결제 UI, loading.html 경로 관련 변경 유지
```

주요 변경 파일은 기존 문서의 목록과 거의 같다. 특히 아래 파일은 후불결제 결제 흐름과 직접 연결된다.

```text
src/renderer/order/order.html
src/renderer/order/order.js
src/renderer/api/orderApi.js
src/preload.js
src/aws/db/utils/getPayment.js
src/windows/mainWindow.js
resources/loading/loading.html
```

`mode-admin`:

```text
브랜치: fix/log-analyzer
최근 커밋: f10832c 안드로이드 설명추가
작업 중 변경: 후불결제 설정 화면 + 로컬 로그 분석기 화면 + dist 빌드 산출물
```

현재 `mode-admin`의 중요한 미커밋 소스 변경은 아래와 같다.

```text
html/billing.html
src/ts/page/billing.ts
src/css/billing.css
html/localLogAnalyzer.html
src/ts/page/localLogAnalyzer.ts
html/normalSet.html
src/ts/page/normalSet.ts
src/main.ts
src/ts/common/auth.ts
src/ts/types/user.ts
vite.config.ts
```

`dist/`에는 이전 해시 asset 삭제와 새 해시 asset 생성이 같이 잡혀 있다. 이는 빌드 결과물이므로 실제 커밋/배포 대상인지 먼저 판단한다. 소스 리뷰와 빌드 산출물 리뷰를 섞으면 변경 의도가 흐려진다.

### 16.2 로컬 로그 분석기

`mode-admin`에 `localLogAnalyzer` 화면이 추가되어 있다.

```text
html/localLogAnalyzer.html
src/ts/page/localLogAnalyzer.ts
vite.config.ts input: localLogAnalyzer
빌드 산출물: dist/html/localLogAnalyzer.html, dist/assets/localLogAnalyzer-*.js
```

역할:

- TXT/LOG 파일을 브라우저에서만 읽고 분석한다.
- 파일은 서버로 업로드하지 않는다.
- 로그 레벨, 키워드, HTTP 상태, 예외명, URL, 소요시간, ID/키, 반복 메시지를 추출한다.
- model 키오스크 운영 로그에 맞춘 제조/장비 패턴도 잡는다.

현재 감지하는 model 특화 패턴 예:

```text
컵센서 대기/타임아웃
컵 투출 흐름
얼음/물 출빙 흐름
커피 정지 감지 실패
커피 명령 흐름
커피 추출 완료
11회 재시도 도달
제조 재시도
비커피 재료 투출 문제
어드민/원격 조치
주문 정상 완료
주문/제조 실패
세척 흐름
머신 상태 스냅샷
```

운영 장애 분석 시 사용 순서:

1. 키오스크 PC에서 문제 시간대의 TXT/LOG 파일을 확보한다.
2. `/html/localLogAnalyzer.html`을 연다.
3. 로그 파일을 드래그하거나 선택한다.
4. 먼저 `문제 라인 중심` 필터로 ERROR/WARN/HTTP 4xx/5xx/예외를 본다.
5. 제조 이슈라면 `제조/장비 패턴` 필터로 컵센서, 커피 정지 감지 실패, 11회 재시도, 세척 흐름을 본다.
6. 주문 단위 분석은 `주문별 제조 흐름` 영역에서 시작 라인과 종료 라인을 따라간다.

주의:

- 이 화면은 로그인/공통 레이아웃을 타지 않는 단독 분석 도구에 가깝다.
- `html/localLogAnalyzer.html`이 직접 `src/ts/page/localLogAnalyzer.ts`를 module script로 부른다.
- `src/main.ts`의 일반 페이지 동적 import 체인에 아직 연결되어 있지 않다.
- 운영 관리자 메뉴에 노출할 도구인지, 내부 개발/운영자 전용 URL로 둘 것인지 결정이 필요하다.
- 민감 로그 파일을 다룰 수 있으므로 외부 사용자에게 무심코 노출하면 안 된다.

### 16.3 후불결제 설정 화면 현재 구현 범위

`mode-admin/html/billing.html`과 `src/ts/page/billing.ts` 기준 현재 구현 범위는 “전체 설정” 중심이다.

현재 가능한 것:

```text
franchiseId/current user 기준 후불결제 config 조회
관리 대상명 저장
결제 식별방식 선택: apartment 또는 employee
기본 월 한도 저장
사용금액 초기화일 저장: 1~31일
요약 카드 표시
최종 수정 시각 표시
```

API:

```text
GET  /model_billing_payment?func=getConfig&franchiseId=...
POST /model_billing_payment?func=saveConfig
```

아직 별도 화면/기능으로 남은 것:

```text
후불결제 사용자 목록
사용자 단건 등록/수정/삭제
CSV 또는 엑셀 일괄 등록
사용 이력 조회
정산 다운로드
상세 사용내역 다운로드
사원증 방식 실제 스캔/입력 UX
```

설계 원칙은 기존 문서와 동일하다.

```text
normalSet: 후불결제 사용 여부 ON/OFF
billing: 후불결제 사용 시 전체 설정값 관리
```

`billing` 화면에 사용 여부 토글을 중복해서 넣지 않는다.

### 16.4 인수자가 바로 확인할 빌드/동작 체크

`mode-admin`:

```powershell
cd C:\Users\perop\WebstormProjects\mode-admin
npm.cmd run build
npm.cmd run dev
```

확인 URL:

```text
/html/normalSet.html
/html/billing.html
/html/localLogAnalyzer.html
```

확인 포인트:

- `billing.html`이 열리고 설정 조회 API를 호출하는지.
- `normalSet`에서 `billingPay` 저장 후 메뉴 노출 조건이 맞는지.
- `localLogAnalyzer.html`에서 TXT 로그 파일 선택 후 요약/문제 라인이 렌더링되는지.
- 빌드 후 `dist/html/billing.html`, `dist/html/localLogAnalyzer.html`이 생성되는지.

`model`:

```powershell
cd C:\Users\perop\WebstormProjects\model
node --check src\renderer\order\order.js
node --check src\renderer\api\orderApi.js
node --check src\preload.js
npm.cmd run build
```

확인 포인트:

- 결제 팝업에 후불결제 버튼이 노출되는지.
- 후불결제 금액이 즉시 확정되지 않고 `paymentSession`에 pending으로 잡히는지.
- 카드/마일리지 등 남은 결제가 끝난 뒤 후불결제 확정 API가 호출되는지.
- 결제 실패 시 후불결제 보상/취소 흐름이 있는지.
- 빌드 후 `resources/loading/loading.html` 경로가 실제 패키징에서 깨지지 않는지.

### 16.5 커밋 전 정리 기준

커밋 전에는 최소한 아래처럼 변경을 나눠서 보는 것이 좋다.

```text
1. model 후불결제/주문 흐름 변경
2. mode-admin 후불결제 설정 화면 변경
3. mode-admin 로컬 로그 분석기 추가
4. dist 빌드 산출물
5. work/ 임시 조회 파일 또는 운영 점검 산출물
```

`work/`와 AWS 조회 결과 파일은 민감 정보가 섞일 수 있다. 커밋 전에 반드시 내용을 열어보고, 운영 데이터나 토큰이 있으면 제외한다.

### 16.6 운영 머신 API 전환 병합 이력 (2026-10-09)

#### 16.6.1 저장소와 환경 기준

- 개인 저장소 `origin` (`mwKim197/model`)의 `master`는 운영 머신 소스다.
- 회사 저장소 `company` (`narrowwayco/model`)의 `master`는 개발 머신 소스다.
- API 전환 작업 브랜치는 `feature/api-environment-routing`이다.

#### 16.6.2 운영 마스터에 포함되는 기능

1. 메뉴 전체 조회를 DynamoDB 직접 접근에서 Lambda API 호출로 전환.
2. 메뉴·로고·공지 이미지를 S3 직접 접근 대신 이미지 manifest API와 URL 다운로드 방식으로 전환.
3. 변경된 이미지만 로컬 캐시에 동기화하고, 로고 다운로드 실패 시 기본 로고를 사용.
4. 사용자 정보 조회와 머신 로그인을 Lambda API로 전환하고 로그인 완료 후 앱 자동 재시작.
5. 공지 목록·상세 조회를 Lambda API로 전환하고 머신의 공지 등록·수정·삭제 잔재 제거.
6. 마일리지 회원 조회·인증·등록·적립·사용·복구를 Lambda API로 전환.
7. 마일리지 거래에 `operationId`를 적용해 중복 적립·사용을 방지.
8. 주문 및 메뉴별 매출 저장을 Lambda API로 전환.
9. 매출 저장 실패 시 `pending-order-sales.json`에 보관하고 60초 간격으로 재전송.
10. 메뉴 무료·정액·정률 쿠폰을 지원하고, 쿠폰 적용 후 잔액을 마일리지·카드·QR/바코드로 결제.
11. 결제 세션당 쿠폰 1개 제한과 쿠폰 유형·명칭·할인 금액 매출 기록 적용.
12. Cloudflare 직접 API 호출을 제거하고 서버에서 터널 토큰을 받아 실행하는 방식으로 전환.
13. 머신의 Route53, DynamoDB, S3 직접 호출과 AWS SDK·AWS CLI 의존성 제거.
14. 개발·운영 API URL과 빌드를 `MODEL_ENV` 기준으로 분리.
15. 머신에 남아 있던 구형 메뉴 등록·수정·삭제·복사, 카운터, 마일리지 엑셀 라우트 제거.
16. 시리얼 장비 관리자 API와 우측 상단 로고 10회 클릭 최소화 기능 포함.

#### 16.6.3 운영 적용 주의사항

- 운영 환경의 보호 API는 `machineToken`을 요구한다. 기존 `config.json`에 토큰이 없는 머신은 최초 실행 시 로그인이 다시 필요할 수 있다.
- 운영 배포 파일은 반드시 `build:prod`로 생성하고 `.env.production.local` 및 운영 API 주소가 적용됐는지 확인한다.
- 운영 Lambda에 메뉴, 이미지, 사용자, 공지, 마일리지, 주문·매출, 터널 토큰 API가 먼저 호환 배포되어 있어야 한다.
- Cloudflare 터널 토큰 발급 API와 원격 명령용 SQS 설정을 확인한다.
- 직접 AWS 접근 폴백이 제거되므로 API 장애 시 메뉴·사용자·마일리지 조회도 영향을 받는다. 주문·매출 저장만 로컬 재전송 큐로 보완된다.
- `work/` 디렉터리는 운영 조회 결과와 임시 산출물이 있으므로 병합 및 커밋 대상에서 제외한다.

### 16.7 운영 장애 로그를 볼 때 추가 루틴

로그 분석기는 원인 후보를 줄이는 도구이지 최종 판정 도구가 아니다. 장애 대응은 아래 순서로 한다.

```text
1. 고객이 말한 시간대와 실제 로그 시간대가 같은지 확인
2. 같은 orderId 또는 같은 메뉴 ID로 로그를 좁힘
3. 주문 시작, 컵 투출, 얼음/물, 커피 명령, 커피 완료, 주문 완료 순서를 확인
4. ERROR/WARN이 있어도 주문 완료가 뒤에 있으면 실제 실패인지 재확인
5. 어드민/원격 조치나 세척 기록이 있으면 조치 전후 주문을 나눠서 비교
6. 로그상 정상 완료인데 고객 증상이 다르면 센서에 안 잡히는 물리 문제를 의심
```

자주 보이는 판정 예:

```text
컵센서 대기/타임아웃만 반복
  → 컵 투출 물리 상태와 컵센서 감지 상태 우선 확인

커피 명령 응답 후 정지 감지 실패 + 11회 재시도
  → 통신 자체보다 머신 상태 전환/제조부 동작 확인 우선

세척 또는 어드민 조치 이후 정상 주문 발생
  → 조치 시점을 기준으로 장애 재현 여부 확인

HTTP 4xx/5xx가 반복
  → 관리자/API/네트워크 문제 가능성, 키오스크 제조 장비 문제와 분리
```
