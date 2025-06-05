const express = require("express");
const SalesOrderController = require("../controllers/DailyProductionController");

const router = express.Router();

router.route("/").get(SalesOrderController.getAllDailyPlan);

router
  .route("/alldailyproduction")
  .get(SalesOrderController.getAllDailyPlanHdr);

router
  .route("/production-planning-item-detail/:code")
  .get(SalesOrderController.getdetailsOfPlanitem);

router.route("/alldispatch").get(SalesOrderController.getAllDispatch);
// router.route("/create-dispatch").post(SalesOrderController.createDispatch);
router.route("/create-daily").post(SalesOrderController.createDaily);

router
  .route("/create-invoice-from-order")
  .post(SalesOrderController.createInvoiceFromOrder);

router
  .route("/customer-order/:code")
  .get(SalesOrderController.getCustomerOrder);
router.route("/additional-data").get(SalesOrderController.getAdditionalData);
router.route("/pdf:code").post(SalesOrderController.downloadPDF);
router
  .route("/additional-data/:code")
  .get(SalesOrderController.getOrderForInvoice);
router.route("/get-all-order/").get(SalesOrderController.getAllOrderRegister);
router.route("/get-pending-orders/").get(SalesOrderController.getPendingOrders);
router
  .route("/get-all-order-by-week")
  .get(SalesOrderController.getAllOrderRegisterByWeek);
router
  .route("/get-all-order-by-week")
  .get(SalesOrderController.getAllPendingSalesByWeek);
router.route("/get-ledger").get(SalesOrderController.AllLedger);
router
  .route("/additional-data-of-cust/:code")
  .get(SalesOrderController.getdetailsOfCustomer);
router
  .route("/additional-data-of-hsn/:code")
  .get(SalesOrderController.getHsnForItem);
router.route("/level").get(SalesOrderController.getItemValue);
router.route("/rate").get(SalesOrderController.getTotalSqm);
router.route("/amount").get(SalesOrderController.getOrderAmount);
router
  .route("/:code")
  .get(SalesOrderController.getOrderData)
  .patch(SalesOrderController.updateOrder)
  .delete(SalesOrderController.deleteReturn);
module.exports = router;
