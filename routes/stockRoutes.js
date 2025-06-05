const express = require("express");
const stockController = require("../controllers/stock");

const router = express.Router();

//internal requisition
 router.route("/get-all-internal-requisition").get(stockController.getAllInternalRequsition);
 router.route("/get-all-internal-reqbyweek").get(stockController.getAllInternalReqByWeek);

 //Daily issue register
 router.route("/get-daily-issue-register").get(stockController.getdailyissue);
 router.route("/get-daily-issuebyweek").get(stockController.getdailyissueByWeek);

 //Daily issue  return register
 router.route("/get-issue-return-register").get(stockController.getissuereturn);
 router.route("/get-issue-issuereturnbyweek").get(stockController.getissuereturnByWeek);

 //Daily issue register
 router.route("/get-stock-adjustment-register").get(stockController.getstockadjustment);
 router.route("/get-stock-stockadjustmentbyweek").get(stockController.getstockadjustmentByWeek);

 //pending internal requsistion
 router.route("/get-pendingInternalreq-register").get(stockController.getPendingIntReq);
 router.route("/get-pendingInternalreq-registerByWeek").get(stockController.getPendingIntReqByWeek);





module.exports = router;
