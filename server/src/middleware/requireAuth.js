const { verifyToken } = require('../lib/auth');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  try {
    req.staff = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesion invalida o expirada' });
  }
}

function requireAdmin(req, res, next) {
  if (req.staff?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo un administrador puede hacer esto' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
