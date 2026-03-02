const AWS = require('aws-sdk');
const log = require('../logger');

// 환경 변수에서 자격 증명 값 읽어오기
const accessKeyId = process.env.MODEL_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.MODEL_AWS_SECRET_ACCESS_KEY;
const region = process.env.MODEL_AWS_DEFAULT_REGION;

// 방어: 환경변수가 없거나 비어있을 때 경고
if (!accessKeyId || !secretAccessKey || !region) {
  log.warn('[AWS] 일부 환경변수가 설정되지 않았습니다. AWS 호출이 실패할 수 있습니다.');
  log.warn('[AWS] MODEL_AWS_ACCESS_KEY_ID set?', !!accessKeyId);
  log.warn('[AWS] MODEL_AWS_SECRET_ACCESS_KEY set?', !!secretAccessKey);
  log.warn('[AWS] MODEL_AWS_DEFAULT_REGION =', region || 'MISSING');
}

// AWS 자격 증명 설정 (가능한 경우)
if (accessKeyId && secretAccessKey && region) {
  AWS.config.update({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
      region: region,
  });
} else {
  // 여전히 AWS SDK는 환경변수나 기본 프로파일을 통해 시도할 수 있도록 둠
  log.info('[AWS] credentials not fully provided; AWS SDK will use default credential provider chain');
}

// DynamoDB 및 S3 클라이언트 생성
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

// 진단: 런타임에 STS 호출로 자격증명 유효성 검사 (비동기, 실패시 워닝 로그)
try {
  const sts = new AWS.STS();
  sts.getCallerIdentity({}, (err, data) => {
    if (err) {
      log.warn('[AWS] STS getCallerIdentity failed:', err.code || err.message);
    } else {
      log.info('[AWS] STS caller identity OK:', { Account: data.Account, Arn: data.Arn });
    }
  });
} catch (e) {
  log.warn('[AWS] STS check skipped (exception):', e.message);
}

module.exports = { dynamoDB, s3 };
