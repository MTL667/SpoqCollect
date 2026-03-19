import { useState, useCallback, useContext, createContext, type ReactNode } from 'react';
import { createElement } from 'react';

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

interface AuthContextValue {
  token: string | null;
  inspector: Inspector | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<Inspector>;
  logout: () => void;
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

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(loadFromStorage);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Server onbereikbaar (status ${res.status}). Probeer later opnieuw.`);
    }

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

  const value: AuthContextValue = {
    token: state.token,
    inspector: state.inspector,
    isAuthenticated: !!state.token,
    login,
    logout,
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
