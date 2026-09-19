const express = require('express');
const prisma = require('../lib/prisma');
const { comparePin, hashPin, signToken } = require('../lib/auth');
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

router.post('/change-pin', requireAuth, async (req, res) => {
  const { currentPin, newPin } = req.body || {};

  if (!currentPin || !newPin) {
    return res.status(400).json({ error: 'Indica tu PIN actual y el nuevo' });
  }
  if (!/^\d{4,6}$/.test(newPin)) {
    return res.status(400).json({ error: 'El nuevo PIN debe tener entre 4 y 6 digitos' });
  }

  const staff = await prisma.staff.findUnique({ where: { id: req.staff.sub } });
  if (!staff) return res.status(404).json({ error: 'No encontrado' });

  const valid = await comparePin(currentPin, staff.pinHash);
  if (!valid) {
    return res.status(401).json({ error: 'Tu PIN actual no es correcto' });
  }

  await prisma.staff.update({
    where: { id: staff.id },
    data: { pinHash: await hashPin(newPin) },
  });

  res.json({ ok: true });
});

module.exports = router;
