require('dotenv').config();  // .env 파일에서 환경 변수 로드
const AWS = require('aws-sdk');

// 환경 변수에서 자격 증명 값 읽어오기
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_DEFAULT_REGION;

// AWS 자격 증명 설정
AWS.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: region,
});

// DynamoDB 클라이언트 생성
const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports = dynamoDB;
