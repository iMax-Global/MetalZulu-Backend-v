const express = require("express");
const chargeMasterController = require("../controllers/chargeMasterController");

const router = express.Router();

router.route("/").get(chargeMasterController.getAllAcc);

router.route("/create-charge").post(chargeMasterController.createCharge);

router.route("/sales-data").get(chargeMasterController.getAdditionalData);
router.route("/sales-data/:code").get(chargeMasterController.getParrent);

router
  .route("/:code")
  .get(chargeMasterController.getAccData)
  .patch(chargeMasterController.updateAccount)
  .delete(chargeMasterController.deleteAccount);

module.exports = router;
