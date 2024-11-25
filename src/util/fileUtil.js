const fs = require('fs');
const path = require('path');

// JSON 파일 경로 설정
const jsonFilePath = path.join(__dirname, '..', 'assets', 'json', 'menu.json');

// 1. JSON 데이터 읽기
function readJsonFile() {
    try {
        const data = fs.readFileSync(jsonFilePath, 'utf8');
        return JSON.parse(data);  // JSON 문자열을 객체로 변환
    } catch (error) {
        console.error('파일 읽기 오류:', error);
        return null;
    }
}

// 2. JSON 데이터 수정하기
function updateJsonFile(updates) {
    try {
        const data = readJsonFile();  // 기존 JSON 데이터 읽기
        if (!data) {
            console.error('파일을 읽을 수 없습니다.');
            return;
        }

        // 주어진 업데이트 데이터를 기존 데이터에 병합
        const updatedData = { ...data, ...updates };

        // 수정된 데이터를 JSON 파일에 다시 쓰기
        fs.writeFileSync(jsonFilePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log('JSON 파일이 성공적으로 수정되었습니다.');
    } catch (error) {
        console.error('파일 수정 오류:', error);
    }
}

// 3. JSON 데이터 추가하기
function addToJsonFile(newData) {
    try {
        const data = readJsonFile();  // 기존 JSON 데이터 읽기
        if (!data) {
            console.error('파일을 읽을 수 없습니다.');
            return;
        }

        // 새로운 데이터를 기존 데이터에 추가
        const updatedData = Array.isArray(data) ? [...data, newData] : newData;

        // 수정된 데이터를 JSON 파일에 다시 쓰기
        fs.writeFileSync(jsonFilePath, JSON.stringify(updatedData, null, 2), 'utf8');
        console.log('새로운 데이터가 JSON 파일에 추가되었습니다.');
    } catch (error) {
        console.error('파일 추가 오류:', error);
    }
}

// 4. JSON 데이터 삭제하기
function deleteFromJsonFile(keyToDelete) {
    try {
        const data = readJsonFile();  // 기존 JSON 데이터 읽기
        if (!data) {
            console.error('파일을 읽을 수 없습니다.');
            return;
        }

        // 데이터를 수정해서 특정 항목 삭제
        if (data.hasOwnProperty(keyToDelete)) {
            delete data[keyToDelete];  // 해당 키 삭제
            fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`키 "${keyToDelete}"가 삭제되었습니다.`);
        } else {
            console.log(`키 "${keyToDelete}"가 존재하지 않습니다.`);
        }
    } catch (error) {
        console.error('파일 삭제 오류:', error);
    }
}

module.exports = {
    readJsonFile,
    updateJsonFile,
    addToJsonFile,
    deleteFromJsonFile
};
