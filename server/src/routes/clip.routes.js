const crypto = require('crypto');
const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');

const router = express.Router();

// --- Utilidades ---

// Confirmado con notificaciones reales (Postback Webhook, Sep 2026) que el
// payload de Clip trae: id, tip, term, last4, amount, issuer, status,
// user_id, currency, latitude, longitude, receipt_no, merch_inv_id,
// payment_date (timestamp unix en segundos), merchant_name, transaction_id,
// src_transaction_id. Clip no manda un campo de "metodo de pago" explicito;
// una venta marcada como efectivo llega con last4 "0000" e issuer vacio,
// mientras que una venta con tarjeta trae el banco emisor en issuer.
function extractFields(payload) {
  const body = payload?.data || payload?.transaction || payload || {};

  const pick = (...keys) => {
    for (const key of keys) {
      if (body[key] !== undefined && body[key] !== null) return body[key];
    }
    return null;
  };

  const parseDate = (dateRaw) => {
    if (!dateRaw) return new Date();
    if (/^\d+$/.test(String(dateRaw))) {
      // timestamp unix en segundos (formato usado por Clip en payment_date)
      return new Date(Number(dateRaw) * 1000);
    }
    const parsed = new Date(dateRaw);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const amountRaw = pick('amount', 'monto', 'total', 'amount_total');
  const dateRaw = pick('payment_date', 'created_at', 'date', 'fecha', 'transaction_date', 'timestamp');
  const explicitMethod = pick('payment_method', 'metodo_pago', 'payment_type');
  const issuer = pick('issuer');

  return {
    clipTransactionId: pick('transaction_id', 'id', 'payment_id') ? String(pick('transaction_id', 'id', 'payment_id')) : null,
    receiptNumber: pick('receipt_no', 'receipt_number', 'folio', 'receipt') ? String(pick('receipt_no', 'receipt_number', 'folio', 'receipt')) : null,
    paymentRequestCode: pick('payment_request_code') ? String(pick('payment_request_code')) : null,
    amount: amountRaw !== null ? Number(amountRaw) : null,
    currency: pick('currency', 'moneda') || 'MXN',
    status: pick('status', 'estado') ? String(pick('status', 'estado')) : null,
    paymentMethod: explicitMethod ? String(explicitMethod) : issuer ? 'CARD' : 'CASH',
    occurredAt: parseDate(dateRaw),
  };
}

function isValidWebhookRequest(req) {
  const secret = process.env.CLIP_WEBHOOK_SECRET;
  if (!secret) return true; // sin secreto configurado, no se valida (solo para pruebas locales)

  const headerName = (process.env.CLIP_WEBHOOK_SIGNATURE_HEADER || 'x-clip-signature').toLowerCase();
  const received = req.headers[headerName];
  if (!received) return false;

  // Modo 1: el header trae el secreto compartido directamente.
  if (received === secret) return true;

  // Modo 2: el header trae un HMAC-SHA256 del cuerpo crudo, en hex.
  if (req.rawBody) {
    const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(received)));
    } catch {
      return false;
    }
  }

  return false;
}

// Vincula la transaccion a la caja que estaba abierta en ese momento (si hay una).
async function findSessionForDate(date) {
  return prisma.cashSession.findFirst({
    where: {
      openedAt: { lte: date },
      OR: [{ status: 'OPEN' }, { closedAt: { gte: date } }],
    },
    orderBy: { openedAt: 'desc' },
  });
}

