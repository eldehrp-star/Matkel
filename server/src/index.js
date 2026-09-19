require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const staffRoutes = require('./routes/staff.routes');
const cashRoutes = require('./routes/cash.routes');
const clipRoutes = require('./routes/clip.routes');

const app = express();

app.use(morgan('tiny'));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
  })
);
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/clip', clipRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Matkel POS server escuchando en puerto ${PORT}`);
});
