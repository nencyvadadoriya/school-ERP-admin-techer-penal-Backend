const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const StudentLeave = require('../models/StudentLeave');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const { sendAttendanceReminderEmail } = require('../utils/emailService');

// Mark / Create Attendance
const markAttendance = async (req, res) => {
  try {
    const { class_code, subject_code, teacher_code, date, records } = req.body;
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Upsert for the day
    const existing = await Attendance.findOne({ class_code, date: attendanceDate, is_delete: false });
    if (existing) {
      existing.records = records;
      existing.subject_code = subject_code;
      existing.teacher_code = teacher_code;
      await existing.save();
      return res.json({ success: true, message: 'Attendance updated', data: existing });
    }

    const attendance = await Attendance.create({ class_code, subject_code, teacher_code, date: attendanceDate, records });
    res.status(201).json({ success: true, message: 'Attendance marked', data: attendance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance by class & date range
const getAttendance = async (req, res) => {
  try {
    const { class_code, from, to } = req.query;
    const filter = { is_delete: false };
    if (class_code) filter.class_code = class_code;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const data = await Attendance.find(filter)
      .populate({
        path: 'records.student_id',
        select: 'first_name middle_name last_name roll_no gr_number'
      })
      .sort({ date: -1 });

    // Format the data to include student details in the records
    const formattedData = data.map(att => {
      const attObj = att.toObject();
      attObj.records = attObj.records.map(rec => {
        const student = rec.student_id;
        return {
          ...rec,
          student_id: student?._id || rec.student_id,
          student_name: student ? [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') : 'N/A',
          roll_no: student?.roll_no || 'N/A',
          gr_number: student?.gr_number || rec.gr_number || 'N/A'
        };
      });
      return attObj;
    });

    res.json({ success: true, count: formattedData.length, data: formattedData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get attendance summary for a student
const getStudentAttendance = async (req, res) => {
  try {
    const { student_id, gr_number } = req.query;
    const records = await Attendance.find({ is_delete: false });
    let present = 0, absent = 0, total = 0;
    records.forEach(att => {
      const rec = att.records.find(r => r.gr_number === gr_number || String(r.student_id) === student_id);
      if (rec) {
        total++;
        if (rec.status === 'Present' || rec.status === 'Late') present++;
        else absent++;
      }
    });
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    res.json({ success: true, data: { present, absent, total, percentage } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete
const deleteAttendance = async (req, res) => {
  try {
    await Attendance.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Month-wise summary for a class (per student)
// Query: class_code=...&month=YYYY-MM
const getClassMonthSummary = async (req, res) => {
  try {
    const { class_code, month } = req.query;
    if (!class_code) {
      return res.status(400).json({ success: false, message: 'class_code is required' });
    }
    if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'month is required in format YYYY-MM' });
    }

    const [yStr, mStr] = month.split('-');
    const year = Number(yStr);
    const m = Number(mStr);
    const start = new Date(year, m - 1, 1);
    const end = new Date(year, m, 1);

    const trimmedClassCode = String(class_code).trim();
    console.log('getClassMonthSummary search details:', { 
      original: class_code, 
      trimmed: trimmedClassCode, 
      month, 
      start: start.toISOString(), 
      end: end.toISOString() 
    });

    const normalize = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = normalize(trimmedClassCode);

    console.log('DEBUG: getClassMonthSummary - Normalized Target:', `"${target}"`);

    // Fetch all active students and filter by normalized class_code or specific parts
    const allStudents = await Student.find({ 
      is_delete: false, 
      is_active: true 
    }).select('_id gr_number first_name middle_name last_name roll_no class_code std division').lean();

    // Extract potential standard and division from the teacher's selected class_code
    // Format in screenshot: "STD-1-A-English-Primary-Morning"
    let requestedStd = '';
    let requestedDiv = '';
    const parts = trimmedClassCode.split('-');
    if (parts.length >= 3) {
      requestedStd = String(parts[1]); // "1"
      requestedDiv = String(parts[2]); // "A"
    }

    const students = allStudents.filter(s => {
      const sc = normalize(s.class_code);
      // 1. Exact normalized match
      if (sc === target) return true;
      
      // 2. Component matching
      const sStd = String(s.std || s.standard || '');
      const sDiv = String(s.division || '');
      
      if (requestedStd && requestedDiv) {
        if (sStd === requestedStd && sDiv === requestedDiv) return true;
      }

      // 3. Fallback: Check if student's class_code is a substring or vice versa
      if (sc && target && (sc.includes(target) || target.includes(sc))) return true;
      
      return false;
    });

    console.log(`DEBUG: Found ${students.length} students after component matching`);

    console.log(`Found ${students.length} students for class ${class_code} (normalized search)`);
    if (students.length === 0) {
      // Log some existing students to see what their class_codes look like
      const sampleStudents = await Student.find({ is_delete: false }).limit(5).select('class_code');
      console.log('Sample student class codes in DB:', sampleStudents.map(s => s.class_code));
    }

    const attDocs = await Attendance.find({
      class_code: String(class_code),
      is_delete: false,
      date: { $gte: start, $lt: end },
    }).select('date records');

    const leaveDocs = await StudentLeave.find({
      class_code: String(class_code),
      is_delete: false,
      status: 'Approved',
      from_date: { $lt: end },
      to_date: { $gte: start },
    }).select('gr_number from_date to_date');

    const leaveDaysByGr = {};
    leaveDocs.forEach((l) => {
      const gr = l.gr_number;
      if (!gr) return;
      let d = new Date(l.from_date);
      d.setHours(0, 0, 0, 0);
      const to = new Date(l.to_date);
      to.setHours(0, 0, 0, 0);

      while (d <= to) {
        if (d >= start && d < end) {
          if (!leaveDaysByGr[gr]) leaveDaysByGr[gr] = new Set();
          leaveDaysByGr[gr].add(d.toISOString().slice(0, 10));
        }
        d.setDate(d.getDate() + 1);
      }
    });

    // Handle attendance summary results
    const summaryByGr = {};
    (attDocs || []).forEach((doc) => {
      const ds = new Date(doc.date);
      ds.setHours(0, 0, 0, 0);
      const key = ds.toISOString().slice(0, 10);
      (doc.records || []).forEach((r) => {
        const gr = r.gr_number;
        if (!gr) return;
        if (!summaryByGr[gr]) summaryByGr[gr] = { present: 0, absent: 0, late: 0, excused: 0 };
        
        if (r.status === 'Present') summaryByGr[gr].present++;
        else if (r.status === 'Absent') summaryByGr[gr].absent++;
        else if (r.status === 'Late') summaryByGr[gr].late++;
        else if (r.status === 'Excused') summaryByGr[gr].excused++;
      });
    });

    const summary = students.map((s) => {
      const gr = s.gr_number;
      const stats = summaryByGr[gr] || { present: 0, absent: 0, late: 0, excused: 0 };
      const leaveDays = leaveDaysByGr[gr] ? leaveDaysByGr[gr].size : 0;

      return {
        student_id: s._id,
        gr_number: s.gr_number,
        roll_no: s.roll_no,
        student_name: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' '),
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        excused: stats.excused,
        leaveDays,
      };
    });

    return res.json({ success: true, data: { class_code: String(class_code), month, summary } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get daily attendance for a class & date (for marking)
const getDailyAttendance = async (req, res) => {
  try {
    const { class_code, date } = req.query;
    if (!class_code || !date) {
      return res.status(400).json({ success: false, message: 'class_code and date are required' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // 1. Find the students first
    // We search by class_code directly first, then fallback to standard/division if possible
    let studentQuery = { class_code: class_code, is_delete: false, is_active: true };
    let students = await Student.find(studentQuery)
      .select('_id gr_number first_name middle_name last_name roll_no class_code std division').lean();

    if (students.length === 0) {
      // Fallback: Try to parse class_code and match by components
      // Format: "STD-1-A-English-Primary-Morning" or "1-A-English"
      const parts = class_code.split('-');
      
      // Load the class to get reliable std/division if available
      const classDoc = await mongoose.model('Class').findOne({ class_code, is_delete: false }).lean();
      
      if (classDoc) {
        students = await Student.find({
          std: classDoc.standard,
          $or: [
            { division: classDoc.division },
            { class_name: classDoc.division }
          ],
          is_delete: false,
          is_active: true
        }).select('_id gr_number first_name middle_name last_name roll_no class_code std division').lean();
      } else if (parts.length >= 2) {
        // Last resort: parse from string if classDoc not found
        const std = parts[0] === 'STD' ? parts[1] : parts[0];
        const division = parts[0] === 'STD' ? parts[2] : parts[1];
        students = await Student.find({
          std: std,
          $or: [
            { division: division },
            { class_name: division }
          ],
          is_delete: false,
          is_active: true
        }).select('_id gr_number first_name middle_name last_name roll_no class_code std division').lean();
      }
    }

    // 2. Find existing attendance record
    const attendance = await Attendance.findOne({ class_code, date: attendanceDate, is_delete: false });

    // 3. Merge students with existing records or default to 'Present'
    const records = students.map(s => {
      const existingRecord = attendance?.records.find(r => 
        String(r.student_id) === String(s._id) || r.gr_number === s.gr_number
      );
      return {
        student_id: s._id,
        gr_number: s.gr_number,
        roll_no: s.roll_no,
        student_name: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' '),
        status: existingRecord?.status || 'Present'
      };
    });

    res.json({
      success: true,
      data: {
        class_code,
        date: attendanceDate,
        subject_code: attendance?.subject_code || '',
        records
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check missing attendance and send reminders
const checkMissingAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Get all active classes
    const activeClasses = await Class.find({ is_delete: false, is_active: true });
    
    // 2. Get all attendance records for today
    const todayAttendance = await Attendance.find({
      date: today,
      is_delete: false
    }).select('class_code');

    const markedClassCodes = new Set(todayAttendance.map(a => a.class_code));
    const missingReminders = [];

    for (const cls of activeClasses) {
      if (!markedClassCodes.has(cls.class_code)) {
        // Attendance missing for this class
        if (cls.teacher_code) {
          const teacher = await Teacher.findOne({ 
            teacher_code: cls.teacher_code, 
            is_delete: false, 
            is_active: true 
          });

          if (teacher && teacher.email) {
            await sendAttendanceReminderEmail(teacher.email, {
              teacherName: `${teacher.first_name} ${teacher.last_name}`,
              className: cls.class_code,
              date: today
            });
            missingReminders.push({
              class_code: cls.class_code,
              teacher_email: teacher.email,
              status: 'Reminder Sent'
            });
          } else {
            missingReminders.push({
              class_code: cls.class_code,
              status: 'Teacher Not Found or No Email'
            });
          }
        } else {
          missingReminders.push({
            class_code: cls.class_code,
            status: 'No Teacher Assigned'
          });
        }
      }
    }

    res.json({
      success: true,
      message: `Checked ${activeClasses.length} classes.`,
      missing_count: missingReminders.length,
      details: missingReminders
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Teacher checks their own missing attendance
const checkMyMissingAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const teacherCode = req.user.teacher_code;

    if (!teacherCode) {
      return res.status(400).json({ success: false, message: 'Teacher code not found' });
    }

    // 1. Get classes assigned to this teacher
    const teacherClasses = await Class.find({ 
      teacher_code: teacherCode, 
      is_delete: false, 
      is_active: true 
    });

    if (teacherClasses.length === 0) {
      return res.json({ success: true, has_missing: false, missing_classes: [] });
    }

    // 2. Check attendance for these classes today
    const classCodes = teacherClasses.map(c => c.class_code);
    const todayAttendance = await Attendance.find({
      class_code: { $in: classCodes },
      date: today,
      is_delete: false
    }).select('class_code');

    const markedCodes = new Set(todayAttendance.map(a => a.class_code));
    const missingClasses = teacherClasses
      .filter(c => !markedCodes.has(c.class_code))
      .map(c => c.class_code);

    res.json({
      success: true,
      has_missing: missingClasses.length > 0,
      missing_classes: missingClasses
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { 
  markAttendance, 
  getAttendance, 
  getStudentAttendance, 
  deleteAttendance, 
  getClassMonthSummary, 
  getDailyAttendance,
  checkMissingAttendance,
  checkMyMissingAttendance
};
