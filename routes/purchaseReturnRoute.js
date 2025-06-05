const express = require("express");
const requisitionController = require("../controllers/purchaseReturnController");

const router = express.Router();

router
  .route("/")
  .get(requisitionController.getAllRequisition)
  .post(requisitionController.createOpening);

// router.route('/').get(requisitionController.getAllRequisition)

router.route("/additional-data").get(requisitionController.getAdditionalData);
router.route("/ope-ningb-alance").get(requisitionController.OpeningValue);

router
  .route("/create-purchase-return")
  .post(requisitionController.createOpening);

router.route("/additional-data").get(requisitionController.getAdditionalData);

router
  .route("/table-data/:code")
  .get(requisitionController.getAdditionalDataofTable);

router.route("/create-purchaserrt").post(requisitionController.createissue);

router
  .route("/additional-data-of-hsn/:code")
  .get(requisitionController.getHsnForItem);

router
  .route("/additional-data-of-item/:code")
  .get(requisitionController.getitemDetail);
router
  .route("/:code")
  .get(requisitionController.getReqData)
  .patch(requisitionController.updateOpening)
  .delete(requisitionController.deleteReturn);

module.exports = router;
