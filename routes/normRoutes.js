const express = require('express');
const normController = require('../controllers/normController');

const router = express.Router();
router
  .route('/leave-norms')
  .get(normController.editNorm('leave-norms'), normController.getAllNorms)
  .post(normController.editNorm('leave-norms'), normController.createNorm);
router
  .route('/leave-norms/additional-data')
  .get(normController.editNorm('leave-norms'), normController.getAdditionalData);
router
  .route('/leave-norms/:code')
  .get(normController.editNorm('leave-norms'), normController.getNorm)
  .patch(normController.editNorm('leave-norms'), normController.updateNorm)
  .delete(normController.editNorm('leave-norms'), normController.deleteNorm);

router
  .route('/salary-norms')
  .get(normController.editNorm('salary-norms'), normController.getAllNorms)
  .post(normController.editNorm('salary-norms'), normController.createNorm);
router
  .route('/salary-norms/additional-data')
  .get(normController.editNorm('salary-norms'), normController.getAdditionalData);

  
router
  .route('/salary-norms/:code')
  .get(normController.editNorm('salary-norms'), normController.getNorm)
  .patch(normController.editNorm('salary-norms'), normController.updateNorm)
  .delete(normController.editNorm('salary-norms'), normController.deleteNorm);


 
 
  
router
.route('/salary-advance')
.get(normController.editNorm('salary-advance'), normController.getAllNorms)
.post(normController.editNorm('salary-advance'), normController.createNorm);

router
.route('/salary-advance/additional-data')
.get(normController.editNorm('salary-advance'), normController.getAdditionalData);


  router
  .route('/salary-advance/:code')
  .get(normController.editNorm('salary-advance'), normController.getNorm)
  .patch(normController.editNorm('salary-advance'), normController.updateNorm)
  .delete(normController.editNorm('salary-advance'), normController.deleteNorm);

  module.exports = router;
