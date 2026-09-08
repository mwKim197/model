const fs = require('fs');
const path = require('path');
const packageJson = require('./package.json');

const environment = (process.env.MODEL_ENV || '').trim().toLowerCase();

if (!['development', 'production'].includes(environment)) {
    throw new Error('MODEL_ENV must be development or production when building.');
}

const envFile = `.env.${environment}.local`;
const envPath = path.resolve(__dirname, envFile);

if (!fs.existsSync(envPath)) {
    throw new Error(`Required build environment file is missing: ${envFile}`);
}

const baseConfig = packageJson.build;

module.exports = {
    ...baseConfig,
    files: [
        ...(baseConfig.files || []),
        '!.env.local',
        '!.env.development.local',
        '!.env.production.local',
        '!work{,/**/*}',
    ],
    extraMetadata: {
        modelEnvironment: environment,
    },
    extraResources: [
        ...(baseConfig.extraResources || []),
        {
            from: envFile,
            to: '.env.local',
        },
    ],
    win: {
        ...baseConfig.win,
        artifactName: `model-${environment === 'development' ? 'dev' : 'prod'}-setup-\${version}.exe`,
    },
};
