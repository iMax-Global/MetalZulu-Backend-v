const express = require('express');
const administratorController = require('../controllers/administratorRightsController');

const router = express.Router();


router.route('/get-user-info').get(administratorController.userValue);
router.route('/get-form-info').get(administratorController.formValue);
router.route('/get-user-info/:id').get(administratorController.moduleValue);


router.route('/save-login-rights').post(administratorController.saveLoginRights);

router.route('/additional-data').get(administratorController.getAdditionalData);

router.route('/login-rights/:user').get(administratorController.getLoginRightsByUser);
// Delete login rights by spec_code (login_code) and form_id
router.route('/login-rights/:specCode/:formId').delete(administratorController.deleteLoginRight);

router.route('/').get(administratorController.getAllTax);
router
  .route('/:code')
  .get(administratorController.getTaxData)
  // .patch(administratorController.updateTax)
  .delete(administratorController.deleteTax);

module.exports = router;
