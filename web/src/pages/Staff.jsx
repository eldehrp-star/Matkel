import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api';
import { formatMoney, formatDateTime } from '../format';

export default function Staff() {
  const { token } = useAuth();
  const [staff, setStaff] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', username: '', pin: '', role: 'CAJERO' });
  const [submitting, setSubmitting] = useState(false);
  const [liveSession, setLiveSession] = useState(undefined);

  async function load() {
    try {
      setStaff(await api.listStaff(token));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function loadLiveSession() {
      api.currentSession(token).then(setLiveSession).catch(() => {});
    }
    loadLiveSession();
    const interval = setInterval(loadLiveSession, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createStaff(token, form);
      setForm({ name: '', username: '', pin: '', role: 'CAJERO' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(person) {
    await api.updateStaff(token, person.id, { active: !person.active });
    await load();
  }

  return (
    <div>
      <div className="card">
        <h2>Caja en vivo</h2>
        {liveSession === undefined && <p className="muted">Cargando...</p>}
        {liveSession === null && <p className="muted">No hay ninguna caja abierta en este momento.</p>}
        {liveSession && (
          <>
            <p>
              Abierta por <strong>{liveSession.openedByName || '—'}</strong> desde{' '}
              {formatDateTime(liveSession.openedAt)}
            </p>
            <p className="muted small">Efectivo esperado ahora: {formatMoney(liveSession.expectedCash)}</p>
          </>
        )}
      </div>

      <div className="card">
        <h2>Nuevo integrante del personal</h2>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Nombre
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Usuario (para iniciar sesion)
            <input
              type="text"
              autoCapitalize="none"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </label>
          <label>
            PIN (4 a 6 digitos)
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={form.pin}
              onChange={(e) => setForm({ ...form, pin: e.target.value })}
              required
            />
          </label>
          <label>
            Rol
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="CAJERO">Cajero</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Agregar'}
          </button>
        </form>
      </div>

      <section className="section">
        <h3>Personal registrado</h3>
        <ul className="list">
          {staff?.map((p) => (
            <li key={p.id}>
              <span>
                {p.name} · {p.role === 'ADMIN' ? 'Administrador' : 'Cajero'}
              </span>
              <button className="link-button" onClick={() => toggleActive(p)}>
                {p.active ? 'Desactivar' : 'Activar'}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
