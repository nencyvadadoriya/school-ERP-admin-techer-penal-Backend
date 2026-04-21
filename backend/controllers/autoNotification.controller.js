const { sendNotification, broadcastNotification } = require('../utils/socket');
const { sendPushNotification } = require('../utils/webPush');
const { sendFirebaseNotification } = require('../utils/firebase');
const Notification = require('../models/Notification');
const Homework = require('../models/Homework');
const Fees = require('../models/Fees');
const Exam = require('../models/Exam');
const Student = require('../models/Student');

const ExamResult = require('../models/ExamResult');
const Teacher = require('../models/Teacher');

// Mock function for Email/SMS/Push
const sendExternalNotification = async (type, recipient, title, message) => {
  console.log(`[EXTERNAL NOTIFICATION - ${type}] to ${recipient}: ${title} - ${message}`);
  // Implementation for real services like Twilio, SendGrid, Firebase would go here
  return true;
};

exports.sendHomeworkReminder = async (req, res) => {
  try {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingHomework = await Homework.find({
      due_date: { $gte: today, $lte: tomorrow },
      is_delete: false
    });

    for (const hw of pendingHomework) {
      const students = await Student.find({ class_code: hw.class_code, is_delete: false });
      
      for (const student of students) {
        const title = `Homework Reminder: ${hw.title}`;
        const message = `Reminder: Your homework for ${hw.subject_code} is due on ${hw.due_date.toDateString()}.`;

        // Save in-app notification
        const newNotif = await Notification.create({
          title,
          message,
          recipient_type: 'Student',
          recipient_id: student.gr_number || student._id
        });

        // Emit real-time notification
        sendNotification(student.gr_number || student._id, newNotif);

        // Send Push Notification (WebPush)
        if (student.pushSubscription) {
          await sendPushNotification(student.pushSubscription, {
            title,
            body: message,
            icon: '/logo.jpg'
          });
        }

        // Send FCM Notification
        if (student.fcmTokens && student.fcmTokens.length > 0) {
          await sendFirebaseNotification(student.fcmTokens, {
            title,
            body: message
          });
        }

        // Mock external notifications
        await sendExternalNotification('EMAIL', student.email, title, message);
        if (student.phone_number) {
          await sendExternalNotification('SMS', student.phone_number, title, message);
        }
      }
    }

    res.status(200).json({ message: 'Homework reminders processed successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendFeesAlert = async (req, res) => {
  try {
    const overdueFees = await Fees.find({
      status: { $in: ['Pending', 'Partial'] },
      due_date: { $lt: new Date() },
      is_delete: false
    }).populate('student_id');

    for (const fee of overdueFees) {
      if (!fee.student_id) continue;

      const title = 'Fees Due Alert';
      const message = `Your fees of ${fee.total_amount - fee.amount_paid} for ${fee.fee_type} is overdue. Please pay as soon as possible.`;

      const newNotif = await Notification.create({
        title,
        message,
        recipient_type: 'Student',
        recipient_id: fee.student_id.gr_number || fee.student_id._id
      });

      sendNotification(fee.student_id.gr_number || fee.student_id._id, newNotif);

      // Send Push Notification (WebPush)
      if (fee.student_id.pushSubscription) {
        await sendPushNotification(fee.student_id.pushSubscription, {
          title,
          body: message,
          icon: '/logo.jpg'
        });
      }

      // Send FCM Notification
      if (fee.student_id.fcmTokens && fee.student_id.fcmTokens.length > 0) {
        await sendFirebaseNotification(fee.student_id.fcmTokens, {
          title,
          body: message
        });
      }

      await sendExternalNotification('EMAIL', fee.student_id.email, title, message);
    }

    res.status(200).json({ message: 'Fees alerts processed successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendExamDateAlert = async (req, res) => {
  try {
    const upcomingExams = await Exam.find({
      exam_date: { $gte: new Date() },
      is_delete: false
    });

    for (const exam of upcomingExams) {
      const students = await Student.find({ class_code: exam.class_code, is_delete: false });

      for (const student of students) {
        const title = `Upcoming Exam: ${exam.exam_name}`;
        const message = `${exam.exam_name} for ${exam.subject_code} is scheduled on ${exam.exam_date.toDateString()} at ${exam.start_time}.`;

      const newNotif = await Notification.create({
        title,
        message,
        recipient_type: 'Student',
        recipient_id: student._id
      });

      sendNotification(student._id, newNotif);

      // Send Push Notification (WebPush)
      if (student.pushSubscription) {
        await sendPushNotification(student.pushSubscription, {
          title,
          body: message,
          icon: '/logo.jpg'
        });
      }

      // Send FCM Notification
      if (student.fcmTokens && student.fcmTokens.length > 0) {
        await sendFirebaseNotification(student.fcmTokens, {
          title,
          body: message
        });
      }

        await sendExternalNotification('EMAIL', student.email, title, message);
      }
    }

    res.status(200).json({ message: 'Exam date alerts processed successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendResultPublishAlert = async (req, res) => {
  try {
    const students = await Student.find({ is_delete: false });
    for (const student of students) {
      const title = 'Result Published';
      const message = `Your exam results have been published. Please check your dashboard.`;

      const newNotif = await Notification.create({
        title,
        message,
        recipient_type: 'Student',
        recipient_id: student.gr_number || student._id
      });

      sendNotification(student.gr_number || student._id, newNotif);

      // Send Push Notification (WebPush)
      if (student.pushSubscription) {
        await sendPushNotification(student.pushSubscription, {
          title,
          body: message,
          icon: '/logo.jpg'
        });
      }

      // Send FCM Notification
      if (student.fcmTokens && student.fcmTokens.length > 0) {
        await sendFirebaseNotification(student.fcmTokens, {
          title,
          body: message
        });
      }

      await sendExternalNotification('EMAIL', student.email, title, message);
    }
    res.status(200).json({ message: 'Result publish alerts processed successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendHomeworkAssignReminder = async (req, res) => {
  try {
    const teachers = await Teacher.find({ is_delete: false });
    for (const teacher of teachers) {
      const title = 'Homework Assignment Reminder';
      const message = `Please ensure all pending homework assignments are posted for your classes.`;

      const newNotif = await Notification.create({
        title,
        message,
        recipient_type: 'Teacher',
        recipient_id: teacher.teacher_code
      });

      sendNotification(teacher.teacher_code, newNotif);

      // Send Push Notification (WebPush)
      if (teacher.pushSubscription) {
        await sendPushNotification(teacher.pushSubscription, {
          title,
          body: message,
          icon: '/logo.jpg'
        });
      }

      // Send FCM Notification
      if (teacher.fcmTokens && teacher.fcmTokens.length > 0) {
        console.log(`Sending Homework Assign FCM to teacher ${teacher.teacher_code}`);
        await sendFirebaseNotification(teacher.fcmTokens, {
          title,
          body: message
        });
      }

      await sendExternalNotification('EMAIL', teacher.email, title, message);
    }
    res.status(200).json({ message: 'Homework assignment reminders sent to teachers.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendMeetingAlert = async (req, res) => {
  try {
    const teachers = await Teacher.find({ is_delete: false });
    for (const teacher of teachers) {
      const title = 'Meeting Alert';
      const message = `A staff meeting is scheduled. Please check the timetable/calendar for details.`;

      const newNotif = await Notification.create({
        title,
        message,
        recipient_type: 'Teacher',
        recipient_id: teacher.teacher_code
      });

      sendNotification(teacher.teacher_code, newNotif);

      // Send Push Notification (WebPush)
      if (teacher.pushSubscription) {
        await sendPushNotification(teacher.pushSubscription, {
          title,
          body: message,
          icon: '/logo.jpg'
        });
      }

      // Send FCM Notification
      if (teacher.fcmTokens && teacher.fcmTokens.length > 0) {
        console.log(`Sending Homework Assign FCM to teacher ${teacher.teacher_code}`);
        await sendFirebaseNotification(teacher.fcmTokens, {
          title,
          body: message
        });
      }

      await sendExternalNotification('EMAIL', teacher.email, title, message);
    }
    res.status(200).json({ message: 'Meeting alerts sent to teachers.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.sendAdminMessage = async (req, res) => {
  try {
    const teachers = await Teacher.find({ is_delete: false });
    for (const teacher of teachers) {
      const title = 'Important Admin Message';
      const message = `You have a new important message from the administration. Please check your inbox.`;

      const newNotif = await Notification.create({
        title,
        message,
        recipient_type: 'Teacher',
        recipient_id: teacher.teacher_code
      });

      sendNotification(teacher.teacher_code, newNotif);

      // Send Push Notification (WebPush)
      if (teacher.pushSubscription) {
        await sendPushNotification(teacher.pushSubscription, {
          title,
          body: message,
          icon: '/logo.jpg'
        });
      }

      // Send FCM Notification
      if (teacher.fcmTokens && teacher.fcmTokens.length > 0) {
        console.log(`Sending Homework Assign FCM to teacher ${teacher.teacher_code}`);
        await sendFirebaseNotification(teacher.fcmTokens, {
          title,
          body: message
        });
      }

      await sendExternalNotification('EMAIL', teacher.email, title, message);
    }
    res.status(200).json({ message: 'Admin messages sent to teachers.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const { role, teacher_code, gr_number } = req.user;
    let query = { is_delete: false };

    if (role === 'teacher') {
      query.$or = [
        { recipient_type: 'Teacher', recipient_id: teacher_code },
        { recipient_type: 'All' }
      ];
    } else if (role === 'student') {
      query.$or = [
        { recipient_type: 'Student', recipient_id: gr_number },
        { recipient_type: 'All' }
      ];
    } else if (role === 'admin') {
      // Admins see all for now or specific admin notifications if added
      query.recipient_type = 'All';
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { is_read: true });
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;
    const { role, teacher_code, gr_number } = req.user;

    if (role === 'teacher') {
      await Teacher.findOneAndUpdate({ teacher_code }, { pushSubscription: subscription });
    } else if (role === 'student') {
      await Student.findOneAndUpdate({ gr_number }, { pushSubscription: subscription });
    } else {
      return res.status(403).json({ success: false, message: 'Only teachers and students can subscribe to push notifications' });
    }

    res.status(200).json({ success: true, message: 'Push subscription saved successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
