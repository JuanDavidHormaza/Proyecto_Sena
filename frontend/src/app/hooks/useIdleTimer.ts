import { useState, useEffect, useRef, useCallback } from "react";
import { LAST_ACTIVITY_KEY, SESSION_IDLE_TIMEOUT_MS, SESSION_WARNING_MS } from "../utils/sessionManager";

interface UseIdleTimerOptions {
  /**
   * Tiempo total de inactividad antes de cerrar sesión (por defecto: 15 minutos).
   */
  timeoutMs?: number;
  /**
   * Tiempo previo de advertencia con modal de conteo regresivo (por defecto: 2 minutos).
   */
  warningMs?: number;
  /**
   * Función a ejecutar cuando expire el tiempo de inactividad.
   */
  onTimeout: () => void;
  /**
   * Si el temporizador está activo (ej. solo cuando el usuario está autenticado).
   */
  enabled?: boolean;
}

export interface UseIdleTimerReturn {
  isWarning: boolean;
  remainingSeconds: number;
  resetTimer: () => void;
  formattedRemaining: string;
}

/**
 * Hook para detectar inactividad del usuario en la ventana del navegador.
 * Escucha: mousemove, keydown, click, scroll, touchstart.
 */
export function useIdleTimer({
  timeoutMs = SESSION_IDLE_TIMEOUT_MS, // 15 minutos (900.000 ms)
  warningMs = SESSION_WARNING_MS,  // 2 minutos (120.000 ms)
  onTimeout,
  enabled = true,
}: UseIdleTimerOptions): UseIdleTimerReturn {
  const [isWarning, setIsWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(warningMs / 1000));

  const lastActivityRef = useRef<number>(Date.now());
  const lastEventLoggedRef = useRef<number>(0);
  const onTimeoutRef = useRef(onTimeout);
  const isWarningRef = useRef(false);

  // Mantener referencia actualizada de onTimeout para evitar recrear efectos
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  useEffect(() => {
    isWarningRef.current = isWarning;
  }, [isWarning]);

  // Función explícita para reiniciar el contador (ej. botón "Continuar conectado")
  const resetTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    lastEventLoggedRef.current = now;
    try {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // ignore
    }
    setIsWarning(false);
    isWarningRef.current = false;
    setRemainingSeconds(Math.floor(warningMs / 1000));
  }, [warningMs]);

  // Manejador de eventos de usuario (con throttling de 1s para memoria y 3s para storage)
  const lastStorageSyncRef = useRef<number>(0);
  const handleUserActivity = useCallback(() => {
    // Si la advertencia ya está visible, se requiere acción intencional (clic en botón)
    if (isWarningRef.current) return;

    const now = Date.now();
    if (now - lastEventLoggedRef.current > 1000) {
      lastActivityRef.current = now;
      lastEventLoggedRef.current = now;

      // Sincronizar actividad hacia otras pestañas con throttling de 3 segundos
      if (now - lastStorageSyncRef.current > 3000) {
        lastStorageSyncRef.current = now;
        try {
          sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        } catch {
          // ignore
        }
      }
    }
  }, []);

  // Registrar listeners de eventos de ventana
  useEffect(() => {
    if (!enabled) {
      setIsWarning(false);
      isWarningRef.current = false;
      return;
    }

    // Inicializar timestamp al activarse
    lastActivityRef.current = Date.now();
    lastEventLoggedRef.current = Date.now();

    const activityEvents: (keyof WindowEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [enabled, handleUserActivity]);

  // Intervalo de comprobación cada segundo
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      let remoteLastActive = 0;
      try {
        remoteLastActive = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY) || 0);
      } catch {
        remoteLastActive = 0;
      }
      const effectiveLastActive = Math.max(lastActivityRef.current, remoteLastActive);
      const elapsed = now - effectiveLastActive;
      const timeLeftMs = Math.max(0, timeoutMs - elapsed);
      const timeLeftSec = Math.ceil(timeLeftMs / 1000);

      // Caso 1: Se ha agotado el tiempo límite de inactividad
      if (timeLeftMs <= 0) {
        clearInterval(interval);
        setIsWarning(false);
        isWarningRef.current = false;
        onTimeoutRef.current();
        return;
      }

      // Caso 2: Restan menos o igual a warningMs (ej. 2 minutos)
      if (timeLeftMs <= warningMs) {
        setIsWarning(true);
        isWarningRef.current = true;
        setRemainingSeconds(timeLeftSec);
      } else {
        if (isWarningRef.current) {
          setIsWarning(false);
          isWarningRef.current = false;
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [enabled, timeoutMs, warningMs]);

  // Formato mm:ss
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedRemaining = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    isWarning,
    remainingSeconds,
    resetTimer,
    formattedRemaining,
  };
}
