const AWS = require('aws-sdk');
const log = require('../logger');

// 환경 변수에서 자격 증명 값 읽어오기
const accessKeyId = process.env.MODEL_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.MODEL_AWS_SECRET_ACCESS_KEY;
const region = process.env.MODEL_AWS_DEFAULT_REGION;

log.info(accessKeyId);
log.info(region);

// AWS 자격 증명 설정
AWS.config.update({
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
    region: region,
});

// DynamoDB 클라이언트 생성
const dynamoDB = new AWS.DynamoDB.DocumentClient();

module.exports = dynamoDB;
