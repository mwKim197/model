const dotenv = require('dotenv');
const { execSync } = require('child_process');

// .env 파일 로드
dotenv.config();

// 환경 변수 처리: 공백과 특수 문자가 포함된 변수는 큰따옴표로 감쌈
const envVars = Object.entries(process.env)
    .filter(([key, value]) => key.startsWith('MODEL_'))
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');


console.log("envVars ::: " +envVars);
// cross-env와 electron-builder 실행
execSync(`npx cross-env ${envVars} electron .`, { stdio: 'inherit' });
