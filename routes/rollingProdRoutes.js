const express = require("express");
const stockController = require("../controllers/RollingProductionController");

const router = express.Router();

router
  .route("/")
  .get(stockController.getAllRequisition)
  .post(stockController.createOpening);

router.route("/additional-data").get(stockController.getAdditionalData);
// router.route("/ope-ningb-alance").get(stockController.OpeningValue);
router.route("/chat-bot-icon").get(stockController.userValue);
router.route("/additional-data-of-meter/:code").get(stockController.getRate);
router
  .route("/additional-data-of-hsn/:code")
  .get(stockController.getHsnForItem);
router
  .route("/:code")
  .get(stockController.getReqData)
  .patch(stockController.updateOpening)
  .delete(stockController.deleteprod);

module.exports = router;
