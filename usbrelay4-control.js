const HID = require('node-hid');

const TARGET_VID = 0x16C0;
const TARGET_PID = 0x05DF;

function findRelayDevice() {
    const devices = HID.devices();
    return devices.find(
        d => d.vendorId === TARGET_VID && d.productId === TARGET_PID
    );
}

function openRelay() {
    const relayInfo = findRelayDevice();

    if (!relayInfo) {
        throw new Error('USBRelay4 장치를 찾지 못했습니다.');
    }

    const device = new HID.HID(relayInfo.path);
    return device;
}

function relayOn(device, relayNumber) {
    device.sendFeatureReport([0x00, 0xFF, relayNumber]);
}

function relayOff(device, relayNumber) {
    device.sendFeatureReport([0x00, 0xFD, relayNumber]);
}

function allOn(device) {
    device.sendFeatureReport([0x00, 0xFE]);
}

function allOff(device) {
    device.sendFeatureReport([0x00, 0xFC]);
}

async function main() {
    const cmd = process.argv[2];
    const relayNumber = Number(process.argv[3] || 1);
    const duration = Number(process.argv[4] || 5000);

    let device;
    try {
        device = openRelay();

        switch (cmd) {
            case 'on':
                relayOn(device, relayNumber);
                console.log(`릴레이 ${relayNumber} ON`);
                break;

            case 'off':
                relayOff(device, relayNumber);
                console.log(`릴레이 ${relayNumber} OFF`);
                break;

            case 'allon':
                allOn(device);
                console.log('전체 릴레이 ON');
                break;

            case 'alloff':
                allOff(device);
                console.log('전체 릴레이 OFF');
                break;

            case 'pulse':
                relayOn(device, relayNumber);
                console.log(`릴레이 ${relayNumber} ON`);
                setTimeout(() => {
                    try {
                        relayOff(device, relayNumber);
                        console.log(`릴레이 ${relayNumber} OFF`);
                        device.close();
                    } catch (e) {
                        console.error('OFF 실패:', e);
                    }
                }, duration);
                return;

            default:
                console.log(`
사용법:
  node usbrelay4-control.js on 1
  node usbrelay4-control.js off 1
  node usbrelay4-control.js pulse 1 300
  node usbrelay4-control.js allon
  node usbrelay4-control.js alloff
        `);
        }

        device.close();
    } catch (err) {
        console.error('제어 실패:', err);
        if (device) {
            try { device.close(); } catch (_) {}
        }
    }
}

main();