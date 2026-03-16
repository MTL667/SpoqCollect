import { useState, useCallback, useEffect } from 'react';
import { setTokenAccessor, setOnUnauthorized } from '../../lib/api-client';

interface Inspector {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  inspector: Inspector | null;
}

const STORAGE_KEY = 'inventarispoq_auth';

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AuthState;
  } catch { /* ignore corrupt data */ }
  return { token: null, inspector: null };
}

function saveToStorage(state: AuthState) {
  if (state.token) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  useEffect(() => {
    setTokenAccessor(() => state.token);
    setOnUnauthorized(() => {
      setState({ token: null, inspector: null });
      saveToStorage({ token: null, inspector: null });
    });
  }, [state.token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      const errBody = json as { error?: { message?: string } };
      throw new Error(errBody.error?.message ?? 'Login failed');
    }

    const data = (json as { data: { token: string; inspector: Inspector } }).data;
    const newState = { token: data.token, inspector: data.inspector };
    setState(newState);
    saveToStorage(newState);
    return data.inspector;
  }, []);

  const logout = useCallback(() => {
    const cleared = { token: null, inspector: null };
    setState(cleared);
    saveToStorage(cleared);
  }, []);

  return {
    token: state.token,
    inspector: state.inspector,
    isAuthenticated: !!state.token,
    login,
    logout,
  };
}
