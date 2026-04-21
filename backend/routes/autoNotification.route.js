const express = require('express');
const router = express.Router();
const autoNotificationController = require('../controllers/autoNotification.controller');
const { auth } = require('../middleware/auth');

router.post('/homework-reminder', autoNotificationController.sendHomeworkReminder);
router.post('/exam-date', autoNotificationController.sendExamDateAlert);
router.post('/result-publish', autoNotificationController.sendResultPublishAlert);

// Teacher Notifications
router.post('/homework-assign-reminder', autoNotificationController.sendHomeworkAssignReminder);
router.post('/meeting-alert', autoNotificationController.sendMeetingAlert);
router.post('/admin-message', autoNotificationController.sendAdminMessage);

// Fetching notifications
router.get('/my-notifications', auth, autoNotificationController.getMyNotifications);
router.patch('/:id/mark-as-read', auth, autoNotificationController.markAsRead);
router.post('/subscribe-push', auth, autoNotificationController.subscribePush);

module.exports = router;
