const serialDataManager = require('./serialDataManager');
const { serialCommCom1 } = require('../serial/serialCommManager');

let pollingInstance = null;

function start() {
    if (!pollingInstance) {
        pollingInstance = new serialDataManager(serialCommCom1);
        pollingInstance.startPolling();
        console.log('Serial Polling Started.');
    } else {
        console.log('Serial Polling already running.');
    }
}

function stop() {
    if (pollingInstance) {
        pollingInstance.stopPolling();
        console.log('Serial Polling Stopped.');
        pollingInstance = null;
    } else {
        console.log('Serial Polling is not running.');
    }
}

function getSerialData(key) {
    return pollingInstance ? pollingInstance.getSerialData(key) : null;
}

module.exports = {
    start,
    stop,
    getSerialData,
};
