const AWS = require('aws-sdk');
const log = require('../logger');

// 환경 변수에서 자격 증명 값 읽어오기
const accessKeyId = process.env.MODEL_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.MODEL_AWS_SECRET_ACCESS_KEY;
const region = process.env.MODEL_AWS_DEFAULT_REGION;
const profile = process.env.MODEL_AWS_PROFILE;

// 구버전 머신의 개발 호환성 테스트에서는 로컬 AWS CLI 개발 프로필을 사용한다.
// 명시적인 Key가 있으면 기존 운영 방식과 동일하게 Key를 우선한다.
const credentials = accessKeyId && secretAccessKey
    ? { accessKeyId, secretAccessKey }
    : profile
        ? new AWS.SharedIniFileCredentials({ profile })
        : undefined;

// AWS 자격 증명 설정
AWS.config.update({
    credentials,
    region: region,
});

log.info(`[AWS] credential source: ${accessKeyId ? 'environment keys' : profile ? `profile:${profile}` : 'default provider chain'}`);

// DynamoDB 클라이언트 생성
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// S3 클라이언트 생성
const s3 = new AWS.S3();

// S3 버킷 이름
const s3BucketName = 'narrowwayco-model-narrow-road';

module.exports = { dynamoDB, s3, s3BucketName };
