const Notice = require('../models/Notice');
const Notification = require('../models/Notification');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const { sendNoticeEmail } = require('../utils/emailService');
const { sendFirebaseNotification } = require('../utils/firebase');

const createNotice = async (req, res) => {
  try {
    const notice = await Notice.create(req.body);

    // Create notification based on target audience
    let recipient_type = 'All';
    if (notice.target_audience === 'Students') recipient_type = 'Student';
    else if (notice.target_audience === 'Teachers') recipient_type = 'Teacher';

    await Notification.create({
      title: 'New Notice: ' + notice.title,
      message: notice.content,
      recipient_type: recipient_type
    });

    // Get FCM tokens for push notifications
    let fcmTokens = [];
    if (notice.target_audience === 'Teachers' || notice.target_audience === 'All') {
      const teachers = await Teacher.find({ is_delete: false, is_active: true }, 'fcmTokens');
      teachers.forEach(t => {
        if (t.fcmTokens && t.fcmTokens.length > 0) {
          fcmTokens = [...fcmTokens, ...t.fcmTokens];
        }
      });
    }
    
    if (notice.target_audience === 'Students' || notice.target_audience === 'All') {
      const students = await Student.find({ is_delete: false, is_active: true }, 'fcmTokens');
      students.forEach(s => {
        if (s.fcmTokens && s.fcmTokens.length > 0) {
          fcmTokens = [...fcmTokens, ...s.fcmTokens];
        }
      });
    }

    // Send Firebase Push Notifications
    if (fcmTokens.length > 0) {
      sendFirebaseNotification(fcmTokens, {
        title: 'New Notice: ' + notice.title,
        body: notice.content,
        data: { noticeId: notice._id.toString(), type: 'notice' }
      }).catch(err => console.error('Error sending Firebase notice notifications:', err));
    }

    // Send emails to target audience
    let emails = [];
    if (notice.target_audience === 'Teachers' || notice.target_audience === 'All') {
      const teachers = await Teacher.find({ is_delete: false, is_active: true }, 'email');
      emails = [...emails, ...teachers.map(t => t.email)];
    }
    
    if (emails.length > 0) {
      const emailPromises = emails.map(email => 
        sendNoticeEmail(email, {
          title: notice.title,
          content: notice.content,
          priority: notice.priority
        })
      );
      Promise.all(emailPromises).catch(err => console.error('Error sending batch notice emails:', err));
    }

    res.status(201).json({ success: true, message: 'Notice created, push notifications and emails are being sent', data: notice });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getAllNotices = async (req, res) => {
  try {
    const { target_audience } = req.query;
    const filter = { is_delete: false, is_active: true };
    if (target_audience) filter.$or = [{ target_audience }, { target_audience: 'All' }];
    const data = await Notice.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateNotice = async (req, res) => {
  try {
    const data = await Notice.findOneAndUpdate({ _id: req.params.id, is_delete: false }, req.body, { new: true });
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteNotice = async (req, res) => {
  try {
    await Notice.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { createNotice, getAllNotices, updateNotice, deleteNotice };
