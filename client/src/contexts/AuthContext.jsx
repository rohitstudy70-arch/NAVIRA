import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('navira_token');
    if (!token) { setLoading(false); return; }
    api('/auth/me').then(({ user: account }) => setUser(account)).catch(() => localStorage.removeItem('navira_token')).finally(() => setLoading(false));
  }, []);
  async function login(email, password) {
    const { token, user: account } = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('navira_token', token); setUser(account);
  }
  function logout() { localStorage.removeItem('navira_token'); setUser(null); }
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
