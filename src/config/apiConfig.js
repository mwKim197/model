const DEV_API_BASE =
    'https://w3e145ynx4.execute-api.ap-northeast-2.amazonaws.com';

const PROD_API_BASE =
    'https://api.narrowroad-model.com';

const requestedEnvironment = (
    process.env.MODEL_ENV || process.env.NODE_ENV || 'production'
).trim().toLowerCase();

const runtimeEnvironment = requestedEnvironment === 'development'
    ? 'development'
    : 'production';

const isDevelopment = runtimeEnvironment === 'development';

const API_BASE_URL = isDevelopment
    ? DEV_API_BASE
    : PROD_API_BASE;

console.log(
    `[API] ${isDevelopment ? 'development' : 'production'}: ${API_BASE_URL}`
);

module.exports = {
    API_BASE_URL,
    isDevelopment,
    runtimeEnvironment,
};
