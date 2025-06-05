const express = require("express");
const VoucherController = require("../controllers/outwardgatepasscontrolller");

const router = express.Router();

// router.route('/').get(VoucherController.getAllVoucher)

// router.route('/create-voucher').post(VoucherController.createVoucher);

// router.route('/ingpdat').get(VoucherController.inwardtabledat);
router.route("/additional-data").get(VoucherController.getAdditionalData);
router.route("/gpdataout").get(VoucherController.outwardformdata);
router.route("/pdf:code").get(VoucherController.downloadPDF);

router
  .route("/gptabledata/:invoice_code")
  .get(VoucherController.outwardtabledata);
router.route("/savedogdata").post(VoucherController.owgatedata);
router.route("/inwarddetail").get(VoucherController.getAccGroup);
router
  .route("/table-data/:code")
  .get(VoucherController.getAdditionalDataofTable);
router
  .route("/table-item-data/:code")
  .get(VoucherController.getAdditionalDataofTableItem);
// router.route('/saved').post(VoucherController.handleSave);
router
  .route("/:code")

  .delete(VoucherController.deleteReturn);

module.exports = router;
