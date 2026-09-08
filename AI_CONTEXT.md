# AI Context for `model`

This document is a compact project map for AI agents working on this repo.
Use it before editing code so smaller models can understand the system quickly.

## Project Summary

`model` is a Windows Electron kiosk app for drink/product ordering. It runs a
fullscreen Electron UI, starts a local Express server on port `3142`, controls
serial hardware, talks to AWS services, handles payments/barcode flows, and can
expose admin/control APIs through Cloudflare Tunnel.

The app is mostly CommonJS JavaScript. Renderer pages are plain HTML/CSS/JS,
with Tailwind-generated CSS checked into `src/styles/output.css`.

## Current Local Repo

- Local path: `C:\Users\perop\WebstormProjects\model`
- GitHub repo: `mwKim197/model`
- Common working branch seen locally: `fix/new-order`
- Package: `model@2.2.1`
- Electron entry: `src/main.js`
- Main renderer entry page: `src/renderer/index/index.html`
- Main order page: `src/renderer/order/order.html`
- Admin page: `src/renderer/web/modelAdmin.html`

## Commands

Use `npm.cmd` in PowerShell because `npm.ps1` may be blocked by execution policy.

```powershell
npm.cmd install
npm.cmd start
npm.cmd run build
```

Notes:

- `npm.cmd start` builds Tailwind CSS, sets `NODE_ENV=development`, then starts Electron.
- There is no real test suite. `npm test` intentionally exits with an error.
- The app depends on Windows/hardware-specific pieces: Electron, serial ports, HID/barcode/payment devices, Cloudflare executable, and local environment values.

## Runtime Flow

1. `src/main.js`
   - Loads `.env.local`.
   - Enforces a single Electron instance.
   - Sets up port forwarding for `3142`.
   - Starts the Express server from `src/server.js`.
   - Creates the fullscreen always-on-top Electron window.
   - Reads user data from `electron-store`.
   - Starts Cloudflare tunnel/health checks when `userId` exists.
   - Starts serial polling and sends `update-serial-data` to the renderer every 3 seconds.
   - Registers IPC handlers from `src/events/eventHandlers.js`.

2. `src/windows/mainWindow.js`
   - Creates the `BrowserWindow`.
   - Uses `src/preload.js`.
   - Stores `user` and `lastWashDate` in `electron-store`.
   - Loads `src/renderer/index/index.html`.
   - Forwards internal `order-update` events to the renderer.

3. `src/server.js`
   - Creates Express server on `0.0.0.0:3142`.
   - Serves renderer/assets/images.
   - Mounts route modules for serial, menu/admin, Excel/mileage, and control APIs.
   - Provides logs/version/status/update/barcode/remote order APIs.

4. `src/preload.js`
   - Exposes `window.electronAPI` to renderer pages.
   - Bridges renderer calls to local API modules and IPC.
   - Important exposed APIs include user login, menu fetch, order/payment, mileage, coupon, barcode, admin wash/preheat/restart, S3 image cache, and serial updates.

## Main Directories

- `src/renderer/index`
  - Login/signup/start screen.
  - If stored `user.userId` exists, navigates to the order page.

- `src/renderer/order`
  - Main kiosk order UI.
  - Handles product display, cart/order list, payment flow, countdown reset, audio prompts, mileage/coupon/barcode flows, and remote API events such as `order-add-item`, `order-start-payment`, and `order-barcode-scan`.

- `src/renderer/web`
  - Browser/admin pages.
  - `modelAdmin.*` is the main admin UI for menu management, settings, sales, mileage, device actions, app restart/update, and hardware admin actions.
  - `menuApi.browser.js` is for browser/admin HTTP calls to the app server.

- `src/renderer/api`
  - Renderer-side API wrappers used through `preload.js`.
  - `userApi.js`: signup/login/user sync/menu copy.
  - `menuApi.js`: local menu/device/admin API calls from Electron renderer.
  - `menuApi.browser.js`: admin web page API wrapper using host URL.
  - `orderApi.js`: payment, barcode, coupon, order submission, restart, inventory.
  - `mileageApi.js`: mileage lookup/verify/save/update.
  - `vcatApi.js`: VCAT websocket/app-card/coupon flow helpers.

- `src/aws`
  - AWS SDK setup and DynamoDB/S3 helpers.
  - `db/Menu.js`: Express routes for menu/admin/user/mileage/notice/statistics.
  - `db/Excel.js`: Excel upload/merge and mileage import helpers.
  - `db/utils/*`: DynamoDB operations for menu, count, payment, mileage, notices, users, sorting.
  - `s3/utils/image.js`: S3 image upload/download/cache.
  - `s3/utils/cacheDirManager.js`: local image cache path.
  - `lambda/inventory.js`: inventory status integration.
  - `route53/route53.js`: DNS integration.

