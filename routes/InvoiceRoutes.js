const express = require("express");
const InvoiceController = require("../controllers/InvoiceController");

const router = express.Router();

router.route("/invoice-data").get(InvoiceController.getInvoiceData);
// router.route('/attendance-data').get(itemMasterController.getAttendanceData)

router.route("/").get(InvoiceController.getAllInvoice);
router.route("/create-invoice").post(InvoiceController.createInvoice);
router
  .route("/create-invoice-from-invoice")
  .post(InvoiceController.createInvoiceFromInvoice);
router.route("/pdf:code").get(InvoiceController.downloadPDF);
router.route("/additional-data").get(InvoiceController.getAdditionalData);
router
  .route("/additional-data-of-hsn/:code")
  .get(InvoiceController.getHsnForItem);
router
  .route("/additional-data-of-customer/:code")
  .get(InvoiceController.getcustomer);
router
  .route("/additional-data-of-cust/:code")
  .get(InvoiceController.getdetailsOfCustomer);

router
  .route("/additional-data-of-customer-other-sauda")
  .get(InvoiceController.getAllSaudaofCustomer);

router
  .route("/invoice-tax-cal-by-hsn")
  .post(InvoiceController.OrderPurchaseTaxCalByHsn);
//router.route('/:BookingId').get(InvoiceController.getExternalData)
router.route("/get-all-invoice").get(InvoiceController.getAllInvoiceRegister);
router
  .route("/invoice-tax-cal-by-hsn")
  .post(InvoiceController.OrderPurchaseTaxCalByHsn);

router
  .route("/get-all-invoice-by-week")
  .get(InvoiceController.getAllInvoiceRegisterByWeek);

router
  .route("/invoie-hdr-data-when-invoice-type-with-order")
  .get(InvoiceController.getAllHdr);

router
  .route("/invoie-det-data-when-invoice-type-with-order/")
  .get(InvoiceController.getAllDet);

router
  .route("/:code")
  .get(InvoiceController.getInvoiceData)
  .patch(InvoiceController.updateInvoice)
  .delete(InvoiceController.deleteInvoice);

module.exports = router;
