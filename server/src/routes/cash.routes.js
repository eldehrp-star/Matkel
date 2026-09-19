const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();
router.use(requireAuth);

function toNumber(decimal) {
  return decimal === null || decimal === undefined ? 0 : Number(decimal);
}

async function computeExpectedCash(sessionId) {
  const session = await prisma.cashSession.findUnique({ where: { id: sessionId } });
  const movements = await prisma.cashMovement.findMany({ where: { sessionId } });

  const entradas = movements
    .filter((m) => m.type === 'ENTRADA')
    .reduce((sum, m) => sum + toNumber(m.amount), 0);
  const salidas = movements
    .filter((m) => m.type === 'SALIDA')
    .reduce((sum, m) => sum + toNumber(m.amount), 0);

  return toNumber(session.openingAmount) + entradas - salidas;
}

async function serializeSession(session) {
  const movements = await prisma.cashMovement.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
    include: { createdBy: { select: { name: true } } },
  });
  const clipTransactions = await prisma.clipTransaction.findMany({
    where: { sessionId: session.id },
    orderBy: { occurredAt: 'asc' },
  });

  const clipTotal = clipTransactions.reduce((sum, t) => sum + toNumber(t.amount), 0);
  const expectedCash = await computeExpectedCash(session.id);

  return {
    id: session.id,
    status: session.status,
    openingAmount: toNumber(session.openingAmount),
    openedAt: session.openedAt,
    closedAt: session.closedAt,
    closingCountedAmount: session.closingCountedAmount !== null ? toNumber(session.closingCountedAmount) : null,
    closingExpectedAmount: session.closingExpectedAmount !== null ? toNumber(session.closingExpectedAmount) : null,
    closingNotes: session.closingNotes,
    expectedCash,
    clipSalesTotal: clipTotal,
    movements: movements.map((m) => ({
      id: m.id,
      type: m.type,
      amount: toNumber(m.amount),
      concept: m.concept,
      createdAt: m.createdAt,
      createdBy: m.createdBy?.name || (m.sourceClipTransactionId ? 'Clip (automático)' : null),
    })),
    clipTransactions: clipTransactions.map((t) => ({
      id: t.id,
      receiptNumber: t.receiptNumber,
      amount: toNumber(t.amount),
      currency: t.currency,
      status: t.status,
      paymentMethod: t.paymentMethod,
      occurredAt: t.occurredAt,
      source: t.source,
    })),
  };
}

// Sesion de caja abierta actualmente (si existe)
router.get('/current', async (req, res) => {
  const session = await prisma.cashSession.findFirst({
    where: { status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
  });
  if (!session) return res.json(null);
  res.json(await serializeSession(session));
});

// Abrir caja
router.post('/open', async (req, res) => {
  const { openingAmount } = req.body || {};
  const amount = Number(openingAmount);

  if (Number.isNaN(amount) || amount < 0) {
    return res.status(400).json({ error: 'Indica el efectivo inicial valido' });
  }

  const existing = await prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
  if (existing) {
    return res.status(409).json({ error: 'Ya hay una caja abierta', session: await serializeSession(existing) });
  }

  const session = await prisma.cashSession.create({
    data: {
      openingAmount: amount,
      openedById: req.staff.sub,
    },
  });

  res.status(201).json(await serializeSession(session));
});

// Registrar entrada o salida de efectivo
router.post('/movements', async (req, res) => {
  const { type, amount, concept } = req.body || {};

  if (!['ENTRADA', 'SALIDA'].includes(type)) {
    return res.status(400).json({ error: 'Tipo invalido, usa ENTRADA o SALIDA' });
  }
  const numericAmount = Number(amount);
  if (Number.isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'Indica un monto valido' });
  }
  if (!concept || !concept.trim()) {
    return res.status(400).json({ error: 'Describe el concepto del movimiento' });
  }

  const session = await prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
  if (!session) {
    return res.status(400).json({ error: 'No hay una caja abierta' });
  }

  await prisma.cashMovement.create({
    data: {
      sessionId: session.id,
      type,
      amount: numericAmount,
      concept: concept.trim(),
      createdById: req.staff.sub,
    },
  });

  res.status(201).json(await serializeSession(session));
});

// Cerrar caja
router.post('/close', async (req, res) => {
  const { countedAmount, notes } = req.body || {};
  const numericCounted = Number(countedAmount);

  if (Number.isNaN(numericCounted) || numericCounted < 0) {
    return res.status(400).json({ error: 'Indica el efectivo contado al cierre' });
  }

  const session = await prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
  if (!session) {
    return res.status(400).json({ error: 'No hay una caja abierta' });
  }

  const expectedCash = await computeExpectedCash(session.id);

  const updated = await prisma.cashSession.update({
    where: { id: session.id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      closedById: req.staff.sub,
      closingCountedAmount: numericCounted,
      closingExpectedAmount: expectedCash,
      closingNotes: notes || null,
    },
  });

  res.json(await serializeSession(updated));
});

// Historial de cajas cerradas
router.get('/history', async (req, res) => {
  const sessions = await prisma.cashSession.findMany({
    where: { status: 'CLOSED' },
    orderBy: { closedAt: 'desc' },
    take: 50,
    include: {
      openedBy: { select: { name: true } },
      closedBy: { select: { name: true } },
    },
  });

  res.json(
    sessions.map((s) => ({
      id: s.id,
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      openedByName: s.openedBy?.name,
      closedByName: s.closedBy?.name,
      openingAmount: toNumber(s.openingAmount),
      closingCountedAmount: toNumber(s.closingCountedAmount),
      closingExpectedAmount: toNumber(s.closingExpectedAmount),
      difference: toNumber(s.closingCountedAmount) - toNumber(s.closingExpectedAmount),
    }))
  );
});

router.get('/history/:id', async (req, res) => {
  const session = await prisma.cashSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: 'No encontrada' });
  res.json(await serializeSession(session));
});

module.exports = router;
