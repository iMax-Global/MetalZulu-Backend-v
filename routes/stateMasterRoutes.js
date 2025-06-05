const express = require("express");
const stateMasterController = require("../controllers/stateMasterController");

const router = express.Router();

router.route("/").get(stateMasterController.getAllState);

router.route("/create-state").post(stateMasterController.createState);

router.route("/additional-data").get(stateMasterController.getAdditionalData);

router
  .route("/:code")
  .get(stateMasterController.getStateData)
  .patch(stateMasterController.updateState)
  .delete(stateMasterController.deleteState);

module.exports = router;
