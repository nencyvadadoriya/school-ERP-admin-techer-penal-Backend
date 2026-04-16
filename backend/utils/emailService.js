const nodemailer = require('nodemailer');

const sendTeacherWelcomeEmail = async (teacherData) => {
  const { email, first_name, last_name, password, school_name = 'Our School' } = teacherData;

  // Create a transporter
  // Note: Admin needs to provide these in .env
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
        }
        .header {
          background-color: #3b82f6;
          color: white;
          padding: 30px;
          text-align: center;
        }
        .content {
          padding: 30px;
          line-height: 1.6;
          color: #374151;
        }
        .details-box {
          background-color: #f3f4f6;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #3b82f6;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e0e0e0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #3b82f6;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${school_name}</h1>
        </div>
        <div class="content">
          <p>Dear <strong>${first_name} ${last_name}</strong>,</p>
          <p>You have been successfully added as a teacher at <strong>${school_name}</strong>. We are excited to have you on board!</p>
          
          <p>Your account has been created with the following login credentials:</p>
          
          <div class="details-box">
            <strong>Email:</strong> ${email}<br>
            <strong>Password:</strong> ${password}
          </div>
          
          <p>For security reasons, we recommend that you log in and change your password immediately after your first login.</p>
          
          <center>
            <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Portal</a>
          </center>
          
          <p>If you have any questions, please contact the school administration.</p>
          
          <p>Best Regards,<br>Administration Team</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${school_name}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    console.log(`Attempting to send welcome email to: ${email}`);
    const info = await transporter.sendMail({
      from: `"${school_name}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Welcome to ${school_name} - Your Teacher Account`,
      html: htmlContent,
    });
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed in emailService.js:', error);
    return false;
  }
};

const sendNoticeEmail = async (email, noticeData) => {
  const { title, content, priority, school_name = 'Our School' } = noticeData;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
        }
        .header {
          background-color: ${priority === 'High' || priority === 'Urgent' ? '#ef4444' : '#3b82f6'};
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 30px;
          line-height: 1.6;
          color: #374151;
        }
        .priority-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 15px;
          background-color: ${priority === 'High' || priority === 'Urgent' ? '#fee2e2' : '#dbeafe'};
          color: ${priority === 'High' || priority === 'Urgent' ? '#b91c1c' : '#1e40af'};
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>${title}</h2>
        </div>
        <div class="content">
          <div class="priority-badge">${priority} Priority</div>
          <p>${content}</p>
          
          <p>Best Regards,<br>Administration Team</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${school_name}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"${school_name}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Notice: ${title}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Email sending failed for notice:', error);
    return false;
  }
};

const sendLeaveStatusEmail = async (email, leaveData) => {
  const { name, type, fromDate, toDate, status, reason, rejectionReason, school_name = 'Our School' } = leaveData;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const isApproved = status === 'Approved';
  const statusColor = isApproved ? '#10b981' : '#ef4444'; // Green for approved, Red for rejected

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
        }
        .header {
          background-color: ${statusColor};
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 30px;
          line-height: 1.6;
          color: #374151;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 15px;
          background-color: ${isApproved ? '#d1fae5' : '#fee2e2'};
          color: ${isApproved ? '#065f46' : '#b91c1c'};
        }
        .details {
          background-color: #f9fafb;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
          border-left: 4px solid ${statusColor};
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Leave Request ${status}</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${name}</strong>,</p>
          <p>Your leave request has been <strong>${status.toLowerCase()}</strong>.</p>
          
          <div class="status-badge">${status}</div>
          
          <div class="details">
            <strong>Leave Type:</strong> ${type}<br>
            <strong>Period:</strong> ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}<br>
            <strong>Reason:</strong> ${reason}
          </div>

          ${!isApproved && rejectionReason ? `
          <div style="margin-top: 15px; color: #b91c1c;">
            <strong>Rejection Reason:</strong> ${rejectionReason}
          </div>
          ` : ''}

          <p>Best Regards,<br>Administration Team</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${school_name}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"${school_name}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Leave Request Update: ${status}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Email sending failed for leave status:', error);
    return false;
  }
};

const sendAttendanceReminderEmail = async (email, attendanceData) => {
  const { teacherName, className, date, school_name = 'Our School' } = attendanceData;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
        }
        .header {
          background-color: #f59e0b;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 30px;
          line-height: 1.6;
          color: #374151;
        }
        .reminder-box {
          background-color: #fffbeb;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #f59e0b;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e0e0e0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #f59e0b;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Attendance Reminder</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${teacherName}</strong>,</p>
          <p>This is a friendly reminder that the attendance for your assigned class has not been recorded for today.</p>
          
          <div class="reminder-box">
            <strong>Class:</strong> ${className}<br>
            <strong>Date:</strong> ${new Date(date).toLocaleDateString()}
          </div>
          
          <p>Please log in to the portal and mark the attendance as soon as possible to keep the records updated.</p>
          
          <center>
            <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Portal</a>
          </center>
          
          <p>Best Regards,<br>Administration Team</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${school_name}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"${school_name}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Attendance Reminder - ${new Date(date).toLocaleDateString()}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error('Email sending failed for attendance reminder:', error);
    return false;
  }
};

const sendOTPEmail = async (email, otp, school_name = 'Our School') => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log('Sending OTP email to:', email);
  console.log('Transporter initialized with user:', process.env.SMTP_USER);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          overflow: hidden;
        }
        .header {
          background-color: #f97316;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 30px;
          line-height: 1.6;
          color: #374151;
          text-align: center;
        }
        .otp-code {
          display: inline-block;
          padding: 15px 30px;
          background-color: #fff7ed;
          color: #c2410c;
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 5px;
          border: 2px dashed #f97316;
          border-radius: 8px;
          margin: 20px 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>Password Reset OTP</h2>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You requested to reset your password. Use the following OTP code to proceed:</p>
          <div class="otp-code">${otp}</div>
          <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          <p>Best Regards,<br>Security Team</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${school_name}. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${school_name} Security" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset OTP',
      html: htmlContent,
    });
    console.log('OTP Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending failed for OTP. Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    return false;
  }
};

module.exports = { sendTeacherWelcomeEmail, sendNoticeEmail, sendLeaveStatusEmail, sendAttendanceReminderEmail, sendOTPEmail };
