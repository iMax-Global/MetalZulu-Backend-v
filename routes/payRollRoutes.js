const express = require("express");
const payRollController = require("../controllers/payRollController");

const router = express.Router();

router
  .route("/")
  .get(payRollController.getAllTables);


  
  router.route("/chat-bot-icon").get(payRollController.userValue);
  
  //Allowance Master Routes
  router
  .route("/allowance")
  .get(payRollController.getAllAllowance);
  router.route("/create-allowance").post(payRollController.createAllowance);
  router.route("/update-allowance/:code").patch(payRollController.updateAllowance);
  router.route("/delete-allowance/:code").delete(payRollController.deleteAllowance);
  
  // Shift Master Routes
  router
  .route("/shift")
  .get(payRollController.getAllShift);
  router.route("/create-shift").post(payRollController.createShift);
  router.route("/update-shift/:code").patch(payRollController.updateShift);
  router.route("/delete-shift/:code").delete(payRollController.deleteShift);
  
  // Team Master Routes
  router
  .route("/team")
  .get(payRollController.getAllTeam);
  router
  .route("/team/get-additional-data")
  .get(payRollController.getTeamAdditionalData);
  router.route("/create-team").post(payRollController.createTeam); 
  router.route("/update-team/:code").patch(payRollController.updateTeam);
  router.route("/delete-team/:code").delete(payRollController.deleteTeam);


  //Holiday Master Routes
  router
  .route("/holiday")
  .get(payRollController.getAllHoliday);
  router
  .route("/holiday/get-additional-data")
  .get(payRollController.getHolidayAdditionalData);
  router.route("/create-holiday").post(payRollController.createHoliday); 
  router.route("/update-holiday/:code").patch(payRollController.updateHoliday);
  router.route("/delete-holiday/:code").delete(payRollController.deleteHoliday);
  
  router
  .route('/:slug')
  .get(payRollController.getTableData)
  .post(payRollController.createRow)
  // .patch(payRollController.updateRow)
  .delete(payRollController.deleteRow);




module.exports = router;
