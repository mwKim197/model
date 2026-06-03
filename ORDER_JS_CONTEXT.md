# `src/renderer/order/order.js` Deep Context

This file is the core kiosk screen controller. It owns the customer-facing order
page: menu rendering, cart state, payment selection, mileage/coupon modals,
barcode input, remote order commands, serial status display, auto wash/preheat,
and order submission to the machine workflow.

Read this document before changing `order.js`.

## Related Files

- `src/renderer/order/order.html`
  - Loads `order-utils.js` before `order.js`.
  - Keep this order because `order.js` reads `window.OrderUtils` during startup.

- `src/renderer/order/order-utils.js`
  - Contains pure calculations and product-name matching logic extracted from
    `order.js`.
  - Exposes `window.OrderUtils` for the renderer and `module.exports` for simple
    Node-based verification.
  - Current exports: `calculateTotalPayment`, `calculateOrderTotals`,
    `collectUsedCoupons`, `getMileageUsed`, `calcOrderTotal`, `normalizeName`,
    `nameScore`, and `findProductByName`.
  - Prefer adding DOM-independent order calculations here instead of growing
    `order.js`.

- `src/renderer/order/order-payment-session.js`
  - Owns the integrated payment session state and its coupon/mileage lifecycle.
  - Exposes `createPaymentSessionManager(dependencies)` through
    `window.OrderPaymentSession`.
  - The manager receives order-list accessors, calculations, API functions, and
    logging as dependencies so it does not rely on hidden renderer globals.
  - Current manager exports: `paymentSession`, `startPaymentSession`,
    `applyCouponFromOrders`, `accumulatePointUsage`, `commitPointUsage`,
    `accumulateEarnPoint`, `handleMileageEarn`, `handleUseCoupons`,
    `resetMileageUsage`, and `rollbackPointUsage`.

- `src/renderer/order/order-payment-modal.js`
  - Owns the current integrated payment modal flow and payment summary rendering.
  - Exposes `createPaymentModalController(dependencies)` through
    `window.OrderPaymentModal`.
  - The controller returns `totalPayment` and `renderTotalPayContent`.
  - Card, barcode, point, coupon, and order-start functions are injected as
    callbacks so the modal does not directly own their Electron/API details.
  - `payment()` remains the older legacy payment flow in `order.js`.

## File Role

Path:

```text
C:\Users\perop\WebstormProjects\model\src\renderer\order\order.js
```

Approximate size: 3,399 lines.

Main responsibilities:

- Load user/menu/config data.
- Render product cards and category tabs.
- Manage `orderList` cart state.
- Run customer countdown/reset behavior.
- Show alert, point, coupon, barcode, card payment, and total payment modals.
- Handle card, barcode, coupon, mileage use, and mileage earn flows.
- Submit completed orders to `window.electronAPI.setOrder`.
- Listen for remote commands from the local Express server.
- Listen for scanner keyboard input.
- Receive serial polling data from main process.
- Run timed wash/preheat checks.

## Important Global State

These globals are shared across many functions:

- `orderList`
  - Cart/order state.
  - Items include `orderId`, `menuId`, `name`, `price`, `count`, `items`, `cupYn`, `iceYn`, and coupon fields such as `couponUsed` / `usedCoupons`.

- `isPaying`
  - Used to block barcode scanner input while payment is active.
  - Also reset by coupon modal helper `safeResolve`.

- `paymentTimeout`
  - Declared for payment timeout handling, but not heavily used in the current flow.

- `rd1Info`
  - Latest serial polling data from `window.electronAPI.updateSerialData`.
  - Used for wash/preheat checks.

- `allProducts`
  - Menu products loaded from backend/DynamoDB.
  - Later filtered by sold-out/inventory state.

- `hasCoffee`
  - Intended for coffee preheating timing. Current order-time preheat check is commented out.

- `preheatingTime`
  - Defaults to `1800` seconds, overwritten by `userInfo.preheatingTime`.

- `userInfo`
  - Store/user config loaded from `window.electronAPI.getUserData()`.
  - Controls logo, categories, limit count, mileage settings, barcode availability, coupon availability, VCAT/NVCAT choice, wash/preheat settings, inventory checks, etc.

- `currentAudio`
  - Current audio prompt. `playAudio` stops the old audio before playing a new one.

- `iconImage`
  - Empty-cart image URL from user config.

- `totalCount`
  - Total cart item count.

