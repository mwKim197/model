const log = require("../../logger");

const setUserInfo = async (userInfo) => {
    try {
        const response = await fetch('http://test_user1.narrowroad-model.com:3000/set-user-info',{method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userInfo),});
        console.log(response);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.statusText}`);
        }

        const data = await response.json();
        log.info(data);
        return data;
    } catch (error) {
        log.error(error);
    }
}

module.exports = {setUserInfo};