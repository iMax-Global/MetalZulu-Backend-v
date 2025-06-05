const express = require('express');
const employeeMasterController = require('../controllers/employeeMasterController');

const router = express.Router();

router.route('/employee-data').get(employeeMasterController.getEmployeeData)
router.route('/attendance-data').get(employeeMasterController.getAttendanceData)

router.route('/').get(employeeMasterController.getAllEmployees).post(employeeMasterController.createEmployee);

router.route('/additional-data').get(employeeMasterController.getAdditionalData);

router
  .route('/:code')
  .get(employeeMasterController.getEmployee)
  .patch(employeeMasterController.updateEmployee)
  .delete(employeeMasterController.deleteEmployee);

module.exports = router;
