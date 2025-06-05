const express = require('express');
const salaryController = require('../controllers/SalaryProcessController');


const router = express.Router();

router.route('/salary-calculate').get(salaryController.salarycalculate).post(salaryController.savesalary);
router.route('/salary-data').get(salaryController.getAdditionalData);


module.exports = router;
