function convertTimeToHex(timeInSeconds) {
    const multipliedValue = Math.round(timeInSeconds * 10); // 초를 10배로 변환
    const hexValue = multipliedValue.toString(16).toUpperCase(); // 16진수로 변환
    return `0x${hexValue.padStart(2, "0")}`; // 항상 0x로 시작하도록 반환
}

module.exports = {
    convertTimeToHex,
};