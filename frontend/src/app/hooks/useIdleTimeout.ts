import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearAllTokens } from '../services/api';
import {
  SESSION_IDLE_TIMEOUT_MS,
  destroyClientSession,
  getLastActivityTime,
  touchActivity,
} from '../utils/sessionManager';

const TIMEOUT_MS = SESSION_IDLE_TIMEOUT_MS; // 15 minutos

export const useIdleTimeout = () => {
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTouchRef = useRef<number>(0);
  const { logout } = useAuth();

  const handleLogout = () => {
    // 1. Limpiar tokens y almacenamiento
    clearAllTokens();
    destroyClientSession();

    if (logout) {
      try {
        logout('idle_timeout');
      } catch {
        // ignore
      }
    }

    // 2. Redireccionar con aviso amigable
    try {
      navigate('/login?reason=idle_timeout');
    } catch {
      window.location.href = '/login?reason=idle_timeout';
    }
  };

  const resetTimer = () => {
    // Registrar la marca de actividad (con throttling de 1s para evitar escrituras excesivas)
    const now = Date.now();
    if (now - lastTouchRef.current > 1000) {
      lastTouchRef.current = now;
      touchActivity();
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, TIMEOUT_MS);
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'keydown', 'scroll', 'touchstart', 'click'];

    // Escuchar actividad real del usuario
    events.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Inicializar el temporizador respetando la última actividad registrada (p. ej. tras recargar)
    const last = getLastActivityTime();
    const remaining = last ? Math.max(0, TIMEOUT_MS - (Date.now() - last)) : TIMEOUT_MS;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(handleLogout, remaining);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);
};