- `limitCount`
  - Max cart item count. Defaults to `10`, overwritten by `userInfo.limitCount`.

- `countdownTimer` / `remainingSeconds`
  - Customer inactivity countdown.

- `globalDim`
  - Global modal overlay element.

## Startup Flow

The file ends with:

```js
fetchData().then();
```

`fetchData` is the main initializer:

1. Calls `window.electronAPI.getBasePath()`.
2. Calls `window.electronAPI.fetchAndSaveUserInfo()` to refresh config.
3. Calls `window.electronAPI.getMenuInfoAll()` to fetch menu data.
4. Calls `window.electronAPI.getUserData()` to populate `userInfo`.
5. Calls `window.electronAPI.getVersion()` and renders version.
6. Renders user logo and empty-cart image.
7. Sets `preheatingTime` and `limitCount`.
8. Downloads S3 images into local cache.
9. Calls `updateStoreInfo()`.
10. Calls `generateMenu(userInfo.category)`.
11. Sorts `allProducts` by `no`.
12. Optionally calls `getInventoryStatus` and applies sold-out flags.
13. Filters `allProducts` down to `empty === "no"`.
14. Calls `displayProducts(allProducts)`.

Important implication:

- The current UI filters sold-out products out after inventory checks. Some earlier render code can show sold-out badges, but the final initializer removes sold-out products from the rendered list.

## Menu Rendering And Cart Flow

### Category Tabs

- `generateMenu(categories)` creates `.menu-tab` elements under `#menu-nav`.
- A `DOMContentLoaded` listener attaches click handling to `#menu-nav`.
- `activateTab(tab)` filters `allProducts` by `category` and calls `displayProducts`.

### Product Cards

`displayProducts(products)`:

- Clears `#productGrid`.
- Builds product cards with image, badges, price, and invisible/empty button.
- Calls `adjustTextSize` for product names.
- Adds click handler to call `addItemToOrder(product.menuId)` unless sold out.

Potential gotcha:

- The card has both inline `onclick` in generated HTML and a separate `card.addEventListener('click', ...)`. This can cause double-add risk depending on event target behavior. If duplicate item additions are seen, inspect this first.

### Add Item

`addItemToOrder(menuId)`:

- Finds product from `allProducts`.
- Starts inactivity countdown.
- Plays "drink selected" audio.
- Checks total count against `limitCount`.
- If item already exists, increments quantity and updates row UI.
- If new item, creates order row DOM and pushes to `orderList`.
- Updates summary via `updateOrderSummary`.

Related helpers:

- `addOrderItem(orderItem)`
- `removeItemFromOrder(button, orderId)`
- `updateItemQuantity(button, delta, orderId)`
- `removeAllItem()`
- `removeAll()`
- `checkAndShowEmptyImage()`
- `updateOrderSummary()`

## Countdown Behavior

`startCountdown`:

- Sets `remainingSeconds = 62`.
- Updates `#countDown`.
- Every second decrements.
- At zero:
  - Clears cart.
  - Closes point/total modals.
  - Re-selects `all` category tab.

`resetCountdown` calls `startCountdown`.

`clearCountdown` stops the timer and sets remaining seconds to `0`.

Many button handlers call `resetCountdown` to keep the session alive.

## Alerts And Modals

Basic modal helpers:

- `openAlertModal(text, type = "info")`
- `closeAlertModal()`
- `openModal(message, onConfirm, onCancel)`
- `closeModal()`
- `closeTotalModal()`
- `closePointModal()`

`globalDim` is used as the background overlay for several modals.

There is a `MutationObserver` on `globalDim` that logs stack traces whenever the overlay becomes hidden. This looks like debugging code to find unexpected overlay closing.

## Current Payment Architecture

There are two payment flows in the file:

1. Current integrated payment flow:
   - `startPayment`
   - `startPaymentSession`
   - `totalPayment`
   - `paymentSession`
   - `cardPayment`
   - `barcodePayment`
   - `pointPayment`
   - coupon helpers
   - `ordStart`

2. Older/legacy payment flow:
   - `payment`

The payment button currently calls:

```js
document.getElementById('payment').addEventListener('click', async () => {
    await startPayment();
});
```

Inside `startPayment`, the code calls:

```js
await totalPayment();
```

So `totalPayment` is the currently important payment path.

## `paymentSession`

`paymentSession` is the state object for integrated payment.

