const HID = require('node-hid');

console.log("==== HID DEVICE LIST ====");

try {
    const devices = HID.devices();

    if (!devices.length) {
        console.log("HID 장치가 없습니다.");
        process.exit(0);
    }

    devices.forEach((d, i) => {
        console.log("---------------");
        console.log("index:", i);
        console.log("vendorId:", d.vendorId);
        console.log("productId:", d.productId);
        console.log("product:", d.product);
        console.log("manufacturer:", d.manufacturer);
        console.log("path:", d.path);
        console.log("interface:", d.interface);
        console.log("usagePage:", d.usagePage);
        console.log('serialNumber:', d.serialNumber);
        console.log("usage:", d.usage);
    });

} catch (err) {
    console.error("HID 조회 실패:", err);
}