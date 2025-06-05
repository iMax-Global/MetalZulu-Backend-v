const express = require("express");
const SalesOrderController = require("../controllers/SalesOrderController");

const router = express.Router();

router.route("/").get(SalesOrderController.getAllOrder);

router.route("/create-sales").post(SalesOrderController.createOrder);

router
  .route("/create-invoice-from-order")
  .post(SalesOrderController.createInvoiceFromOrder);

router
  .route("/customer-order-for-invoice/:code")
  .get(SalesOrderController.getCustumerOrderForInvoice);

router
  .route("/customer-order/:code")
  .get(SalesOrderController.getCustomerOrder);

router.route("/additional-data").get(SalesOrderController.getAdditionalData);
router.route("/pdf:code").get(SalesOrderController.downloadPDF);
router
  .route("/additional-data/:code")
  .get(SalesOrderController.getOrderForInvoice);

router
  .route("/additional-data-of-customer-other-sauda")
  .get(SalesOrderController.getAllSaudaofCustomer);

router.route("/get-all-order/").get(SalesOrderController.getAllOrderRegister);
router.route("/get-pending-orders/").get(SalesOrderController.getPendingOrders);
router
  .route("/get-all-order-by-week")
  .get(SalesOrderController.getAllOrderRegisterByWeek);
router
  .route("/get-all-order-by-week")
  .get(SalesOrderController.getAllPendingSalesByWeek);
router.route("/get-ledger").get(SalesOrderController.AllLedger);
router.route("/order-with-sauda").get(SalesOrderController.getAllGatePass);
router
  .route("/additional-data-of-hsn/:code")
  .get(SalesOrderController.getHsnForItem);

router
  .route("/mrir-with-sauda/additional-data/")
  .get(SalesOrderController.getAllItem);

router
  .route("/mrir-with-sauda/additional-data-itm/")
  .get(SalesOrderController.getAllItemAdd);
router
  .route("/additional-data-of-customer/:code")
  .get(SalesOrderController.getcustomer);

router
  .route("/additional-data-of-item-cat/:code")
  .get(SalesOrderController.getitemcat);

router.route("/chat-bot-icon").get(SalesOrderController.userValue);
router
  .route("/:code")
  .get(SalesOrderController.getOrderData)
  .patch(SalesOrderController.updateOrder)
  .delete(SalesOrderController.deleteOrder);

module.exports = router;