Fields:

- `orderId`
- `orderAmount`
- `totalDiscount`
- `paidAmount`
- `usePoint`
- `earnPoint`
- `totalPayInfo`
- `couponItems`
- `couponMenuIds`
- `couponTotal`
- `reset()`

Main lifecycle:

1. `startPaymentSession(orderId, orderAmount)` resets payment state and removes coupon fields from `orderList`.
2. `totalPayment(data)` recalculates coupon/point/paid amounts.
3. Card/barcode/point/coupon buttons mutate `paymentSession`.
4. When payment reaches zero remaining amount, points/coupons are committed and `ordStart` starts manufacturing.
5. After success, `paymentSession.reset()` is called in some paths.

## Integrated Payment Flow

### `startPayment`

Purpose:

- Entry point from the `#payment` button and remote `order-start-payment`.
- Validates that `orderList` is not empty.
- Starts integrated payment by calling `totalPayment()`.

Expected high-level flow:

1. User has cart.
2. User clicks pay.
3. `startPayment` opens integrated total payment modal.
4. User chooses card, barcode, mileage, or coupon.

### `totalPayment(data)`

This is the central payment router.

It:

- Stops countdown.
- Calculates total order amount via `calculateOrderTotals(orderList)`.
- Applies coupon discount from `paymentSession.couponTotal`.
- Applies mileage use through `accumulatePointUsage(data)`.
- Applies mileage earn through `accumulateEarnPoint(data)`.
- Computes final remaining payment:

```text
remaining = (orderTotal - couponDiscount) - mileageUsed - paidAmount
```

If remaining amount is `0` or less:

1. Commits point usage with `commitPointUsage`.
2. Calls `handleUseCoupons`.
3. Calls `ordStart`.
4. Rolls back point usage if order start fails.

If remaining amount is greater than `0`:

1. Opens `#totalPayModel`.
2. Renders payment details with `renderTotalPayContent`.
3. Shows/hides payment buttons depending on `userInfo`:
   - Barcode hidden when `userInfo.barcode === false`.
   - Point hidden when `userInfo.payType === true` or earn flow already selected.
   - Coupon hidden when `userInfo.coupon === true` or point/earn flow is active.
4. Wires button handlers:
   - card
   - barcode
   - point
   - coupon

Important gotcha:

- `totalPayment` can call itself recursively after card/point/coupon steps. It depends heavily on `paymentSession` being consistent.

### Card Button

In `totalPayment`, `payCard.onclick`:

1. Closes total payment modal.
2. Calls `cardPayment(orderAmount, 0)`.
3. On failure, calls `totalPayment()` again.
4. On success:
   - Calls `handleMileageEarn`.
   - Calls `handleUseCoupons`.
   - Adds card info to `paymentSession.totalPayInfo`.
   - Increases `paymentSession.paidAmount`.
   - Calls `totalPayment({ action: 'immediatePayment', ... })` again.

### Barcode Button

In `totalPayment`, `payBarcode.onclick`:

1. Closes total payment modal.
2. Calls `barcodePayment(orderAmount, 0)`.
3. If canceled, returns silently.
4. If failed, shows alert and returns to `totalPayment` after OK.
5. If success:
   - Parses payment terminal response fields.
   - Pushes payment info into `paymentSession.totalPayInfo`.
   - Calls `handleMileageEarn`.
   - Calls `handleUseCoupons`.
   - Calls `ordStart`.

Difference from card path:

- Barcode path currently calls `ordStart` directly after success instead of increasing `paidAmount` and re-entering `totalPayment`.

### Point Button

In `totalPayment`, `payPoint.onclick`:

1. Calls `resetMileageUsage`.
2. Calls `pointPayment(paymentSession.orderAmount)`.
3. Pushes selected mileage info to `paymentSession.totalPayInfo`.
4. Calls `totalPayment(response)` again.

`response.action` decides whether this is:

- `usePoints`
- `immediatePayment`
- `exit`

### Coupon Button

In `totalPayment`, `payCoupon.onclick`:

1. Calls `showCouponModal()`.
2. If coupon was applied, calls `applyCouponFromOrders(orderList)`.
3. Reopens `totalPayment`.

## Coupon Flow

Important functions:

- `showCouponModal`
- `updateDynamicContent2("couponInput")`
- `getBarcodeScanModal`
- `getCouponApi`
- `useCouponApi`
- `calculateOrderTotals`
- `applyCouponFromOrders`
- `collectUsedCoupons`
- `handleUseCoupons`

