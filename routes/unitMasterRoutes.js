const express = require("express");
const cityMasterController = require("../controllers/unitMasterController");

const router = express.Router();

router.route("/").get(cityMasterController.getAllCity);

router.route("/create-city").post(cityMasterController.createCity);

router.route("/additional-data").get(cityMasterController.getAdditionalData);

router
  .route("/:code")
  .get(cityMasterController.getCityData)
  .patch(cityMasterController.updateCity)
  .delete(cityMasterController.deleteCity);

module.exports = router;
