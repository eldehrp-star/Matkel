import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';

export default function Movement() {
  const { type } = useParams(); // ENTRADA | SALIDA
  const { token } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isEntrada = type === 'ENTRADA';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.addMovement(token, type, Number(amount), concept);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>{isEntrada ? 'Registrar entrada de efectivo' : 'Registrar salida de efectivo'}</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Monto
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>
        <label>
          Concepto
          <input
            type="text"
            placeholder={isEntrada ? 'Ej. Fondo adicional' : 'Ej. Compra de insumos'}
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            required
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar'}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>
          Cancelar
        </button>
      </form>
    </div>
  );
}
