const express = require('express');
const VoucherController = require('../controllers/packingformcontroller');



const router = express.Router();


// router.route('/').get(VoucherController.getAllVoucher)

// router.route('/create-voucher').post(VoucherController.createVoucher);

router.route('/packdat').get(VoucherController.showPacking);
router.route('/packtabdat/:bookingNo').get(VoucherController.getPackTableData);

router.route('/saved').post(VoucherController.handleSave);


router.route('/packorderdat').get(VoucherController.showPackingorder);


// router.route('/saved').post(VoucherController.handleSave);
// router
//   .route('/:code')
//   .get(VoucherController.getVoucherData)
//   .patch(VoucherController.updateVoucher)
//   .delete(VoucherController.deleteVoucher);

module.exports = router;
