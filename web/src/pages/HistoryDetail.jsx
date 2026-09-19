import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';
import { formatMoney, formatDateTime } from '../format';

export default function HistoryDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.historyDetail(token, id).then(setSession).catch((err) => setError(err.message));
  }, [token, id]);

  if (error) return <p className="error">{error}</p>;
  if (!session) return <div className="center-message">Cargando...</div>;

  return (
    <div>
      <div className="card">
        <p>Abierta: {formatDateTime(session.openedAt)} — por {session.openedByName || '—'}</p>
        <p>Cerrada: {formatDateTime(session.closedAt)} — por {session.closedByName || '—'}</p>
        <p>Efectivo inicial: {formatMoney(session.openingAmount)}</p>
        <p>Efectivo esperado: {formatMoney(session.closingExpectedAmount)}</p>
        <p>Efectivo contado: {formatMoney(session.closingCountedAmount)}</p>
        <p>Ventas Clip: {formatMoney(session.clipSalesTotal)}</p>
        {session.closingNotes && <p className="muted">Notas: {session.closingNotes}</p>}
      </div>

      <section className="section">
        <h3>Movimientos</h3>
        <ul className="list">
          {session.movements.map((m) => (
            <li key={m.id}>
              <span>{m.concept}</span>
              <span className={m.type === 'ENTRADA' ? 'positive' : 'negative'}>
                {m.type === 'ENTRADA' ? '+' : '-'}
                {formatMoney(m.amount)}
              </span>
              <span className="muted small">
                {formatDateTime(m.createdAt)} · {m.createdBy || '—'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h3>Ventas Clip</h3>
        <ul className="list">
          {session.clipTransactions.map((t) => (
            <li key={t.id}>
              <span>{t.receiptNumber ? `Folio ${t.receiptNumber}` : 'Venta Clip'}</span>
              <span>{formatMoney(t.amount)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
