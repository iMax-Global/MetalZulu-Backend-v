const express = require("express");
const weightBridgeInwardController = require("../controllers/weightBridgeInwardController");

const router = express.Router();

router.route("/").get(weightBridgeInwardController.getAllBevarage);

router.route("/create-inward").post(weightBridgeInwardController.createInward);

router
  .route("/additional-data")
  .get(weightBridgeInwardController.getAdditionalData);

router
  .route("/invoice-data/:code")
  .get(weightBridgeInwardController.getInvoiceData);

router
  .route("/view-additional-data")
  .get(weightBridgeInwardController.getviewAdditionalData);
router.route("/chat-bot-icon").get(weightBridgeInwardController.userValue);

router
  .route("/:code")
  .get(weightBridgeInwardController.getSingleBevarage)
  .patch(weightBridgeInwardController.updateRecord)
  .delete(weightBridgeInwardController.deleteRecord);

module.exports = router;
