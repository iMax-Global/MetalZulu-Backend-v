const express = require("express");
const VoucherController = require("../controllers/controlRoomController");

const router = express.Router();

// router.route('/').get(VoucherController.getAllVoucher)

// router.route('/create-voucher').post(VoucherController.createVoucher);

router.route("/additional-data").get(VoucherController.getAdditionalData);
router.route("/get-customer-data").get(VoucherController.getCustomerData);
router
  .route("/additional-data-of-ledger")
  .get(VoucherController.getAdditionalDataledger);

router
  .route("/additional-data-of-ledger-opening")
  .get(VoucherController.getAdditionalDataledgerTable);

router
  .route("/additional-data-of-trail-opening")
  .get(VoucherController.getAdditionalDataOfTrailTable);

router
  .route("/additional-data-of-trail-opening-withdate")
  .get(VoucherController.getAdditionalDataOfTrailTablewithDate);

router.route("/controldata").get(VoucherController.controldata);

router.route("/update_head").put(VoucherController.update_headd);

router
.route("/additional-data-of-report")
.get(VoucherController.getReport);
router
.route("/additional-data-report-form")
.get(VoucherController.getReportForm);

router
.route("/additional-data-report-form-credit")
.get(VoucherController.getReportDebit);
// router
//   .route('/:code')
//   .get(VoucherController.getVoucherData)
//   .patch(VoucherController.updateVoucher)
//   .delete(VoucherController.deleteVoucher);

module.exports = router;
