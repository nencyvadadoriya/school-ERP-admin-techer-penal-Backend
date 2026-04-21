const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const StudentLeave = require('../backend/models/StudentLeave');
const TeacherLeave = require('../backend/models/TeacherLeave');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const sPending = await StudentLeave.countDocuments({ status: 'Pending', is_delete: false });
    const sAll = await StudentLeave.countDocuments({ is_delete: false });
    const sStatus = await StudentLeave.distinct('status', { is_delete: false });

    const tPending = await TeacherLeave.countDocuments({ status: 'Pending', is_delete: false });
    const tAll = await TeacherLeave.countDocuments({ is_delete: false });
    const tStatus = await TeacherLeave.distinct('status', { is_delete: false });

    console.log('Student Leaves:', { pending: sPending, total: sAll, statuses: sStatus });
    console.log('Teacher Leaves:', { pending: tPending, total: tAll, statuses: tStatus });

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

check();
