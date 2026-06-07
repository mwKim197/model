const { allProduct } = require('../aws/db/utils/getMenu');
const { serialCommCom1, serialCommCom3, serialCommCom4 } = require('../serial/serialCommManager');
const CupModule = require('../serial/portProcesses/CupModule');
const IceModule = require('../serial/portProcesses/IceModule');
const OrderModule = require('../serial/portProcesses/OrderModule');
const SerialDataManager = require('./serialDataManager');
const eventEmitter = require('./events');
const { createSerialMachineState } = require('./serial-machine-state');
const { createSerialDispense } = require('./serial-dispense');
const { createSerialOrderProcess } = require('./serial-order-process');
const { createSerialAdminOrder } = require('./serial-admin-order');

const Cup = new CupModule(serialCommCom4);
const Ice = new IceModule(serialCommCom3);
const Order = new OrderModule(serialCommCom1);
const McData = new SerialDataManager(serialCommCom1);
const state = { menuName: '' };

const {
    checkCupSensor,
    checkAutoOperationState
} = createSerialMachineState({
    McData,
    eventEmitter,
    state
});

const {
    dispenseCup,
    dispenseIce,
    dispenseCoffee,
    dispenseGarucha,
    dispenseSyrup
} = createSerialDispense({
    Cup,
    Ice,
    Order,
    McData,
    eventEmitter,
    state,
    checkAutoOperationState
});

const {
    startOrder,
    useWash
} = createSerialOrderProcess({
    allProduct,
    eventEmitter,
    state,
    Order,
    dispenseCup,
    dispenseIce,
    dispenseCoffee,
    dispenseGarucha,
    dispenseSyrup,
    checkCupSensor,
    checkAutoOperationState
});

const {
    adminDrinkOrder,
    adminCupOrder,
    adminIceOrder,
    adminUseWash,
    coffeePreheating,
    extractorHome
} = createSerialAdminOrder({
    Cup,
    Ice,
    Order,
    eventEmitter,
    state,
    dispenseCoffee,
    dispenseGarucha,
    dispenseSyrup,
    checkCupSensor,
    checkAutoOperationState
});

module.exports = {
    startOrder,
    dispenseCup,
    dispenseIce,
    dispenseCoffee,
    useWash,
    adminDrinkOrder,
    adminCupOrder,
    adminIceOrder,
    adminUseWash,
    coffeePreheating,
    extractorHome
};
