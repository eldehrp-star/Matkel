import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('matkel_token'));
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me(token)
      .then(setStaff)
      .catch(() => {
        setToken(null);
        localStorage.removeItem('matkel_token');
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function login(username, pin) {
    const data = await api.login(username, pin);
    localStorage.setItem('matkel_token', data.token);
    setToken(data.token);
    setStaff(data.staff);
  }

  function logout() {
    localStorage.removeItem('matkel_token');
    setToken(null);
    setStaff(null);
  }

  return (
    <AuthContext.Provider value={{ token, staff, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
