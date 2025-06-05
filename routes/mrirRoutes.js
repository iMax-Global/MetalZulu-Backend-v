const express = require("express");
const requisitionController = require("../controllers/Mrir");

const router = express.Router();

router
  .route("/")
  .get(requisitionController.getAllRequisition)
  .post(requisitionController.createOpening);

router.route("/additional-data").get(requisitionController.getAdditionalData);
router.route("/ope-ningb-alance").get(requisitionController.OpeningValue);
router.route("/pdf:code").get(requisitionController.downloadPDF);
router
  .route("/mrir-tax-cal-by-hsn")
  .post(requisitionController.OrderPurchaseTaxCalByHsn);

router.route("/mrir-with-gate-pass").get(requisitionController.getAllGatePass);
router
  .route("/mrir-with-gate-pass/additional-data/")
  .get(requisitionController.getAllItem);

router
  .route("/purchase_order_with_requisition/:code")
  .get(requisitionController.OrderPurchasewithRequisition);

router
  .route("/additional-data-of-hsn/:code")
  .get(requisitionController.getHsnForItem);

router
  .route("/additional-data-of-mrir-with-mrn")
  .get(requisitionController.getAllSaudaofCustomer);
router
  .route("/:code")
  .get(requisitionController.getReqData)
  .patch(requisitionController.updateOpening)
  .delete(requisitionController.deleteOpening);

module.exports = router;
