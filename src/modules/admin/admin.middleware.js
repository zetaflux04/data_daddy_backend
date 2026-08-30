const jwt = require('jsonwebtoken');
const { config } = require('../../config/env');

const authenticateSuperAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Admin authentication required. Missing or malformed Bearer token.',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    if (decoded.role !== 'superadmin') {
      res.status(403).json({
        success: false,
        message: 'Access denied. Requires superadmin privileges.',
      });
      return;
    }
    req.admin = {
      userId: decoded.userId || 'admin_root',
      email: decoded.email || config.admin.email,
      role: 'superadmin',
      name: decoded.name || 'System Administrator',
    };
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired admin authentication token.',
    });
  }
};

module.exports = { authenticateSuperAdmin };
