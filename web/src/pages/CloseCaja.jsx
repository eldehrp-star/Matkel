import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';
import { formatMoney } from '../format';

export default function CloseCaja() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.currentSession(token).then(setSession).catch((err) => setError(err.message));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await api.closeSession(token, Number(counted), notes);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const diff = result.closingCountedAmount - result.closingExpectedAmount;
    return (
      <div className="card">
        <h2>Caja cerrada</h2>
        <p>Efectivo esperado: {formatMoney(result.closingExpectedAmount)}</p>
        <p>Efectivo contado: {formatMoney(result.closingCountedAmount)}</p>
        <p className={diff === 0 ? '' : diff > 0 ? 'positive' : 'negative'}>
          Diferencia: {formatMoney(diff)}
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Continuar
        </button>
      </div>
    );
  }

  if (!session) return <div className="center-message">Cargando...</div>;

  return (
    <div className="card">
      <h2>Cerrar caja</h2>
      <p className="muted">Efectivo esperado segun el sistema: {formatMoney(session.expectedCash)}</p>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Efectivo contado fisicamente
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            required
          />
        </label>
        <label>
          Notas (opcional)
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Cerrando...' : 'Cerrar caja'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>
          Cancelar
        </button>
      </form>
    </div>
  );
}
