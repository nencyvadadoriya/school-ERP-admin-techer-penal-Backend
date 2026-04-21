const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const http = require('http');
const { initSocket } = require('./utils/socket');
const { setupWebPush } = require('./utils/webPush');
const { setupFirebase } = require('./utils/firebase');
const connectDB = require('./config/database');
const app = express();
const server = http.createServer(app);
initSocket(server);
setupWebPush();
setupFirebase();
connectDB();

const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const homeworkRoutes = require('./routes/homeworkRoutes');
const examRoutes = require('./routes/examRoutes');
const feesRoutes = require('./routes/feesRoutes');
const feesPageSecurityRoutes = require('./routes/feesPageSecurityRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const eventRoutes = require('./routes/eventRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const timetableRoutes = require('./routes/timetableRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const classRoutes = require('./routes/classRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const shiftBreakTimeRoutes = require('./routes/shiftBreakTimeRoutes');
const auditRoutes = require('./routes/auditRoutes');
const predictionRoutes = require('./routes/prediction.route');
const autoNotificationRoutes = require('./routes/autoNotification.route');

// Allow the frontend origin from env or reflect the request origin in dev (safe for local development)
app.use(cors({ origin: process.env.FRONTEND_URL || true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/fees', feesRoutes);
app.use('/api/fees-page-security', feesPageSecurityRoutes);
app.use('/api/notice', noticeRoutes);
app.use('/api/event', eventRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/class', classRoutes);
app.use('/api/subject', subjectRoutes);
app.use('/api/shift-break-time', shiftBreakTimeRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/prediction', predictionRoutes);
app.use('/api/auto-notifications', autoNotificationRoutes);



app.get('/health', (req, res) => res.json({ success: true, message: 'School ERP API running', timestamp: new Date() }));
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({ success: false, message: error.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🎓 School ERP API running on port ${PORT}`));
module.exports = app;
