import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { AccessibilityWidget } from './components/AccessibilityWidget';
import { ToastProvider } from './components/Toast';
import { IdleSessionManager } from './components/IdleSessionManager';
import { ErrorBoundary } from './components/ErrorBoundary';

export const APP_VERSION = "2.1.0-matdash";
if (typeof window !== "undefined") {
  (window as any).__WORKLEX_VERSION__ = APP_VERSION;
}

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