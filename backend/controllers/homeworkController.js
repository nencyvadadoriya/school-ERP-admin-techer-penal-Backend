const Homework = require('../models/Homework');
const Teacher = require('../models/Teacher');

const normalizeClassCode = (input) => {
  const raw = String(input || '').trim();
  if (!raw) return raw;

  const withoutStdPrefix = raw.replace(/^STD[-\s]*/i, '');
  const unified = withoutStdPrefix.replace(/\s+/g, '-');
  const parts = unified.split('-').map(p => String(p || '').trim()).filter(Boolean);

  if (parts.length >= 3) {
    return `${parts[0]}-${parts[1]}-${parts[2]}`;
  }
  return unified;
};

const createHomework = async (req, res) => {
  try {
    console.log('Creating Homework with payload:', req.body);
    const payload = { ...req.body };
    if (payload.class_code) payload.class_code = normalizeClassCode(payload.class_code);
    const hw = await Homework.create(payload);
    res.status(201).json({ success: true, message: 'Homework created', data: hw });
  } catch (e) { 
    console.error('createHomework Error:', e);
    res.status(500).json({ success: false, message: e.message }); 
  }
};

const getAllHomework = async (req, res) => {
  try {
    const { class_code, teacher_code } = req.query;
    const filter = { is_delete: false };
    if (class_code) filter.class_code = class_code;
    if (teacher_code) filter.teacher_code = teacher_code;
    const data = await Homework.find(filter).sort({ due_date: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getHomeworkById = async (req, res) => {
  try {
    const data = await Homework.findOne({ _id: req.params.id, is_delete: false });
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const updateHomework = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.class_code) payload.class_code = normalizeClassCode(payload.class_code);
    const data = await Homework.findOneAndUpdate({ _id: req.params.id, is_delete: false }, payload, { new: true });
    res.json({ success: true, message: 'Updated', data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteHomework = async (req, res) => {
  try {
    await Homework.findByIdAndUpdate(req.params.id, { is_delete: true });
    res.json({ success: true, message: 'Deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const checkMyHomework = async (req, res) => {
  try {
    const classCode = req.user.class_code;
    if (!classCode) {
      return res.status(400).json({ success: false, message: 'Student class code not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const homework = await Homework.find({
      class_code: classCode,
      assigned_date: { $gte: today },
      is_delete: false,
      is_active: true
    }).lean();

    if (homework.length === 0) {
      return res.json({ success: true, has_new_homework: false, homework: [] });
    }

    const homeworkWithTeachers = await Promise.all(homework.map(async (hw) => {
      const teacher = await Teacher.findOne({ teacher_code: hw.teacher_code }).select('first_name last_name').lean();
      return {
        ...hw,
        teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown Teacher'
      };
    }));

    res.json({
      success: true,
      has_new_homework: true,
      homework: homeworkWithTeachers
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { createHomework, getAllHomework, getHomeworkById, updateHomework, deleteHomework, checkMyHomework };