// Cuando Clip reporta una venta en efectivo (issuer vacio, ver extractFields)
// con estado pagado, ese dinero sí entra fisicamente a la caja, asi que se
// registra como una entrada automatica en la caja que este abierta en ese
// momento. Se vincula por sourceClipTransactionId para no duplicarlo si
// Clip reenvia la misma notificacion.
async function maybeCreateAutomaticCashMovement(clipTransaction) {
  if (clipTransaction.paymentMethod !== 'CASH') return;
  if (clipTransaction.status !== 'PAID') return;
  if (!clipTransaction.amount || Number(clipTransaction.amount) <= 0) return;

  const existing = await prisma.cashMovement.findUnique({
    where: { sourceClipTransactionId: clipTransaction.id },
  });
  if (existing) return;

  const openSession = await prisma.cashSession.findFirst({ where: { status: 'OPEN' } });
  if (!openSession) return; // no hay caja abierta ahorita, no hay donde sumarlo

  await prisma.cashMovement.create({
    data: {
      sessionId: openSession.id,
      type: 'ENTRADA',
      amount: clipTransaction.amount,
      concept: `Venta en efectivo (Clip)${clipTransaction.receiptNumber ? ' - Folio ' + clipTransaction.receiptNumber : ''}`,
      sourceClipTransactionId: clipTransaction.id,
    },
  });
}

async function upsertClipTransaction(payload, source) {
  const fields = extractFields(payload);
  const session = await findSessionForDate(fields.occurredAt);

  const data = {
    ...fields,
    source,
    rawPayload: payload,
    sessionId: session?.id || null,
  };

  const clipTransaction = fields.clipTransactionId
    ? await prisma.clipTransaction.upsert({
        where: { clipTransactionId: fields.clipTransactionId },
        create: data,
        update: data,
      })
    : await prisma.clipTransaction.create({ data });

  await maybeCreateAutomaticCashMovement(clipTransaction);
  return clipTransaction;
}

// --- Rutas ---

// Webhook publico: Clip llama aqui cada vez que procesa una transaccion.
// Registrar esta URL (https://tu-dominio/api/clip/webhook) en developer.clip.mx.
router.post('/webhook', async (req, res) => {
  if (!isValidWebhookRequest(req)) {
    return res.status(401).json({ error: 'Firma de webhook invalida' });
  }

  try {
    await upsertClipTransaction(req.body, 'webhook');
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error procesando webhook de Clip', err);
    res.status(500).json({ error: 'No se pudo procesar el webhook' });
  }
});

// Sincronizacion manual usando la API de Transacciones de Clip como respaldo,
// por si el webhook aun no esta configurado o se perdio algun evento.
router.post('/sync', requireAuth, requireAdmin, async (req, res) => {
  const apiKey = process.env.CLIP_API_KEY;
  const apiSecret = process.env.CLIP_API_SECRET;
  const baseUrl = process.env.CLIP_API_BASE_URL || 'https://api.clip.mx';

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'Configura CLIP_API_KEY y CLIP_API_SECRET para poder sincronizar' });
  }

  const { fromDate, toDate } = req.body || {};
  const to = toDate ? new Date(toDate) : new Date();
  const from = fromDate ? new Date(fromDate) : new Date(to.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Clip usa HTTP Basic Auth: Base64("Clave API:Clave secreta") como token.
    // Ver developer.clip.mx/reference/token-de-autenticacion
    const authToken = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    // Endpoint de referencia; confirma la ruta exacta en developer.clip.mx/reference/transactions
    const url = `${baseUrl}/v2/transactions?from=${from.toISOString()}&to=${to.toISOString()}`;
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${authToken}` },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(502).json({ error: 'Clip respondio con error', detail: text });
    }

    const json = await response.json();
    const transactions = Array.isArray(json) ? json : json.data || json.transactions || [];

    let saved = 0;
    for (const tx of transactions) {
      await upsertClipTransaction(tx, 'sync');
      saved += 1;
    }

    res.json({ ok: true, synced: saved });
  } catch (err) {
    console.error('Error sincronizando con Clip', err);
    res.status(500).json({ error: 'No se pudo sincronizar con Clip' });
  }
});

// Lista de transacciones de Clip recientes (para revision en el panel admin).
router.get('/transactions', requireAuth, async (req, res) => {
  const transactions = await prisma.clipTransaction.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 100,
  });
  res.json(transactions);
});

module.exports = router;
