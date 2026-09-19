import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';
import { formatMoney, formatDateTime } from '../format';

export default function History() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.history(token).then(setSessions).catch((err) => setError(err.message));
  }, [token]);

  if (error) return <p className="error">{error}</p>;
  if (!sessions) return <div className="center-message">Cargando...</div>;
  if (sessions.length === 0) return <p className="muted">Aun no hay cajas cerradas.</p>;

  return (
    <ul className="list">
      {sessions.map((s) => (
        <li key={s.id}>
          <Link to={`/historial/${s.id}`} className="history-row">
            <span>{formatDateTime(s.closedAt)}</span>
            <span className="muted small">
              Abrió: {s.openedByName || '—'} · Cerró: {s.closedByName || '—'}
            </span>
            <span>Contado: {formatMoney(s.closingCountedAmount)}</span>
            <span className={s.difference === 0 ? 'muted small' : s.difference > 0 ? 'positive small' : 'negative small'}>
              Diferencia: {formatMoney(s.difference)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
