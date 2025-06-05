const express = require("express");
const localityMasterController = require("../controllers/groupController.js");

const router = express.Router();

router.route("/").get(localityMasterController.getAllLocality);

router.route("/create-locality").post(localityMasterController.createLocality);

router
  .route("/additional-data")
  .get(localityMasterController.getAdditionalData);

router
  .route("/:code")
  .get(localityMasterController.getLocalityData)
  .patch(localityMasterController.updateLocality)
  .delete(localityMasterController.deleteLocality);

module.exports = router;
