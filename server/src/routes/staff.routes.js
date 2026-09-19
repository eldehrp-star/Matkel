const express = require('express');
const prisma = require('../lib/prisma');
const { hashPin } = require('../lib/auth');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const staff = await prisma.staff.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, username: true, role: true, active: true, createdAt: true },
  });
  res.json(staff);
});

router.post('/', async (req, res) => {
  const { name, username, pin, role } = req.body || {};

  if (!name || !username || !pin) {
    return res.status(400).json({ error: 'Nombre, usuario y PIN son requeridos' });
  }
  if (!/^\d{4,6}$/.test(pin)) {
    return res.status(400).json({ error: 'El PIN debe tener entre 4 y 6 digitos' });
  }

  const exists = await prisma.staff.findUnique({ where: { username } });
  if (exists) {
    return res.status(409).json({ error: 'Ese usuario ya existe' });
  }

  const staff = await prisma.staff.create({
    data: {
      name,
      username,
      pinHash: await hashPin(pin),
      role: role === 'ADMIN' ? 'ADMIN' : 'CAJERO',
    },
  });

  res.status(201).json({ id: staff.id, name: staff.name, username: staff.username, role: staff.role });
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, pin, role, active } = req.body || {};

  const data = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role === 'ADMIN' ? 'ADMIN' : 'CAJERO';
  if (active !== undefined) data.active = Boolean(active);
  if (pin !== undefined) {
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ error: 'El PIN debe tener entre 4 y 6 digitos' });
    }
    data.pinHash = await hashPin(pin);
  }

  const staff = await prisma.staff.update({ where: { id }, data });
  res.json({ id: staff.id, name: staff.name, username: staff.username, role: staff.role, active: staff.active });
});

module.exports = router;
