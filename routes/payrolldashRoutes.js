const express = require("express");
const payRollDashbord = require("../controllers/payRollDashboard");

const router = express.Router();

router.route("/dash-board").get(payRollDashbord.getDashboard);

// router
//   .route('/:code')
//   .get(customerMasterController.getCustomer)
//   .patch(customerMasterController.updateCustomer)
//   .delete(customerMasterController.deleteCustomer);

module.exports = router;
