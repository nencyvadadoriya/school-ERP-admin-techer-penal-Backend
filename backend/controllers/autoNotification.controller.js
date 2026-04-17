const Notification = require('../models/Notification');
const Homework = require('../models/Homework');
const Fees = require('../models/Fees');
const Exam = require('../models/Exam');
const Student = require('../models/Student');

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
        await Notification.create({
          title,
          message,
          recipient_type: 'Student',
          recipient_id: student._id
        });

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

      await Notification.create({
        title,
        message,
        recipient_type: 'Student',
        recipient_id: fee.student_id._id
      });

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

        await Notification.create({
          title,
          message,
          recipient_type: 'Student',
          recipient_id: student._id
        });

        await sendExternalNotification('EMAIL', student.email, title, message);
      }
    }

    res.status(200).json({ message: 'Exam date alerts processed successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
