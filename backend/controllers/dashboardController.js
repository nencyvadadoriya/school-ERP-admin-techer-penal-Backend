const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Homework = require('../models/Homework');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Fees = require('../models/Fees');
const StudentLeave = require('../models/StudentLeave');
const TeacherLeave = require('../models/TeacherLeave');
const Notice = require('../models/Notice');

const getAdminDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalStudents,
      totalTeachers,
      totalClasses,
      pendingStudentLeaves,
      pendingTeacherLeaves,
      feesDocs,
      allAttendance,
      students,
      teachers,
      classes,
    ] = await Promise.all([
      Student.countDocuments({ is_delete: false, is_active: true }),
      Teacher.countDocuments({ is_delete: false, is_active: true }),
      Class.countDocuments({ is_delete: false }),
      StudentLeave.countDocuments({ status: 'Pending', is_delete: false }),
      TeacherLeave.countDocuments({ status: 'Pending', is_delete: false }),
      Fees.find({ is_delete: false }),
      Attendance.find({ is_delete: false }).sort({ date: -1 }).limit(30),
      Student.find({ is_delete: false, is_active: true }).select('gender'),
      Teacher.find({ is_delete: false, is_active: true }).select('name'),
      Class.find({ is_delete: false }).select('class_name standard division teacher_code'),
    ]);

    const feesCollected = feesDocs.reduce((s, f) => s + (f.amount_paid || 0), 0);
    const feesPending = feesDocs.reduce((s, f) => s + ((f.total_amount || 0) - (f.amount_paid || 0)), 0);
    const totalFees = feesDocs.reduce((s, f) => s + (f.total_amount || 0), 0);
    const pendingFeesCount = feesDocs.reduce((c, f) => {
      const pendingAmt = (f.total_amount || 0) - (f.amount_paid || 0);
      return c + (pendingAmt > 0 ? 1 : 0);
    }, 0);

    const todayAtt = allAttendance.filter(a => a.date >= today && a.date < tomorrow);
    let present = 0, attTotal = 0;
    todayAtt.forEach(a => {
      a.records.forEach(r => {
        attTotal++;
        if (r.status === 'Present' || r.status === 'Late') present++;
      });
    });
    const attendancePercentage = attTotal > 0 ? Math.round((present / attTotal) * 100) : 0;

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      
      const dayAtt = allAttendance.filter(a => a.date >= d && a.date < nextD);
      let dayPresent = 0, dayAbsent = 0;
      dayAtt.forEach(a => {
        a.records.forEach(r => {
          if (r.status === 'Present' || r.status === 'Late') dayPresent++;
          else dayAbsent++;
        });
      });
      last7Days.push({
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        present: dayPresent,
        absent: dayAbsent
      });
    }

    const genderData = [
      { name: 'Boys', value: students.filter(s => s.gender === 'Male').length, color: '#3b82f6' },
      { name: 'Girls', value: students.filter(s => s.gender === 'Female').length, color: '#ec489a' },
    ];

    const teacherWorkload = teachers.map(t => {
      const teacherClasses = classes.filter(c => c.teacher_code === t.teacher_code);
      return {
        teacher: t.name,
        classes: teacherClasses.length,
        students: 0 
      };
    }).slice(0, 5);

    return res.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        totalClasses,
        attendancePercentage,
        pendingLeaves: pendingStudentLeaves + pendingTeacherLeaves,
        pendingStudentLeaves,
        pendingTeacherLeaves,
        feesCollected,
        feesPending,
        totalFees,
        pendingFeesCount,
        charts: {
          weeklyAttendance: last7Days,
          genderDistribution: genderData,
          teacherWorkload: teacherWorkload
        }
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getTeacherDashboard = async (req, res) => {
  try {
    const teacher_code = req.user.teacher_code;
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const next2Days = new Date(today); next2Days.setDate(next2Days.getDate() + 2);

    const myClasses = await Class.find({ teacher_code, is_delete: false }).lean();
    const classCodes = (myClasses || []).map((c) => String(c?.class_code || '')).filter(Boolean);

    const [upcomingExams, upcomingExamsNext2Days, homeworkGiven, myLeaves, pendingStudentLeaves] = await Promise.all([
      Exam.find({ 
        class_code: { $in: classCodes },
        exam_date: { $gte: today },
        is_delete: false 
      }).limit(5).sort({ exam_date: 1 }),
      Exam.find({
        class_code: { $in: classCodes },
        exam_date: { $gte: today, $lte: next2Days },
        is_delete: false
      }).limit(10).sort({ exam_date: 1 }),
      Homework.countDocuments({ teacher_code, is_delete: false }),
      TeacherLeave.find({ teacher_code, is_delete: false }).sort({ createdAt: -1 }).limit(5),
      StudentLeave.countDocuments({ class_code: { $in: classCodes }, status: 'Pending', is_delete: false }),
    ]);

    let totalStudentsInClassesFinal = 0;
    if (classCodes.length > 0) {
      totalStudentsInClassesFinal = await Student.countDocuments({ 
        class_code: { $in: classCodes }, 
        is_delete: false, 
        is_active: true 
      });

      if (totalStudentsInClassesFinal === 0) {
        const orConditions = myClasses.map(c => ({
          std: String(c.standard),
          $or: [
            { division: String(c.division) },
            { class_name: String(c.division) }
          ]
        }));
        
        if (orConditions.length > 0) {
          totalStudentsInClassesFinal = await Student.countDocuments({
            $or: orConditions,
            is_delete: false,
            is_active: true
          });
        }
      }
    }

    const todayAtt = await Attendance.find({ 
      class_code: { $in: classCodes }, 
      date: { $gte: today, $lt: tomorrow }, 
      is_delete: false 
    });
    const attendancePending = classCodes.filter(cc => !todayAtt.find(a => a.class_code === cc)).length;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);

    const monthlyAttendanceTrend = await Attendance.aggregate([
      { $match: { class_code: { $in: classCodes }, date: { $gte: sixMonthsAgo }, is_delete: false } },
      {
        $group: {
          _id: { month: { $month: "$date" }, year: { $year: "$date" } },
          totalPresent: {
            $sum: {
              $size: {
                $filter: {
                  input: "$records",
                  as: "r",
                  cond: { $in: ["$$r.status", ["Present", "Late"]] }
                }
              }
            }
          },
          totalStudents: { $sum: { $size: "$records" } }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const attendanceTrendData = monthlyAttendanceTrend.map(m => ({
      month: new Date(m._id.year, m._id.month - 1).toLocaleString('default', { month: 'short' }),
      percentage: m.totalStudents > 0 ? Math.round((m.totalPresent / m.totalStudents) * 100) : 0
    }));

    const studentsInClasses = await Student.find({ class_code: { $in: classCodes }, is_delete: false, is_active: true });
    const classStrengthData = classCodes.map(cc => {
      const clsStudents = studentsInClasses.filter(s => s.class_code === cc);
      return {
        class_code: cc,
        total: clsStudents.length,
        boys: clsStudents.filter(s => s.gender?.toLowerCase() === 'male').length,
        girls: clsStudents.filter(s => s.gender?.toLowerCase() === 'female').length
      };
    });

    const examResults = await ExamResult.find({ class_code: { $in: classCodes }, is_delete: false }).populate('exam_id');
    const subjectPerformance = {};
    examResults.forEach(r => {
      const subj = r.exam_id?.subject_code || 'Unknown';
      if (!subjectPerformance[subj]) subjectPerformance[subj] = { total: 0, count: 0 };
      subjectPerformance[subj].total += (r.obtained_marks / r.total_marks) * 100;
      subjectPerformance[subj].count += 1;
    });
    const subjectPerformanceData = Object.keys(subjectPerformance).map(s => ({
      subject: s,
      avgScore: Math.round(subjectPerformance[s].total / subjectPerformance[s].count)
    }));

    const studentPerformance = {};
    examResults.forEach(r => {
      if (!studentPerformance[r.gr_number]) {
        studentPerformance[r.gr_number] = { name: r.student_name, totalPerc: 0, count: 0 };
      }
      studentPerformance[r.gr_number].totalPerc += (r.obtained_marks / r.total_marks) * 100;
      studentPerformance[r.gr_number].count += 1;
    });
    const rankedStudents = Object.values(studentPerformance)
      .map((s) => ({ name: s.name, avg: Math.round(s.totalPerc / s.count) }))
      .sort((a, b) => b.avg - a.avg);
    
    const topStudents = rankedStudents.slice(0, 5);
    const weakStudents = rankedStudents.slice(-5).reverse();

    const homeworkStats = await Homework.aggregate([
      { $match: { class_code: { $in: classCodes }, is_delete: false } },
      { $group: { _id: "$subject_code", count: { $sum: 1 } } }
    ]);
    const homeworkData = homeworkStats.map(h => ({ subject: h._id, count: h.count }));

    const fees = await Fees.find({ gr_number: { $in: studentsInClasses.map(s => s.gr_number) }, is_delete: false });
    const feeStatusData = {
      paid: fees.filter(f => f.status === 'Paid').length,
      partial: fees.filter(f => f.status === 'Partial').length,
      unpaid: fees.filter(f => f.status === 'Unpaid').length
    };

    const studentLeavesTodayCount = await StudentLeave.countDocuments({
      class_code: { $in: classCodes },
      status: 'Approved',
      from_date: { $lte: today },
      to_date: { $gte: today },
      is_delete: false
    });
    const holidayImpactData = [
      { name: 'Attending', value: totalStudentsInClassesFinal - studentLeavesTodayCount },
      { name: 'On Leave', value: studentLeavesTodayCount }
    ];

    return res.json({
      success: true,
      data: { 
        myClasses, 
        totalStudentsInClasses: totalStudentsInClassesFinal, 
        attendancePending, 
        homeworkGiven, 
        upcomingExams,
        upcomingExamsNext2Days,
        myLeaves,
        pendingStudentLeaves,
        charts: {
          attendanceTrend: attendanceTrendData,
          classStrength: classStrengthData,
          subjectPerformance: subjectPerformanceData,
          topStudents,
          weakStudents,
          homeworkData,
          feeStatus: feeStatusData,
          holidayImpact: holidayImpactData
        }
      }
    });
  } catch (e) { 
    return res.status(500).json({ success: false, message: e.message }); 
  }
};

const getStudentDashboard = async (req, res) => {
  try {
    const gr_number = req.user.gr_number;
    const student = await Student.findOne({ gr_number, is_delete: false });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    const today = new Date(); today.setHours(0,0,0,0);

    const [allAtt, homework, fees, upcomingExams, latestResults, notices] = await Promise.all([
      Attendance.find({ class_code: student.class_code, is_delete: false }),
      Homework.find({ class_code: student.class_code, is_delete: false }).sort({ createdAt: -1 }).limit(5),
      Fees.find({ gr_number: student.gr_number, is_delete: false }),
      Exam.find({ class_code: student.class_code, exam_date: { $gte: today }, is_delete: false }).limit(3).sort({ exam_date: 1 }),
      ExamResult.find({ gr_number: student.gr_number, is_delete: false }).populate('exam_id').sort({ createdAt: -1 }).limit(5),
      Notice.find({ is_delete: false, is_active: true }).sort({ createdAt: -1 }).limit(5),
    ]);

    let present = 0, total = 0;
    allAtt.forEach(a => {
      const r = a.records.find(rec => rec.gr_number === student.gr_number);
      if (r) { total++; if (r.status === 'Present' || r.status === 'Late') present++; }
    });
    const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const feeDue = fees.filter(f => f.status !== 'Paid').reduce((s, f) => s + ((f.total_amount || 0) - (f.amount_paid || 0)), 0);

    return res.json({
      success: true,
      data: { student, attendancePercentage, pendingHomework: homework.length, feeDue, upcomingExams, latestResults, notices, recentHomework: homework }
    });
  } catch (e) { 
    return res.status(500).json({ success: false, message: e.message }); 
  }
};

module.exports = { getAdminDashboard, getTeacherDashboard, getStudentDashboard };
