require('dotenv').config({path: __dirname + '/.env.local'});
console.log('MODEL_AWS_ACCESS_KEY_ID=', process.env.MODEL_AWS_ACCESS_KEY_ID ? 'SET' : 'MISSING');
console.log('MODEL_AWS_SECRET_ACCESS_KEY=', process.env.MODEL_AWS_SECRET_ACCESS_KEY ? 'SET' : 'MISSING');
console.log('MODEL_AWS_DEFAULT_REGION=', process.env.MODEL_AWS_DEFAULT_REGION || 'MISSING');
console.log('MODEL_SYSTEM_TOKEN=', process.env.MODEL_SYSTEM_TOKEN ? 'SET' : 'MISSING');
