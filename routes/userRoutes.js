const express = require("express");
const authController = require("../controllers/authController");
const administratorRightsController = require("../controllers/administratorRightsController");

const router = express.Router();

router.post("/login",authController.getModulesBySpecCode, authController.login);
router.post("/update-unit", authController.updateUnit);
router.post("/update-usertype", authController.updateUserType);
router.get("/logout", authController.logout);
router.post("/register", authController.Register);
router.get("/checkStatus", authController.isLoggedIn);
router.get("/finYearModule", authController.finYearModule);
router.get("/companyModule", authController.companyModule);
router.get("/siteModule", authController.siteModule);
router.get("/getUserType", authController.getUserType);
router.post("/verify-otp", authController.verifyOtp);
router.get("/getSubscriptionPlanInfo/:code", authController.getSubscriptionPlanInfoprice);
// router.get("/getPlanInfo", authController.getPlanInfo);
router.get("/getPlan", authController.getPlanInfoMessage);
router.post("/payemnrt", authController.payment);

router.patch(
  "/changePassword",
  authController.protect,
  authController.updateMyPassword
);

// Get modules by spec code
// router.get('/modulesBySpecCode', administratorRightsController.getModulesBySpecCode);

module.exports = router;
