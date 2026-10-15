import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { AccessibilityWidget } from './components/AccessibilityWidget';
import { ToastProvider } from './components/Toast';
import { IdleSessionManager } from './components/IdleSessionManager';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <RouterProvider router={router} />
          <IdleSessionManager />
          <AccessibilityWidget />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}