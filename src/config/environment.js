const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const VALID_ENVIRONMENTS = new Set(['development', 'production']);

function normalizeEnvironment(value) {
    const environment = (value || '').trim().toLowerCase();

    if (!VALID_ENVIRONMENTS.has(environment)) {
        throw new Error(
            `Invalid MODEL_ENV "${value || ''}". Use development or production.`
        );
    }

    return environment;
}

function loadEnvironment({ isPackaged }) {
    const packagedEnvironment = isPackaged
        ? require('../../package.json').modelEnvironment
        : undefined;
    const requestedEnvironment = normalizeEnvironment(
        packagedEnvironment || process.env.MODEL_ENV || process.env.NODE_ENV
    );
    const envPath = isPackaged
        ? path.join(process.resourcesPath, '.env.local')
        : path.resolve(__dirname, `../../.env.${requestedEnvironment}.local`);

    if (!fs.existsSync(envPath)) {
        throw new Error(`Environment file is missing: ${envPath}`);
    }

    // 선택된 파일이 기존 셸 환경변수보다 우선해야 API와 AWS 대상이 갈라지지 않는다.
    const result = dotenv.config({ path: envPath, override: true });
    if (result.error) {
        throw result.error;
    }

    const fileEnvironment = normalizeEnvironment(process.env.MODEL_ENV);
    if (fileEnvironment !== requestedEnvironment) {
        throw new Error(
            `Environment mismatch: build/start=${requestedEnvironment}, file=${fileEnvironment}`
        );
    }

    process.env.MODEL_ENV = requestedEnvironment;
    process.env.NODE_ENV = requestedEnvironment;

    console.log(`[ENV] ${requestedEnvironment}: ${envPath}`);
    return requestedEnvironment;
}

module.exports = {
    loadEnvironment,
    normalizeEnvironment,
};
