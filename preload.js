const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
    sendCommand: (command) => {
        console.log(`Command received: ${command}`);
        return "Response from Electron";
    },
});
