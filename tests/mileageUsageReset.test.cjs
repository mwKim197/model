const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/renderer/order/order.js'), 'utf8');
const reset = source.match(/function resetMileageUsage\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(reset, 'resetMileageUsage must exist');

test('500P 사용 확정 후 재진입·취소 시 이전 사용내역 제거, 카드·쿠폰 보존', () => {
    const coupon = { method: '쿠폰', discountAmount: 100 };
    const card = { method: '카드', amount: 1000 };
    const paymentSession = {
        usePoint: { usedAmount: 500 }, totalDiscount: 600, couponTotal: 100,
        totalPayInfo: [{ method: '마일리지', usedAmount: 500 }, coupon, card],
    };
    vm.runInNewContext(`${reset}; resetMileageUsage();`, { paymentSession, console });
    assert.equal(paymentSession.usePoint, null);
    assert.equal(paymentSession.totalDiscount, 100);
    assert.equal(paymentSession.totalPayInfo.length, 2);
    assert.equal(paymentSession.totalPayInfo[0], coupon);
    assert.equal(paymentSession.totalPayInfo[1], card);
    // 재선택한 실제 사용금액만 남아야 한다.
    paymentSession.totalPayInfo.push({ method: '마일리지', usedAmount: 200 });
    assert.equal(paymentSession.totalPayInfo.reduce((sum, item) => sum + (item.usedAmount || 0), 0), 200);
});

test('사용내역이 없는 경우도 안전하게 초기화', () => {
    const paymentSession = { usePoint: null, totalDiscount: 0, couponTotal: 0 };
    vm.runInNewContext(`${reset}; resetMileageUsage(); resetMileageUsage();`, { paymentSession, console });
    assert.equal(paymentSession.totalPayInfo.length, 0);
    assert.equal(paymentSession.totalDiscount, 0);
});
