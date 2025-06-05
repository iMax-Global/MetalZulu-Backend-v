const express = require("express");
const stockController = require("../controllers/JobWorkInWardController");

const router = express.Router();

router
  .route("/")
  .get(stockController.getAllRequisition)
  .post(stockController.createOpening);

router.route("/additional-data").get(stockController.getAdditionalData);
router.route("/fetchCustomers").get(stockController.fetchCustomers);
router.route("/fetchAddress").get(stockController.fetchAddress);
router.route("/fetchOutwardDetails").get(stockController.fetchOutwardDetails);

router
  .route("/additional-data-vendor")
  .get(stockController.getAdditionalDataVendor);
router.route("/chat-bot-icon").get(stockController.userValue);
router
  .route("/additional-data-invoice")
  .get(stockController.getAdditionalDataInvoice);
// router.route("/ope-ningb-alance").get(stockController.OpeningValue);
router
  .route("/additional-data-of-hsn/:code")
  .get(stockController.getHsnForItem);

router.route("/get-all-invoice").get(stockController.getAllInoice);

router.route("/additional-data-of-meter/:code").get(stockController.getRate);
// Transporter Ledger
router.route("/get-all-ledger").get(stockController.getAllPendingMrir);
router
  .route("/get-all-ledger-by-week")
  .get(stockController.getAllPendingMrirByWeek);

// pending Transport
router
  .route("/pending-for-transporter-invoice")
  .get(stockController.getAllMrir);
router
  .route("/pending-for-transporter-invoice-week")
  .get(stockController.getAllMrirByWeek);
router
  .route("/:code")
  .get(stockController.getReqData)
  .patch(stockController.updateOpening)
  .delete(stockController.deleteprod);

module.exports = router;
