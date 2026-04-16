const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token.',
    });
  }
};

const adminAuth = (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
      });
    }
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Authorization failed.',
    });
  }
};

const teacherAuth = (req, res, next) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Teacher privileges required.',
      });
    }
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Authorization failed.',
    });
  }
};

module.exports = { auth, adminAuth, teacherAuth };
