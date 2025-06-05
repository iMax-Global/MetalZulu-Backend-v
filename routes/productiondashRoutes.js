const express = require("express");
const salesDashbord = require("../controllers/productionDashbord");

const router = express.Router();

router.route("/dash-board").get(salesDashbord.getDashboard);

// rolling production
//rolling production
router.route("/rolling-production-reg").get(salesDashbord.getrollingProduction);
router
  .route("/rolling_procution-regbyweek")
  .get(salesDashbord.getrollingProductionByWeek);

//rolling production
router.route("/furnace-production-reg").get(salesDashbord.getfurnaceProduction);
router
  .route("/furnace-production-regbyweek")
  .get(salesDashbord.getfurnaceProductionByWeek);

//breakdown feeding
router.route("/breakdown-feed-reg").get(salesDashbord.getBreakdownFeed);
router
  .route("/breakdown-feed-regbyweek")
  .get(salesDashbord.getBreakdownFeedByWeek);
// router
//   .route('/:code')
//   .get(customerMasterController.getCustomer)
//   .patch(customerMasterController.updateCustomer)
//   .delete(customerMasterController.deleteCustomer);

module.exports = router;
