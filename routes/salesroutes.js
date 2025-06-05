const express = require('express');
const router = express.Router();

const VoucherController = require('../controllers/salesreturncontroller');



// router.route('/').get(VoucherController.getAllVoucher)

// router.route('/create-voucher').post(VoucherController.createVoucher);

// router.route('/additional-data').get(VoucherController.getAdditionalData);

// router.route('/controldata').get(VoucherController.controldata);
// router.route('/updateheadd').put(VoucherController.updateheadd);

router.route('/salesdata').get(VoucherController.salesdata);

router.route('/invodata').get(VoucherController.invodata);

router.route('/filldatain').put(VoucherController.insertSaleReturn)

router.route('/tabupd').put(VoucherController.insertSaleReturnSizeDetail)
// router
//   .route('/:code')
//   .get(VoucherController.getVoucherData)
//   .patch(VoucherController.updateVoucher)
//   .delete(VoucherController.deleteVoucher);

module.exports = router;