- `src/serial`
  - Serial port abstraction and HTTP route modules.
  - `config.js`: configured COM ports.
  - `serialCommManager.js`: creates shared serial managers for COM1, COM3, COM4.
  - `SerialPortManager.js`: serial communication implementation.
  - `serialDataParser.js`: parses machine status data.
  - `portProcesses/*`: hardware action route/modules for connect/order/ice/cup.

- `src/services`
  - Shared runtime services.
  - `serialOrderManager.js`: core drink/order manufacturing workflow.
  - `serialPolling.js`: periodic serial polling.
  - `serialDataManager.js`: reads/normalizes serial status.
  - `busyState.js`: prevents overlapping machine jobs.
  - `events.js`: shared EventEmitter for UI progress events.
  - `portForwarding.js`: Windows port forwarding setup.

- `src/cloudflare`
  - Cloudflare Tunnel setup, process lifecycle, API checks, and health checks.

- `src/vcat` and `src/nvcat`
  - Payment/barcode terminal integrations.

- `src/assets`
  - Audio prompts and kiosk images.

## Important HTTP Routes

Mounted by `src/server.js`:

- General app:
  - `GET /version`
  - `GET /status`
  - `POST /electon-update` (spelling is currently `electon`)
  - `GET /logs`
  - `GET /logs/:filename`
  - `POST /order/add-item`
  - `POST /order/start-payment`
  - `POST /call-barcode`

- Connect/control routes in `src/serial/portProcesses/Connect.js`:
  - `POST /start-order`
  - `POST /admin-order`
  - `POST /set-user-info`
  - `POST /set-user-login`
  - `POST /get-all-users-ids`
  - `POST /set-menu-all-update`
  - `POST /get-data`
  - `POST /wash`
  - `POST /restart-app`
  - `POST /shutdown-app`
  - `POST /order-refresh`
  - `POST /admin-use-wash`
  - `POST /coffee-preheating`
  - `POST /extractor-home`
  - `GET /health`

- Menu, user, mileage, notice, image, and sales data use Lambda APIs under `src/aws/lambda` and `src/renderer/api`.
- Local admin hardware routes in `src/serial/portProcesses/Admin.js`:
  - `POST /serial-admin-ice-order`
  - `POST /serial-admin-cup-order`
  - `POST /serial-admin-drink-order`

- Serial hardware routes:
  - `src/serial/portProcesses/Cup.js`: cup info/use routes.
  - `src/serial/portProcesses/Ice.js`: ice/water time, run, stop, info routes.
  - `src/serial/portProcesses/Order.js`: coffee/tea/syrup setting and use routes.

## Core Manufacturing Flow

The key file is `src/services/serialOrderManager.js`.

High-level flow:

1. Renderer calls `window.electronAPI.setOrder(orderList)`.
2. `src/renderer/api/orderApi.js` sends the order to `POST /start-order`.
3. `src/serial/portProcesses/Connect.js` calls `serialOrderManager.startOrder`.
4. `startOrder` uses `busyState` so only one machine job runs at a time.
5. Menu recipes are loaded from DynamoDB via `allProduct`.
6. `processQueue` expands item counts.
7. `processOrder` runs cup, ice, coffee, powder/tea, syrup, hot water/sparkling steps.
8. Status events are emitted through `src/services/events.js`.
9. `mainWindow.js` forwards `order-update` events to the order renderer.
10. `src/renderer/order/order.js` updates the UI and audio prompts.

The recipe item `type` values currently handled include:

- `coffee`
- `garucha`
- `syrup`

Menu fields used heavily:

- `menuId`
- `name`
- `price`
- `category`
- `image`
- `items`
- `cupYn`
- `iceYn`
- `empty`
- `state`
- `no`

## Concurrency / Busy Guard

`src/services/busyState.js` is important for machine safety.

Use `runBusyJob(jobType, jobId, fn)` in `serialOrderManager.js` for operations that should not overlap. Existing busy types include:

- `order`
- `adminDrink`
- `adminCup`
- `adminIce`
- `wash`
- `preheat`
- `extractorHome`
- `fridgeOpen`
- `restart`
- `shutdown`

When adding new machine actions, make sure they respect this busy guard unless overlapping is intentionally safe.

## IPC and Renderer Bridge

IPC handlers live in:

- `src/windows/mainWindow.js`
- `src/events/eventHandlers.js`

Renderer bridge lives in:

- `src/preload.js`

Important channels/events:

- `get-user-data`
- `get-last-wash-date`
- `set-last-wash-date`
- `get-cache-dir`
- `navigate-to-page`
- `log-to-main`
- `update-serial-data`
- `order-update`
- `order-add-item`
- `order-start-payment`
- `order-barcode-scan`
- `barcode-scanned`

When adding renderer functionality, prefer exposing a small method through
`preload.js` instead of using direct Node access in renderer pages.

