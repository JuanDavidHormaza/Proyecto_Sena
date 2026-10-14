import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, clearAllTokens } from '../context/AuthContext';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutos

export const useIdleTimeout = () => {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { logout } = useAuth();

  const handleLogout = () => {
    // 1. Limpiar tokens y almacenamiento
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    clearAllTokens();
    sessionStorage.clear();

    if (logout) {
      try {
        logout('timeout');
      } catch {
        // ignore
      }
    }

    // 2. Redireccionar con aviso amigable
    try {
      navigate('/login?reason=timeout');
    } catch {
      window.location.href = '/login?reason=timeout';
    }
  };

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'keydown', 'scroll', 'touchstart', 'click'];

    // Escuchar actividad real del usuario
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Inicializar el temporizador
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);
};
