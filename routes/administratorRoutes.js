const express = require('express');
const administratorController = require('../controllers/administratorController');

const router = express.Router();

// router.route('/')

router.route('/chat-bot-icon').get(administratorController.userValue);

router.route('/create-tax').post(administratorController.createTax);

router.route('/additional-data').get(administratorController.getAdditionalData);

router.route('/').get(administratorController.getAllTax);
router
  .route('/:code')
  .get(administratorController.getTaxData)
  .patch(administratorController.updateTax)
  .delete(administratorController.deleteTax);

module.exports = router;
