import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { AccessibilityWidget } from './components/AccessibilityWidget';
import { ToastProvider } from './components/Toast';
import { IdleSessionManager } from './components/IdleSessionManager';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
        <IdleSessionManager />
        <AccessibilityWidget />
      </ToastProvider>
    </AuthProvider>
  );
}