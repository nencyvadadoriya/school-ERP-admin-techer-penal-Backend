const Subject = require('../models/Subject');

// Create a new subject
exports.createSubject = async (req, res) => {
  try {
    const { subject_code, subject_name, subject_level, std, medium, stream } = req.body;

    const stdNum = Number(std);
    const normalizedSubjectCode = typeof subject_code === 'string' ? subject_code.trim() : subject_code;
    const normalizedStream = typeof stream === 'string' ? stream.trim() : stream;

    const defaultStreamByLevel = {
      Primary: 'Primary',
      Secondary: 'Secondary',
      'Higher Secondary': 'Higher Secondary',
    };

    const finalSubjectCode = stdNum >= 10 && normalizedSubjectCode ? normalizedSubjectCode : undefined;
    const finalStream = normalizedStream ? normalizedStream : (defaultStreamByLevel[subject_level] || undefined);

    // Check if subject_code already exists
    if (finalSubjectCode) {
      const existing = await Subject.findOne({ subject_code: finalSubjectCode, is_delete: false });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Subject code already exists' });
      }
    }

    const newSubject = new Subject({
      subject_code: finalSubjectCode,
      subject_name,
      subject_level,
      std,
      medium,
      stream: finalStream,
    });
    await newSubject.save();

    res.status(201).json({ success: true, message: 'Subject created successfully', data: newSubject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Subject code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkCreateSubjects = async (req, res) => {
  try {
    const { std, medium, subject_level, stream, subjects } = req.body;

    if (!Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ success: false, message: 'subjects array is required' });
    }

    const defaultStreamByLevel = {
      Primary: 'Primary',
      Secondary: 'Secondary',
      'Higher Secondary': 'Higher Secondary',
    };

    const normalizedStd = typeof std === 'string' ? std.trim() : std;
    const normalizedMedium = typeof medium === 'string' ? medium.trim() : medium;
    const normalizedLevel = typeof subject_level === 'string' ? subject_level.trim() : subject_level;
    const normalizedStream = typeof stream === 'string' ? stream.trim() : stream;

    const stdNum = Number(normalizedStd);
    const errors = [];
    const docs = [];
    const seenCodeMedium = new Set();

    subjects.forEach((row, index) => {
      const rawCode = typeof row?.subject_code === 'string' ? row.subject_code.trim() : row?.subject_code;
      const rawName = typeof row?.subject_name === 'string' ? row.subject_name.trim() : row?.subject_name;

      const finalCode = stdNum >= 10 && rawCode ? rawCode : undefined;
      const finalName = rawName;
      const finalStream = normalizedStream ? normalizedStream : (defaultStreamByLevel[normalizedLevel] || undefined);

      if (!normalizedStd || !normalizedMedium || !normalizedLevel) {
        errors.push({ index, message: 'std, medium and subject_level are required' });
        return;
      }

      if (!finalName) {
        errors.push({ index, message: 'subject_name is required' });
        return;
      }

      if (stdNum >= 10 && !finalCode) {
        errors.push({ index, message: 'subject_code is required for class 10-12' });
        return;
      }

      if (stdNum >= 11 && !finalStream) {
        errors.push({ index, message: 'stream is required for class 11-12' });
        return;
      }

      if (finalCode) {
        const key = `${finalCode}__${normalizedMedium}`;
        if (seenCodeMedium.has(key)) {
          errors.push({ index, message: 'Duplicate subject_code in request' });
          return;
        }
        seenCodeMedium.add(key);
      }

      docs.push({
        subject_code: finalCode,
        subject_name: finalName,
        subject_level: normalizedLevel,
        std: String(normalizedStd),
        medium: normalizedMedium,
        stream: finalStream,
      });
    });

    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid subjects to create', errors });
    }

    const codePairs = docs
      .filter((d) => d.subject_code)
      .map((d) => ({ subject_code: d.subject_code, medium: d.medium }));

    if (codePairs.length > 0) {
      const existing = await Subject.find({
        is_delete: false,
        $or: codePairs,
      }).select('_id subject_code medium');

      if (existing.length > 0) {
        const existingSet = new Set(existing.map((e) => `${e.subject_code}__${e.medium}`));
        const remainingDocs = [];
        docs.forEach((d, index) => {
          if (!d.subject_code) {
            remainingDocs.push(d);
            return;
          }
          const key = `${d.subject_code}__${d.medium}`;
          if (existingSet.has(key)) {
            errors.push({ index, message: 'Subject code already exists' });
            return;
          }
          remainingDocs.push(d);
        });
        docs.length = 0;
        docs.push(...remainingDocs);
      }
    }

    if (docs.length === 0) {
      return res.status(400).json({ success: false, message: 'No subjects created', errors });
    }

    let created = [];
    try {
      created = await Subject.insertMany(docs, { ordered: false });
    } catch (error) {
      if (error?.writeErrors && Array.isArray(error.writeErrors)) {
        error.writeErrors.forEach((we) => {
          const idx = we.index;
          errors.push({ index: idx, message: 'Subject code already exists' });
        });
        created = error.insertedDocs || [];
      } else {
        throw error;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Bulk subjects created',
      count: created.length,
      data: created,
      errors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const { subject_level, std, medium, stream, is_active } = req.query;
    const filter = { is_delete: false };

    if (subject_level) filter.subject_level = subject_level;
    if (std) filter.std = std;
    if (medium) filter.medium = medium;
    if (stream) filter.stream = stream;

    const subjects = await Subject.find(filter).sort({ std: 1, subject_name: 1 });
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get subject by ID
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, is_delete: false });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }
    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update subject
exports.updateSubject = async (req, res) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body, 'stream')) {
      if (typeof req.body.stream === 'string' && req.body.stream.trim() === '') {
        req.body.stream = undefined;
      } else if (typeof req.body.stream === 'string') {
        req.body.stream = req.body.stream.trim();
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'subject_code')) {
      if (typeof req.body.subject_code === 'string' && req.body.subject_code.trim() === '') {
        req.body.subject_code = undefined;
      } else if (typeof req.body.subject_code === 'string') {
        req.body.subject_code = req.body.subject_code.trim();
      }
    }

    const updatedSubject = await Subject.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updatedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.status(200).json({ success: true, message: 'Subject updated successfully', data: updatedSubject });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Subject code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Soft delete subject
exports.deleteSubject = async (req, res) => {
  try {
    const deletedSubject = await Subject.findOneAndUpdate(
      { _id: req.params.id, is_delete: false },
      { $set: { is_delete: true } },
      { new: true }
    );

    if (!deletedSubject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    res.status(200).json({ success: true, message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get subjects grouped by std (class-wise)
exports.getSubjectsByClass = async (req, res) => {
  try {
    const { medium, stream } = req.query;
    const filter = { is_delete: false };

    if (medium) filter.medium = medium;
    if (stream) filter.stream = stream;

    const subjects = await Subject.find(filter).sort({ std: 1, subject_name: 1 });

    // Group by std
    const grouped = {};
    subjects.forEach(sub => {
      const key = sub.std;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(sub);
    });

    res.status(200).json({ success: true, data: grouped });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};