Coupon data is stored on `orderList` items:

- `couponUsed`
- `usedCoupons`

`calculateOrderTotals(orderList)`:

- Computes total order amount.
- Computes per-line coupon discount based on `couponUsed`.
- Computes `couponDiscount`.
- Returns `couponLines`.

`applyCouponFromOrders(orderList)`:

- Updates `paymentSession.orderAmount`.
- Updates `paymentSession.couponItems`.
- Updates `paymentSession.couponTotal`.
- Updates `paymentSession.totalDiscount`.
- Adds coupon info to `paymentSession.totalPayInfo`.

`collectUsedCoupons(orderList)`:

- Deduplicates used coupons by `couponId`.
- Produces payload for backend coupon use.

`handleUseCoupons(orderList)`:

- Calls `useCouponApi(coupons)`.
- Logs success/failure.

Potential gotcha:

- Coupon use is committed in multiple payment success paths. Be careful to avoid committing coupons twice if refactoring payment flow.

## Mileage / Point Flow

Important functions:

- `pointPayment`
- `updateDynamicContent`
- `checkMileageExists`
- `verifyMileageAndReturnPoints`
- `saveMileageToDynamoDB`
- `addMileage`
- `useMileage`
- `rollbackMileage`
- `accumulatePointUsage`
- `commitPointUsage`
- `accumulateEarnPoint`
- `handleMileageEarn`
- `resetMileageUsage`
- `rollbackPointUsage`

### Point Modal State Machine

`updateDynamicContent(contentType, data, resolve)` drives the mileage modal.

Main `contentType` states:

- `pointInput`
  - Ask customer for mileage number or phone.
  - Buttons: register, earn, use.

- `passwordInput`
  - Verify password before using points.

- `usePoints`
  - Customer chooses how many points to use.

- `joinPoints`
  - Start new mileage registration with mileage number.

- `addPhone`
  - Enter phone number.

- `addPassword`
  - Enter new password and save mileage account.

`stateStack` exists for back navigation, but the active implementation mostly advances states directly.

### Mileage Earn

`accumulateEarnPoint(data)` stores earn intent in `paymentSession.earnPoint`.

`handleMileageEarn(orderAmount, userInfo)` applies earn after successful payment:

```js
addMileage(uniqueMileageNo, orderAmount, earnRate)
```

### Mileage Use

`accumulatePointUsage(resp)` stores intended point usage in `paymentSession.usePoint`.

`commitPointUsage()` commits usage:

```js
useMileage(mileageNo, totalAmtNum, usedAmount)
```

`rollbackPointUsage(reason)` attempts to rollback point usage if manufacturing/order start fails after points were committed.

Potential gotcha:

- `rollbackMileage` argument order is easy to misuse. Check `rollbackMileage` definition before changing calls.

## Card Payment

`cardPayment(orderAmount, discountAmount)`:

- Stops countdown.
- Opens card payment modal.
- Chooses terminal API:
  - `userInfo.vcat === true`: `window.electronAPI.reqVcatWebSocket(totalAmount)`
  - otherwise: `window.electronAPI.reqVcatHttp(totalAmount)`
- Parses terminal response into `cardInfo`.
- Returns:

```js
{ success: true, cardInfo }
```

On failure:

- Closes modal.
- Restarts countdown.
- Shows alert.
- Returns `false`.

On exception:

- Closes modal.
- Restarts countdown.
- Clears order list.
- Shows empty image.
- Returns `false`.

## Barcode Payment

`barcodePayment(orderAmount, discountAmount = 0)`:

- Opens barcode payment modal.
- On close:
  - Calls `stopBarcode`.
  - Returns `{ success: false, canceled: true, message }`.
- Calls `window.electronAPI.reqPayproBarcode(totalAmount)`.
- Returns terminal result.

Related helpers:

- `requestEmployeeCardId`
- `getBarcode`
- `stopBarcode`

## Order Submission / Manufacturing Start

`ordStart(point = 0, payInfo, pointData, totalPayInfo)`:

1. Clears countdown.
2. Builds:

```js
{
  point,
  orderList,
  payInfo,
  pointData,
  totalPayInfo
}
```

3. Calls:

```js
window.electronAPI.setOrder(ordInfo)
```

