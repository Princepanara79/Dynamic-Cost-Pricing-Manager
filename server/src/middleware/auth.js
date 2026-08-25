const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, manufacturerId: true, isActive: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient privileges' });
    }
    next();
  };
};

const getTenantContext = (req) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return {
    userId: req.user.id,
    manufacturerId: req.user.manufacturerId,
    role: req.user.role
  };
};

module.exports = { authenticate, authorize, getTenantContext };
