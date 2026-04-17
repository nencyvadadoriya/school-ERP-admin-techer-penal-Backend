const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/prediction.controller');

router.get('/:student_id', predictionController.predictStudentPerformance);

module.exports = router;
