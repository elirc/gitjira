import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { setAccessToken, api, onAuthLost } from '../lib/api.js';

const AuthContext = createContext(null);

// LEARN: the access token lives in React state — MEMORY, not localStorage.
// localStorage is readable by any script that sneaks onto the page (XSS);
// memory dies with the tab, and the httpOnly refresh cookie (which JS
// cannot read at all) silently restores the session on reload.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const applySession = useCallback((session) => {
    setAccessToken(session?.accessToken ?? null);
    setUser(session?.user ?? null);
  }, []);

  // On first load: try to resurrect the session from the refresh cookie.
  useEffect(() => {
    api('/auth/refresh', { method: 'POST' })
      .then(applySession)
      .catch(() => applySession(null))
      .finally(() => setBooting(false));
  }, [applySession]);

  // If a silent refresh ever fails mid-session, drop to logged-out cleanly.
  useEffect(() => onAuthLost(() => applySession(null)), [applySession]);

  const value = useMemo(
    () => ({
      user,
      booting,
      async login(credentials) {
        applySession(
          await api('/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
        );
      },
      async register(details) {
        await api('/auth/register', { method: 'POST', body: JSON.stringify(details) });
        await this.login({ email: details.email, password: details.password });
      },
      async logout() {
        await api('/auth/logout', { method: 'POST' }).catch(() => {});
        applySession(null);
      },
    }),
    [user, booting, applySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
