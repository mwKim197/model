const HID = require('node-hid');

const TARGET_VID = 0x16C0;
const TARGET_PID = 0x05DF;

const devices = HID.devices();
const relay = devices.find(
    d => d.vendorId === TARGET_VID && d.productId === TARGET_PID
);

if (!relay) {
    console.error('USBRelay4 장치를 찾지 못했습니다.');
    process.exit(1);
}

console.log('USBRelay4 찾음');
console.log(JSON.stringify(relay, null, 2));