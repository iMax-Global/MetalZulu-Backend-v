const express = require('express');
const dailyAttController = require('../controllers/dailyAttendanceController');
 const leaveController = require('../controllers/leaveController');

const router = express.Router();

router.route('/daily-attendance').get(dailyAttController.getDailyAttendance).post(dailyAttController.updateAttendance);
router.route('/daily-att-data').get(dailyAttController.getAdditionalData);

router.route('/leave').get(leaveController.getLeaves).post(leaveController.updateLeaves);
router.route('/leave-lov').get(leaveController.getLeaveLov);

module.exports = router;
