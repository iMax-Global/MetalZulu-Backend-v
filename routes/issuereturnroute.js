const express = require('express');
const issueReturnController = require('../controllers/issueReturnController');

const router = express.Router();


router.route('/').get(issueReturnController.getAllissues)

router.route('/create-issue').post(issueReturnController.createissue);

router.route('/additional-data').get(issueReturnController.getAdditionalData);
router.route('/table-data/:code').get(issueReturnController.getAdditionalDataofTable);


router
  .route('/:code')
  .get(issueReturnController.getissueData)
  .patch(issueReturnController.updateissue)
  .delete(issueReturnController.deleteissue);

module.exports = router;
