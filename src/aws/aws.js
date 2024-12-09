const AWS = require('aws-sdk');
const log = require('../logger');

// 환경 변수에서 자격 증명 값 읽어오기
const accessKeyId = process.env.MODEL_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.MODEL_AWS_SECRET_ACCESS_KEY;
const region = process.env.MODEL_AWS_DEFAULT_REGION;

// AWS 자격 증명 설정
AWS.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: region,
});

// DynamoDB 클라이언트 생성
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// S3 클라이언트 생성
const s3 = new AWS.S3();

module.exports = { dynamoDB, s3 };
