const express = require("express");
const requisitionController = require("../controllers/purchaseOrder");

const router = express.Router();

router
  .route("/")
  .get(requisitionController.getAllRequisition)
  .post(requisitionController.createOpening);

router.route("/additional-data").get(requisitionController.getAdditionalData);

router.route("/ope-ningb-alance").get(requisitionController.OpeningValue);

router.route("/chat-bot-icon").get(requisitionController.userValue);

router
  .route("/purchase-tax-cal-by-hsn")
  .post(requisitionController.OrderPurchaseTaxCalByHsn);

router
  .route("/purchase_order_with_requisition/:code")
  .get(requisitionController.OrderPurchasewithRequisition);

router
  .route("/additional-data-of-customer-other-sauda")
  .get(requisitionController.getAllSaudaofCustomer);

router
  .route("/additional-data-of-hsn/:code")
  .get(requisitionController.getHsnForItem);

// Purchase Register
router
  .route("/get-pending-indent/")
  .get(requisitionController.getPendingIndent);
router
  .route("/get-all-indent-by-week")
  .get(requisitionController.getAllPendingIndentByWeek);

//pending indent
router.route("/get-all-indent").get(requisitionController.getAllIndentRegister);
router
  .route("/get-all-indent-by-week")
  .get(requisitionController.getAllIndentRegisterByWeek);

router.route("/pdf:code").get(requisitionController.downloadPDF);
//purchase order
router
  .route("/get-all-purchase-order")
  .get(requisitionController.getAllPurchaseOrder);
router
  .route("/get-all-pending-purchase-order-by-week")
  .get(requisitionController.getAllPurchaseOrderByWeek);

// pending po for gate pass register
router
  .route("/get-pending-po-gatepass")
  .get(requisitionController.getAllPendingGatePass);
router
  .route("/get-all-pending-po-gatepass-by-week")
  .get(requisitionController.getAllPendingGprByWeek);

// pending po for mrir
router
  .route("/get-pending-po-mrir")
  .get(requisitionController.getAllPendingMrir);
router
  .route("/get-all-pending-Mrir-by-week")
  .get(requisitionController.getAllPendingMrirByWeek);

// pending po for mrir
router.route("/get-mrir-register").get(requisitionController.getAllMrir);
router.route("/get-Mrir-by-week").get(requisitionController.getAllMrirByWeek);
router
  .route("/:code")
  .get(requisitionController.getReqData)
  .patch(requisitionController.updateOpening)
  .delete(requisitionController.deleteOpening);

module.exports = router;
