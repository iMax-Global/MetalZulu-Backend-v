const express = require('express');
const subscriberDashboardController = require('../controllers/subscriberDashboardController');

const router = express.Router();

router.route('/subscriber-data').get(subscriberDashboardController.dashboarddata)

module.exports = router;
