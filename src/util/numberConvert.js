function convertTimeToHex(timeInSeconds) {
    const multipliedValue = Math.round(timeInSeconds * 10);  // 초를 10배로 변환
    const hexValue = multipliedValue.toString(16).toUpperCase();  // 16진수로 변환
    return hexValue.padStart(2, "0");  // 두 자리가 되도록 패딩
}

module.exports = {
    convertTimeToHex
}