4. Clears cart.
5. Shows empty image.
6. Re-selects `all` category.

If `setOrder` fails:

- It still clears cart and resets category.
- It rethrows the error so the caller can rollback points.

Backend chain:

```text
order.js ordStart
-> preload.js electronAPI.setOrder
-> renderer/api/orderApi.js reqOrder
-> POST /start-order
-> serial/portProcesses/Connect.js
-> services/serialOrderManager.js startOrder
```

## Scanner And Remote Control

### Local Keyboard Barcode Scanner

A global `keydown` listener collects fast key input:

- If time between keys is over `50ms`, buffer resets.
- On `Enter`, calls `handleBarcode(code)`.
- Ignores input when `isRemoteScanActive` or `isPaying`.

`handleBarcode(code)`:

- Finds product where `p.barcode === code`.
- Rejects unknown or sold-out products.
- Calls `addItemToOrderWithQty(product.menuId, 1)`.

### Remote Add Item

`window.electronAPI.on("order-add-item", ...)`:

- Receives `{ menuName, qty }`.
- Calls `addItemByMenuName`.

This is triggered by server route:

```text
POST /order/add-item
```

### Remote Start Payment

`window.electronAPI.on("order-start-payment", ...)`:

- Calls `startPayment`.

This is triggered by server route:

```text
POST /order/start-payment
```

### Remote Barcode Scan

`window.electronAPI.on("order-barcode-scan", ...)`:

- Sets `isRemoteScanActive = true`.
- Adds a temporary `keydown` listener.
- On scanner `Enter`, sends:

```js
window.electronAPI.send("barcode-scanned", { barcode: code });
```

This is used by server route:

```text
POST /call-barcode
```

Potential gotcha:

- The remote scan handler sets `isRemoteScanActive = true` but does not visibly reset it to `false` after scan completion in the shown code. If local scanner stops working after remote scan, inspect this flag.

## Serial Polling / Machine Status

`window.electronAPI.updateSerialData(getPollingData)` subscribes to serial status.

`getPollingData(data)`:

- Logs polling data.
- Updates global `rd1Info`.

`updateTime()`:

- Updates `#current-time` every second.

`rd1Info.autoOperationState` is used in:

- `handlerWash`
- `coffeePreheating`

The code compares against Korean text for idle/normal state. Because the source has mojibake in many comments/strings, be very careful editing these comparisons.

## Auto Wash

`handlerWash()` runs every 5 minutes:

```js
setInterval(handlerWash, 1000 * 60 * 5);
```

It:

- Reads current hour.
- Uses `userInfo.washTime` or default `4`.
- Checks `lastWashDate` from Electron store.
- If machine is idle, wash was not run today, countdown is inactive, and current hour matches wash time:
  - Saves today as last wash date.
  - Builds a wash recipe list.
  - Calls `window.electronAPI.adminUseWash(data)`.
  - Calls `window.electronAPI.requestAppRestart()`.

## Auto Preheating

`coffeePreheating()` runs every minute:

```js
setInterval(coffeePreheating, 1000 * 60);
```

It:

- Requires `userInfo.warmUp === true`.
- Requires machine idle and no active countdown.
- Runs only when minute is `0` or `30`.
- Calls `window.electronAPI.coffeePreheating()`.

There is also commented-out order-time coffee preheat logic inside `ordStart`.

## Inventory / Sold Out

`applySoldOutToAllProducts(allProducts, inventory)`:

- Reads `inventory.flags.soldOut`.
- Supports keys like:
  - `coffee_1`
  - `coffee_2`
  - `cup_paper`
  - `cup_plastic`
  - `${item.type}_${item.value1}`
- Marks product `empty = "yes"` when recipe ingredients or required cup are sold out.

Then `fetchData` filters:

```js
allProducts = allProducts.filter(p => p.empty === "no");
```

If the intended UX is to show sold-out items with badges, this final filter is the place to revisit.

## Voice/Remote Menu Matching

Remote add-by-name helpers:

- `normalizeName`
- `nameScore`
- `findProductByName`
- `addItemToOrderWithQty`
- `addItemByMenuName`

Matching priority:

1. Exact normalized match.
2. Starts-with match.
3. Includes match.
4. Non-sold-out product preferred.

This supports server/voice-style commands that pass a menu name rather than `menuId`.

## External APIs Used Through `window.electronAPI`

Common calls in this file:

