const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('Falta configurar JWT_SECRET en las variables de entorno');
}

function hashPin(pin) {
  return bcrypt.hash(pin, 10);
}

function comparePin(pin, hash) {
  return bcrypt.compare(pin, hash);
}

function signToken(staff) {
  return jwt.sign(
    { sub: staff.id, role: staff.role, name: staff.name, username: staff.username },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { hashPin, comparePin, signToken, verifyToken };
