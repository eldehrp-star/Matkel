import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

export default function Layout() {
  const { staff, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/cuenta" className="account-link">
          <strong>{staff?.name}</strong>
          <span className="muted"> · {staff?.role === 'ADMIN' ? 'Administrador' : 'Cajero'}</span>
        </Link>
        <button className="link-button" onClick={logout}>
          Salir
        </button>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          Caja
        </NavLink>
        {staff?.role === 'ADMIN' && (
          <>
            <NavLink to="/historial" className={({ isActive }) => (isActive ? 'active' : '')}>
              Historial
            </NavLink>
            <NavLink to="/personal" className={({ isActive }) => (isActive ? 'active' : '')}>
              Personal
            </NavLink>
          </>
        )}
      </nav>
    </div>
  );
}
