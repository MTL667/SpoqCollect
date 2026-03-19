import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './features/auth/use-auth';
import LoginForm from './features/auth/LoginForm';
import SessionList from './features/sessions/SessionList';
import CreateSession from './features/sessions/CreateSession';
import SessionDetail from './features/sessions/SessionDetail';
import ScanFlow from './features/scan/ScanFlow';
import OfflineIndicator from './shared/components/OfflineIndicator';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  if (isAuthenticated) return <Navigate to="/sessions" replace />;

  return (
    <LoginForm
      onLogin={async (email, password) => {
        await login(email, password);
      }}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <OfflineIndicator />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/sessions"
          element={<ProtectedRoute><SessionList /></ProtectedRoute>}
        />
        <Route
          path="/sessions/new"
          element={<ProtectedRoute><CreateSession /></ProtectedRoute>}
        />
        <Route
          path="/sessions/:id"
          element={<ProtectedRoute><SessionDetail /></ProtectedRoute>}
        />
        <Route
          path="/sessions/:id/scan"
          element={<ProtectedRoute><ScanFlow /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/sessions" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
