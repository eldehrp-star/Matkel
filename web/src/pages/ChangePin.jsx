import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';

export default function ChangePin() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPin !== confirmPin) {
      setError('El PIN nuevo no coincide con la confirmacion');
      return;
    }

    setSubmitting(true);
    try {
      await api.changePin(token, currentPin, newPin);
      setSuccess(true);
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card">
      <h2>Cambiar mi PIN</h2>
      {success ? (
        <>
          <p className="positive">Tu PIN se actualizo correctamente.</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Continuar
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="form">
          <label>
            PIN actual
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              required
            />
          </label>
          <label>
            PIN nuevo (4 a 6 digitos)
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
            />
          </label>
          <label>
            Confirmar PIN nuevo
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              required
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Cambiar PIN'}
          </button>
        </form>
      )}
    </div>
  );
}
