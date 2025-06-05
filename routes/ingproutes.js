const express = require("express");
const VoucherController = require("../controllers/inwardgpController");

const router = express.Router();

// router.route('/').get(VoucherController.getAllVoucher)

// router.route('/create-voucher').post(VoucherController.createVoucher);

router.route("/ingpdat").get(VoucherController.inwardtabledat);
router.route("/pdf:code").get(VoucherController.downloadPDF);
router.route("/gpdatain").get(VoucherController.getGatePassDataInward);

///Register
router.route("/gate-pass").get(VoucherController.getAllGate1);
router.route("/gate-pass-regbyweek").get(VoucherController.getAllGate1Week);

////////////////////

router.route("/gate-pass-in").get(VoucherController.getAllGate1In);
router
  .route("/gate-pass-regbyweek-in")
  .get(VoucherController.getAllgetAllGate1MrirByWeekIn);

///////////////////////

router.route("/gate-pass-out").get(VoucherController.getAllGate1Out);
router
  .route("/gate-pass-regbyweek-out")
  .get(VoucherController.getAllGate1Outweek);

router.route("/inwarddetail").get(VoucherController.getAccGroup);
router
  .route("/inwarddetail-detailtable/:code")
  .get(VoucherController.getDeatilOfPo);
router
  .route("/additional-data-of-po")
  .get(VoucherController.getAllSaudaofCustomer);
router.route("/saved").post(VoucherController.handleSave);
router
  .route("/:code")
  // .get(VoucherController.getVoucherData)
  // .patch(VoucherController.updateVoucher)
  .delete(VoucherController.deleteReturn);

module.exports = router;
