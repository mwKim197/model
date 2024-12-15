/*
/!*const imageContainer = document.getElementById('image-container');
const img = document.createElement('img');
img.src = '/assets/images/꼬부기.jpg'; // 이미지 경로
img.alt = '커피 이미지';
img.className = 'w-full h-full object-cover rounded-lg';

imageContainer.appendChild(img);*!/

let userInfo = {};
let userInfo = {};
let allProducts = [];

async function fetchData() {
    try {
        const allData = await menuApi.getMenuInfoAll();
        userInfo = await menuApi.getUserInfo();
        console.log('Fetched Data:', allData);
        console.log('Fetched Data:', userInfo);

        // 데이터가 올바르게 로드되었는지 확인
        if (!allData || !Array.isArray(allData.Items)) {
            throw new Error('올바르지 않은 데이터 구조입니다.');
        }

        if (!userInfo) {
            throw new Error('유저정보조회에 실패했습니다.');
        }

        allProducts = allData.Items; // 데이터를 Items 배열로 설정

    } catch (error) {
        console.error("데이터 로드 중 오류 발생:", error);
    }
}
fetchData().then();*/
