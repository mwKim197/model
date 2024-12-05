const Serial = require('./SerialPortManager');
const config = require('./config');

// 포트 연결
const serialCommCom1 = new Serial(config.ports[0].path);
const serialCommCom3 = new Serial(config.ports[2].path); // COM3 포트 추가
const serialCommCom4 = new Serial(config.ports[3].path); // COM3 포트 추가

// serialComm 객체를 export
module.exports = { serialCommCom1, serialCommCom3, serialCommCom4 };