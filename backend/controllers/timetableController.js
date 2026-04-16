const TimeTable = require('../models/TimeTable');
const Class = require('../models/Class');

// Helper: normalize class code
var  normalizeCode = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Helper: generate variants of a class_code to handle mismatches
// e.g. "STD-1-A-English-Primary-Morning" -> tries to extract "1-A-English"
const getCodeVariants = (code) => {
  const variants = new Set();
  const s = String(code || '').trim();
  variants.add(s);
  variants.add(normalizeCode(s));

  // Strip "STD-" prefix if present
  const withoutSTD = s.replace(/^STD-/i, '');
  variants.add(withoutSTD);
  variants.add(normalizeCode(withoutSTD));

  // Try first 3 dash-parts (standard-division-medium)
  const parts = s.split('-');
  if (parts.length > 3) {
    const short = parts.slice(0, 3).join('-');
    variants.add(short);
    variants.add(normalizeCode(short));
    // Also without STD prefix in short
    const shortNoSTD = withoutSTD.split('-').slice(0, 3).join('-');
    variants.add(shortNoSTD);
    variants.add(normalizeCode(shortNoSTD));
  }

  return Array.from(variants).filter(Boolean);
};

var normalizeCode = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const createOrUpdateTimetable = async (req, res) => {
  try {
    const { class_code, schedule, old_day, old_period_number } = req.body;
    if (!class_code || !schedule || !schedule.length) {
      return res.status(400).json({ success: false, message: 'Class code and schedule are required' });
    }

    // Normalize class_code before saving
    var normalizedClassCode = normalizeCode(class_code);

    let tt = await TimeTable.findOne({
      $or: [{ class_code: normalizedClassCode }, { class_code }],
      is_delete: false
    });

    const getMondayPeriodTime = (doc, periodNumber) => {
      const monday = Array.isArray(doc?.schedule) ? doc.schedule.find((s) => s.day === 'Monday') : null;
      const p = monday && Array.isArray(monday.periods)
        ? monday.periods.find((x) => Number(x.period_number) === Number(periodNumber))
        : null;
      return {
        start_time: p?.start_time,
        end_time: p?.end_time,
      };
    };

    if (!tt) {
      tt = new TimeTable({ class_code: normalizedClassCode, schedule });
      // If created without times for non-Monday, try to inherit from Monday within provided schedule payload
      // (best-effort, no strict validation)
      const mondayPayload = Array.isArray(schedule) ? schedule.find((s) => s?.day === 'Monday') : null;
      for (const dayEntry of tt.schedule || []) {
        if (dayEntry?.day === 'Monday') continue;
        if (!Array.isArray(dayEntry?.periods)) continue;
        for (const p of dayEntry.periods) {
          if (p?.start_time && p?.end_time) continue;
          const mp = mondayPayload && Array.isArray(mondayPayload.periods)
            ? mondayPayload.periods.find((x) => Number(x.period_number) === Number(p?.period_number))
            : null;
          if (mp?.start_time && !p.start_time) p.start_time = mp.start_time;
          if (mp?.end_time && !p.end_time) p.end_time = mp.end_time;
        }
      }
    } else {
      // Ensure existing one is also using normalized code
      tt.class_code = normalizedClassCode;
      for (const newDayEntry of schedule) {
        const targetDay = newDayEntry?.day;
        if (!targetDay) continue;

        const dayIndex = tt.schedule.findIndex(s => s.day === targetDay);
        if (dayIndex > -1) {
          // Merge day-level timings (optional)
          if (newDayEntry?.day_start_time !== undefined) tt.schedule[dayIndex].day_start_time = newDayEntry.day_start_time;
          if (newDayEntry?.day_end_time !== undefined) tt.schedule[dayIndex].day_end_time = newDayEntry.day_end_time;
          if (newDayEntry?.break_start_time !== undefined) tt.schedule[dayIndex].break_start_time = newDayEntry.break_start_time;
          if (newDayEntry?.break_end_time !== undefined) tt.schedule[dayIndex].break_end_time = newDayEntry.break_end_time;

          for (const newPeriod of newDayEntry.periods) {
            const targetPeriodNumber = newPeriod?.period_number;
            if (targetPeriodNumber === undefined || targetPeriodNumber === null) continue;

            // Inherit start/end time from Monday if not provided (weekly default timing)
            if ((!newPeriod.start_time || !newPeriod.end_time) && targetDay !== 'Monday') {
              const mt = getMondayPeriodTime(tt, targetPeriodNumber);
              if (!newPeriod.start_time && mt.start_time) newPeriod.start_time = mt.start_time;
              if (!newPeriod.end_time && mt.end_time) newPeriod.end_time = mt.end_time;
            }

            const periodIndex = tt.schedule[dayIndex].periods.findIndex(
              p => Number(p.period_number) === Number(targetPeriodNumber)
            );
            if (periodIndex > -1) {
              const existingPeriod = tt.schedule[dayIndex].periods[periodIndex];
              // Preserve existing start/end times if omitted in update
              if (!newPeriod.start_time && existingPeriod?.start_time) newPeriod.start_time = existingPeriod.start_time;
              if (!newPeriod.end_time && existingPeriod?.end_time) newPeriod.end_time = existingPeriod.end_time;
              tt.schedule[dayIndex].periods[periodIndex] = { ...existingPeriod.toObject?.() , ...newPeriod };
            } else {
              tt.schedule[dayIndex].periods.push(newPeriod);
            }
          }
          tt.schedule[dayIndex].periods.sort((a, b) => Number(a.period_number) - Number(b.period_number));
        } else {
          tt.schedule.push(newDayEntry);
        }
      }
    }

    if (old_day && (old_period_number !== undefined && old_period_number !== null)) {
      const oldDayIdx = tt.schedule.findIndex((s) => s.day === old_day);
      if (oldDayIdx > -1) {
        tt.schedule[oldDayIdx].periods = (tt.schedule[oldDayIdx].periods || []).filter(
          (p) => Number(p.period_number) !== Number(old_period_number)
        );
        if (tt.schedule[oldDayIdx].periods.length === 0) {
          tt.schedule.splice(oldDayIdx, 1);
        }
      }
    }

    await tt.save();
    res.status(201).json({ success: true, message: 'Timetable saved', data: tt });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getTimetableByClass = async (req, res) => {
  try {
    const { class_code } = req.params;
    const variants = getCodeVariants(class_code);

    // 1. Try exact match first
    let data = await TimeTable.findOne({ class_code, is_delete: false });

    // 2. Try all variants
    if (!data) {
      for (const variant of variants) {
        if (variant === class_code) continue;
        data = await TimeTable.findOne({ class_code: variant, is_delete: false });
        if (data) break;
      }
    }

    // 3. Normalize all timetables and find match
    if (!data) {
      const all = await TimeTable.find({ is_delete: false }).lean();
      const target = normalizeCode(class_code);
      data = all.find(tt => normalizeCode(tt.class_code) === target) || null;
    }

    // 4. Try to find via Class model — resolve actual class_code from DB
    if (!data) {
      const targetNorm = normalizeCode(class_code);
      const allClasses = await Class.find({ is_delete: false }).lean();
      const matchedClass = allClasses.find(c =>
        normalizeCode(c.class_code) === targetNorm ||
        variants.some(v => normalizeCode(v) === normalizeCode(c.class_code))
      );
      if (matchedClass?.class_code) {
        data = await TimeTable.findOne({ class_code: matchedClass.class_code, is_delete: false });
      }
    }

    if (!data) return res.status(404).json({ success: false, message: 'Timetable not found' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getAllTimetables = async (req, res) => {
  try {
    const data = await TimeTable.find({ is_delete: false });
    res.json({ success: true, count: data.length, data });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const deleteTimetableEntry = async (req, res) => {
  try {
    const { class_code, day, period_number } = req.body;
    const tt = await TimeTable.findOne({ class_code, is_delete: false });
    if (!tt) return res.status(404).json({ success: false, message: 'Timetable not found' });

    const dayIndex = tt.schedule.findIndex(s => s.day === day);
    if (dayIndex > -1) {
      tt.schedule[dayIndex].periods = tt.schedule[dayIndex].periods.filter(
        p => String(p.period_number) !== String(period_number)
      );
      if (tt.schedule[dayIndex].periods.length === 0) {
        tt.schedule.splice(dayIndex, 1);
      }
      await tt.save();
      return res.json({ success: true, message: 'Entry deleted' });
    }
    res.status(404).json({ success: false, message: 'Day not found in schedule' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { createOrUpdateTimetable, getTimetableByClass, getAllTimetables, deleteTimetableEntry };