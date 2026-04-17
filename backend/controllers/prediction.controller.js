const ExamResult = require('../models/ExamResult');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Subject = require('../models/Subject');

exports.predictStudentPerformance = async (req, res) => {
  try {
    const { student_id } = req.params;

    // Get all exam results for the student
    const results = await ExamResult.find({ student_id, is_delete: false })
      .populate('exam_id')
      .lean();

    if (!results || results.length === 0) {
      return res.status(404).json({ message: 'No exam results found for this student.' });
    }

    // Group results by subject
    const subjectPerformance = {};
    let totalMarksObtained = 0;
    let totalMaxMarks = 0;
    let failedSubjectsCount = 0;

    for (const result of results) {
      const exam = result.exam_id;
      if (!exam) continue;

      const subjectCode = exam.subject_code;
      if (!subjectPerformance[subjectCode]) {
        subjectPerformance[subjectCode] = {
          subject_code: subjectCode,
          total_obtained: 0,
          total_possible: 0,
          exams_count: 0,
          failed_exams: 0
        };
      }

      const marks = result.revised_marks !== null ? result.revised_marks : result.marks_obtained;
      subjectPerformance[subjectCode].total_obtained += marks;
      subjectPerformance[subjectCode].total_possible += exam.total_marks;
      subjectPerformance[subjectCode].exams_count += 1;

      if (marks < exam.passing_marks) {
        subjectPerformance[subjectCode].failed_exams += 1;
      }

      totalMarksObtained += marks;
      totalMaxMarks += exam.total_marks;
    }

    const weakSubjects = [];
    const subjectsList = Object.values(subjectPerformance);

    for (const sub of subjectsList) {
      const percentage = (sub.total_obtained / sub.total_possible) * 100;
      sub.percentage = percentage.toFixed(2);
      
      // If percentage is less than 40% or failed more than 30% of exams in this subject
      if (percentage < 40 || (sub.failed_exams / sub.exams_count) > 0.3) {
        weakSubjects.push({
          subject_code: sub.subject_code,
          percentage: sub.percentage,
          reason: percentage < 40 ? 'Low overall percentage' : 'Frequent failures in exams',
          suggestion: 'Extra practice and focused revision suggested.'
        });
      }

      if (sub.failed_exams > 0) {
        failedSubjectsCount++;
      }
    }

    const overallPercentage = (totalMarksObtained / totalMaxMarks) * 100;
    const prediction = {
      status: overallPercentage >= 35 && failedSubjectsCount === 0 ? 'Pass' : 'At Risk',
      overall_percentage: overallPercentage.toFixed(2),
      weak_subjects: weakSubjects,
      recommendation: weakSubjects.length > 0 
        ? `Focus on ${weakSubjects.map(s => s.subject_code).join(', ')} to improve performance.`
        : 'Maintaining good performance. Keep it up!'
    };

    res.status(200).json(prediction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
