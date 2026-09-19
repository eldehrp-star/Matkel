import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Movement from './pages/Movement.jsx';
import CloseCaja from './pages/CloseCaja.jsx';
import History from './pages/History.jsx';
import HistoryDetail from './pages/HistoryDetail.jsx';
import Staff from './pages/Staff.jsx';
import ChangePin from './pages/ChangePin.jsx';

function PrivateRoute({ children, adminOnly = false }) {
  const { token, staff, loading } = useAuth();

  if (loading) return <div className="center-message">Cargando...</div>;
  if (!token) return <Navigate to="/login" replace />;
  if (adminOnly && staff?.role !== 'ADMIN') return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="movimiento/:type" element={<Movement />} />
        <Route path="cierre" element={<CloseCaja />} />
        <Route path="historial" element={<History />} />
        <Route path="historial/:id" element={<HistoryDetail />} />
        <Route path="cuenta" element={<ChangePin />} />
        <Route
          path="personal"
          element={
            <PrivateRoute adminOnly>
              <Staff />
            </PrivateRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