## Data and Persistence

- Local user/settings: `electron-store`.
- Main user helper: `src/util/store.js`.
- Menu/orders/mileage/notices/users: DynamoDB via `src/aws/db/utils/*`.
- Product images: S3 plus local cache.
- Logs: Electron app data path under `model/logs`.

The code often calls `getUser()` from `src/util/store.js` to decide the current
`userId`, API URL, category settings, mileage settings, and machine options.

## Payment / Barcode

Relevant files:

- `src/renderer/api/orderApi.js`
- `src/renderer/api/vcatApi.js`
- `src/vcat/vcat.js`
- `src/nvcat/Nvcat.js`
- `src/server.js` route `POST /call-barcode`

Flows include:

- VCAT HTTP/WebSocket card payment.
- NVCAT barcode/RF card operations.
- App card / coupon barcode flow.
- Remote barcode scan route that asks the order renderer to scan and returns result to server.

Payment code is hardware/protocol sensitive. Avoid broad refactors unless the exact device protocol is understood.

## Admin UI

Admin browser page:

- `src/renderer/web/modelAdmin.html`
- `src/renderer/web/modelAdmin.js`
- `src/renderer/api/menuApi.browser.js`

The admin page talks to the local app server. It detects Cloudflare domains:

- `*.nw-api.org` uses `https://{host}`
- other hosts use `http://{host}:3142`

Admin features include menu CRUD, image upload, category/settings, sales lookup,
mileage, notices, machine restart/update/shutdown, wash/preheat, cup/ice/drink
admin commands, and user sync.

## Build / Release

Release config is in `package.json` under `build`.

- Builder: `electron-builder`
- Output directory: `dist`
- Windows target: NSIS
- Artifact: `model-setup-${version}.exe`
- GitHub publish target: `mwkim197/model`
- Extra file: `resources/cloudflared.exe`
- `resources/cert.pem` is configured as an extra file but may not exist locally.

The README appears to be encoded incorrectly in the current checkout, but it seems
to describe the release/update process: bump version, build, create GitHub Release,
upload `latest.yml` and the setup exe, then restart the app to auto-update.

## Known Sharp Edges

- Many Korean comments/strings appear mojibake/garbled in the source. Be careful
  when editing nearby text; do not casually rewrite user-facing Korean unless asked.
- `npm.ps1` may be blocked in PowerShell. Use `npm.cmd`.
- `npm test` is not useful.
- The app assumes Windows and serial hardware. Many flows cannot be fully tested
  without the kiosk devices.
- `NODE_ENV=development` is set with Windows `set` syntax in `package.json`.
- `server.js` has route `/electon-update`; typo may be externally depended on.
- `src/server.js` serves both packaged and development static paths; avoid changing
  path logic casually.
- `preload.js` imports renderer API files directly. This is an established pattern
  in this project even though it mixes preload and renderer concerns.
- `src/services/serialOrderManager.js` is the highest-risk file because it controls
  physical machine actions and ordering state.
- `src/renderer/order/order.js` is large and stateful. Small targeted changes are safer.
- Hardware COM ports are hardcoded through `src/serial/config.js`.

## How To Approach Changes

For order/kiosk UI changes:

1. Start with `src/renderer/order/order.js` and `order.html`.
2. Check whether `preload.js` exposes the needed API.
3. If the change needs backend/device behavior, follow `orderApi.js` to Express routes.

For admin hardware changes, use `src/serial/portProcesses/Admin.js` and the dedicated serial routers. Menu management is handled by the administrator web application and Lambda APIs.

For menu/data changes:

1. Check `src/aws/lambda/menu.js`.
2. Check `src/aws/lambda/image.js` and `src/aws/s3/utils/imageSync.js`.
3. Check `src/renderer/api/menuApi.js`.

For order manufacturing changes:

1. Start with `src/services/serialOrderManager.js`.
2. Check port modules under `src/serial/portProcesses/*Module.js`.
3. Preserve `busyState` behavior.
4. Preserve `order-update` events expected by the renderer.

For login/user/store changes:

1. Check `src/renderer/index/index.js`.
2. Check `src/renderer/api/userApi.js`.
3. Check `src/util/store.js`.
4. Check `src/aws/db/utils/getUser.js`.

For build/update changes:

1. Check `package.json`.
2. Check `src/updater.js`.
3. Check release assets under `dist` and GitHub Releases.

## Suggested Prompt For Future AI Sessions

Use this when starting a new AI coding session:

```text
Read AI_CONTEXT.md first. Work in C:\Users\perop\WebstormProjects\model.
This is a Windows Electron kiosk app with Express on port 3142, serial hardware,
AWS DynamoDB/S3, Cloudflare Tunnel, and payment/barcode integrations. Keep changes
small and preserve hardware/order flow behavior. Use npm.cmd, not npm, in PowerShell.
```
