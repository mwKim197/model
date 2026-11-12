const DEV_API_BASE =
    'https://w3e145ynx4.execute-api.ap-northeast-2.amazonaws.com';

const PROD_API_BASE =
    'https://api.narrowroad-model.com';

const { normalizeEnvironment } = require('./environment');

const runtimeEnvironment = normalizeEnvironment(process.env.MODEL_ENV);

const isDevelopment = runtimeEnvironment === 'development';
const requiresMachineToken = !isDevelopment && require('../../package.json').version !== '2.2.4';

const API_BASE_URL = isDevelopment
    ? DEV_API_BASE
    : PROD_API_BASE;

console.log(
    `[API] ${isDevelopment ? 'development' : 'production'}: ${API_BASE_URL}`
);

module.exports = {
    API_BASE_URL,
    isDevelopment,
    requiresMachineToken,
    runtimeEnvironment,
};
