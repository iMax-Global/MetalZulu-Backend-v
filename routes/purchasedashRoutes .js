const express = require("express");
const salesDashbord = require("../controllers/purchaseDashbord");

const router = express.Router();

router.route("/dash-board").get(salesDashbord.getDashboard);

// router
//   .route('/:code')
//   .get(customerMasterController.getCustomer)
//   .patch(customerMasterController.updateCustomer)
//   .delete(customerMasterController.deleteCustomer);

module.exports = router;