- `logToMain`
- `getBasePath`
- `fetchAndSaveUserInfo`
- `getMenuInfoAll`
- `getUserData`
- `getVersion`
- `downloadAllFromS3WithCache`
- `getInventoryStatus`
- `setOrder`
- `updateSerialData`
- `getLastWashDate`
- `setLastWashDate`
- `adminUseWash`
- `requestAppRestart`
- `coffeePreheating`
- `updateMileageAndLogHistory`
- `checkMileageExists`
- `verifyMileageAndReturnPoints`
- `saveMileageToDynamoDB`
- `getCoupon`
- `useCoupon`
- `reqVcatWebSocket`
- `reqVcatHttp`
- `requestEmployeeCardId`
- `reqBarcodeHTTP`
- `stopBarcode_HTTP`
- `reqPayproBarcode`
- `on`
- `send`

If one of these does not exist, check `src/preload.js`.

## Highest-Risk Areas

- `totalPayment`
  - Central recursive payment router.
  - Easy to break coupon/point/card sequencing.

- `paymentSession`
  - Shared mutable state.
  - Must stay consistent across recursive calls.

- `orderList`
  - Shared cart state and backend order payload.
  - Coupon fields are stored directly on order items.

- `updateDynamicContent`
  - Big state machine for mileage registration/use.
  - Many nested event listeners.

- `updateDynamicContent2`
  - Coupon modal with abort controller and custom safe resolve.

- `ordStart`
  - Boundary from UI/payment to physical machine manufacturing.

- Scanner listeners
  - Global keyboard listeners can conflict with modal input and remote scanning.

- `globalDim` show/hide
  - Many modal flows control the same overlay.

## Refactor Opportunities

Do not do these casually during small bug fixes, but these are good future split points:

- `order.cart.js`
  - `orderList`, add/remove/update item, summary, product matching.

- `order.paymentSession.js`
  - `paymentSession`, coupon totals, point accumulation, total payment math.

- `order.payment.js`
  - `totalPayment`, `cardPayment`, `barcodePayment`, `ordStart`.

- `order.mileageModal.js`
  - `pointPayment`, `updateDynamicContent`, number keypad state.

- `order.couponModal.js`
  - `showCouponModal`, `updateDynamicContent2`, coupon API application.

- `order.scanner.js`
  - Local scanner, remote scanner, barcode buffer logic.

- `order.maintenance.js`
  - Auto wash, preheating, polling/time display.

- `order.bootstrap.js`
  - `fetchData`, initial render, inventory/sold-out.

Good first extraction target:

- Extract pure calculation helpers first:
  - `calculateOrderTotals`
  - `collectUsedCoupons`
  - `getMileageUsed`
  - `calcOrderTotal`
  - `normalizeName`
  - `nameScore`

These have fewer DOM/hardware dependencies.

## Safe Change Checklist

Before editing `order.js`:

1. Identify which domain you are touching:
   - cart
   - payment
   - mileage
   - coupon
   - scanner
   - manufacturing start
   - maintenance
   - bootstrap

2. Check the related DOM IDs in `order.html`.

3. Check whether a backend API comes from `preload.js`.

4. Preserve these invariants:
   - Never call `setOrder` before payment/coupon/point state is settled.
   - Do not start local scanner handling during remote scan or active payment.
   - Keep `orderList` and rendered cart rows in sync.
   - Keep `globalDim` hidden when all modals close.
   - Roll back point usage if order start fails after points were committed.
   - Do not silently break `order-add-item`, `order-start-payment`, or `order-barcode-scan`.

5. Test manually where possible:
   - Add item by tapping product.
   - Add quantity, remove quantity, remove item.
   - Timeout resets cart.
   - Payment modal opens.
   - Coupon modal can cancel cleanly.
   - Point modal can cancel cleanly.
   - Remote `order/add-item` still works.
   - Scanner input still adds a product.

## Suggested Prompt For Future AI Sessions

```text
Read AI_CONTEXT.md and ORDER_JS_CONTEXT.md first. The key file is
C:\Users\perop\WebstormProjects\model\src\renderer\order\order.js.
It is a large stateful kiosk controller. Keep changes small. The current payment
entry is startPayment -> totalPayment -> paymentSession -> card/barcode/point/coupon
-> ordStart -> electronAPI.setOrder. Preserve orderList/paymentSession behavior and
be careful with scanner/globalDim/modal side effects.
```
