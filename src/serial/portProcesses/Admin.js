const express = require('express');
const log = require('../../logger');
const serialDataManager = require('../../services/serialDataManager');
const { serialCommCom1 } = require('../serialCommManager');
const {
    adminIceOrder,
    adminCupOrder,
    adminDrinkOrder,
} = require('../../services/serialOrderManager');

const Admin = express.Router();
const polling = new serialDataManager(serialCommCom1);

function registerAdminOrder(path, executeOrder) {
    Admin.post(path, async (req, res) => {
        const { recipe } = req.body || {};
        if (!recipe) {
            return res.status(400).json({
                status: 400,
                result: 'error',
                message: 'Recipe is required.',
            });
        }

        try {
            await polling.stopPolling();
            await executeOrder(recipe);
            await polling.startPolling(serialCommCom1, 10000);

            return res.status(200).json({
                status: 200,
                result: 'success',
                message: 'Command executed successfully',
                data: { menuId: recipe.menuId },
            });
        } catch (error) {
            log.error(`${path} failed: ${error.message}`);
            return res.status(500).json({
                status: 500,
                result: 'error',
                message: 'An error occurred during admin order processing.',
                error: {
                    message: error.message,
                    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
                },
            });
        } finally {
            if (!polling.isPollingActive) {
                try {
                    await polling.startPolling(serialCommCom1, 10000);
                } catch (error) {
                    log.error(`Failed to restart polling after ${path}: ${error.message}`);
                }
            }
        }
    });
}

registerAdminOrder('/serial-admin-ice-order', adminIceOrder);
registerAdminOrder('/serial-admin-cup-order', adminCupOrder);
registerAdminOrder('/serial-admin-drink-order', adminDrinkOrder);

module.exports = Admin;
