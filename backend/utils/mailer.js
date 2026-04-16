const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const transporter = createTransporter();
  return transporter.sendMail({ from, to, subject, text, html });
};

module.exports = { sendMail };
