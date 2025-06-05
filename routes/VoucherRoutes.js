const express = require("express");
const VoucherController = require("../controllers/VoucherController");

const router = express.Router();

router.route("/").get(VoucherController.getAllVoucher);

router.route("/create-voucher").post(VoucherController.createVoucher);
router.route("/pdf:code").get(VoucherController.downloadPDF);
router.route("/additional-data").get(VoucherController.getAdditionalData);
router.route("/chat-bot-icon").get(VoucherController.userValue);
router
  .route("/additional-data-of-cust/:code")
  .get(VoucherController.getHsnForItem);

router
  .route("/:code")
  .get(VoucherController.getVoucherData)
  .patch(VoucherController.updateVoucher)
  .delete(VoucherController.deleteVoucher);

module.exports = router;
