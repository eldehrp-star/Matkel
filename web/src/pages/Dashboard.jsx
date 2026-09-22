import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';
import { formatMoney, formatDateTime } from '../format';

export default function Dashboard() {
  const { token } = useAuth();
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin caja abierta
  const [error, setError] = useState('');
  const [openingAmount, setOpeningAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const data = await api.currentSession(token);
      setSession(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000); // refresca ventas de Clip que lleguen solas
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleOpen(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api.openSession(token, Number(openingAmount));
      setSession(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (session === undefined) {
    return <div className="center-message">Cargando caja...</div>;
  }

  if (session === null) {
    return (
      <div className="card">
        <h2>No hay caja abierta</h2>
        <p className="muted">Cuenta el efectivo que dejas en la caja para iniciar el turno.</p>
        <form onSubmit={handleOpen} className="form">
          <label>
            Efectivo inicial
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Abriendo...' : 'Abrir caja'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <p className="muted small">Caja abierta por {session.openedByName || '—'}</p>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="muted">Efectivo esperado</span>
          <strong>{formatMoney(session.expectedCash)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Ventas Clip (turno)</span>
          <strong>{formatMoney(session.clipSalesTotal)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Efectivo inicial</span>
          <strong>{formatMoney(session.openingAmount)}</strong>
        </div>
        <div className="stat-card">
          <span className="muted">Propinas (turno)</span>
          <strong>{formatMoney(session.clipTipsTotal)}</strong>
        </div>
      </div>

      <div className="action-row">
        <Link to="/movimiento/ENTRADA" className="btn btn-secondary">
          + Entrada de efectivo
        </Link>
        <Link to="/movimiento/SALIDA" className="btn btn-secondary">
          - Salida de efectivo
        </Link>
      </div>
      <Link to="/cierre" className="btn btn-outline block">
        Cerrar caja
      </Link>

      <section className="section">
        <h3>Ventas registradas por Clip</h3>
        {session.clipTransactions.length === 0 && <p className="muted">Aun no llega ninguna venta de Clip en este turno.</p>}
        <ul className="list">
          {session.clipTransactions.map((t) => (
            <li key={t.id}>
              <span>{t.receiptNumber ? `Folio ${t.receiptNumber}` : 'Venta Clip'}</span>
              {t.status === 'PAID' ? (
                <span>
                  {formatMoney(t.amount)}
                  {t.tip > 0 && <span className="muted small"> (propina {formatMoney(t.tip)})</span>}
                </span>
              ) : (
                <span className="negative">Cancelada/reembolsada ({formatMoney(t.amount)})</span>
              )}
              <span className="muted small">{formatDateTime(t.occurredAt)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h3>Movimientos de efectivo</h3>
        {session.movements.length === 0 && <p className="muted">Sin entradas o salidas registradas.</p>}
        <ul className="list">
          {session.movements.map((m) => (
            <li key={m.id}>
              <span>{m.concept}</span>
              <span className={m.type === 'ENTRADA' ? 'positive' : 'negative'}>
                {m.type === 'ENTRADA' ? '+' : '-'}
                {formatMoney(m.amount)}
              </span>
              <span className="muted small">
                {formatDateTime(m.createdAt)} · {m.createdBy}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
