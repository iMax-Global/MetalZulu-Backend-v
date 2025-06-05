const express = require('express');
const AdminDashbord = require('../controllers/adminDashbord');

const router = express.Router();




router.route('/dash-board').get(AdminDashbord.getDashboard);
router.route('/get-modules/:spec_code').get(AdminDashbord.getModules);
router.route('/get-forms/:module_id').get(AdminDashbord.getForms);



// router
//   .route('/:code')
//   .get(customerMasterController.getCustomer)
//   .patch(customerMasterController.updateCustomer)
//   .delete(customerMasterController.deleteCustomer);

module.exports = router;
