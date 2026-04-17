const express = require('express');
const router = express.Router();
const autoNotificationController = require('../controllers/autoNotification.controller');

router.post('/homework-reminders', autoNotificationController.sendHomeworkReminder);
router.post('/fees-alerts', autoNotificationController.sendFeesAlert);
router.post('/exam-alerts', autoNotificationController.sendExamDateAlert);

module.exports = router;
