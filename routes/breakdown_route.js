const express = require('express');
const breakdown_controller = require('../controllers/breakdown_controller');

const router = express.Router();


router.route('/create/breakdown').post(breakdown_controller.insert_breakDown_data)

router.route('/show/breakdown').get(breakdown_controller.getAllBRK)

router.route('/show/reason').get(breakdown_controller.getReason)
router.route('/show/breakdown/:code').delete(breakdown_controller.deleteAccount)

module.exports = router;
