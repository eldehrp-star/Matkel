const express = require('express');
const prisma = require('../lib/prisma');
const { comparePin, signToken } = require('../lib/auth');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, pin } = req.body || {};

  if (!username || !pin) {
    return res.status(400).json({ error: 'Falta usuario o PIN' });
  }

  const staff = await prisma.staff.findUnique({ where: { username } });

  if (!staff || !staff.active) {
    return res.status(401).json({ error: 'Usuario o PIN incorrecto' });
  }

  const valid = await comparePin(pin, staff.pinHash);
  if (!valid) {
    return res.status(401).json({ error: 'Usuario o PIN incorrecto' });
  }

  const token = signToken(staff);
  res.json({
    token,
    staff: { id: staff.id, name: staff.name, username: staff.username, role: staff.role },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const staff = await prisma.staff.findUnique({ where: { id: req.staff.sub } });
  if (!staff) return res.status(404).json({ error: 'No encontrado' });
  res.json({ id: staff.id, name: staff.name, username: staff.username, role: staff.role });
});

module.exports = router;
