const ShiftBreakTime = require('../models/ShiftBreakTime');

const upsertShiftBreakTime = async (req, res) => {
  try {
    const { shift, break_start_time, break_end_time } = req.body;

    if (!shift || !break_start_time || !break_end_time) {
      return res.status(400).json({ success: false, message: 'shift, break_start_time, break_end_time are required' });
    }

    const doc = await ShiftBreakTime.findOneAndUpdate(
      { shift },
      { shift, break_start_time, break_end_time, is_active: true },
      { new: true, upsert: true }
    );

    return res.status(201).json({ success: true, message: 'Shift break time saved', data: doc });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getAllShiftBreakTimes = async (req, res) => {
  try {
    const data = await ShiftBreakTime.find({}).sort({ shift: 1 });
    return res.json({ success: true, count: data.length, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const getShiftBreakTimeByShift = async (req, res) => {
  try {
    const { shift } = req.params;
    const data = await ShiftBreakTime.findOne({ shift });
    if (!data) return res.status(404).json({ success: false, message: 'Shift break time not found' });
    return res.json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { upsertShiftBreakTime, getAllShiftBreakTimes, getShiftBreakTimeByShift };
