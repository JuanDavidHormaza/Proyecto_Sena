import React, { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useIdleTimer } from "../hooks/useIdleTimer";
import { IdleSessionModal } from "./IdleSessionModal";
import { router } from "../routes";
import { toast } from "./Toast";
import {
  IDLE_LOGOUT_MESSAGE,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_WARNING_MS,
  destroyClientSession,
} from "../utils/sessionManager";

/**
 * Gestor global de inactividad de sesión para Worklex SENA.
 * - Monitorea actividad solo cuando hay un usuario autenticado.
 * - Límite: 15 minutos (900.000 ms) sin eventos click / keydown / mousemove (y scroll / touch).
 * - Modal de advertencia con cuenta regresiva a falta de 2 minutos.
 * - Cierre de sesión automático al expirar: sessionStorage.clear(), logout(), redirige a /login y notifica.
 */
export function IdleSessionManager() {
  const { user, isAuthenticated, logout } = useAuth();

  const handleTimeout = useCallback(() => {
    destroyClientSession(); // sessionStorage.clear() + purga de residuos en localStorage
    logout("idle_timeout");
    try {
      router.navigate("/login?reason=idle_timeout");
    } catch {
      window.location.href = "/login?reason=idle_timeout";
    }
    toast.warning(IDLE_LOGOUT_MESSAGE, "Sesión Finalizada");
  }, [logout]);

  const handleManualLogout = useCallback(() => {
    logout();
    router.navigate("/login");
    toast.info("Has cerrado sesión exitosamente.", "Sesión Finalizada");
  }, [logout]);

  const { isWarning, formattedRemaining, resetTimer } = useIdleTimer({
    timeoutMs: SESSION_IDLE_TIMEOUT_MS, // 15 minutos
    warningMs: SESSION_WARNING_MS,      // 2 minutos antes
    onTimeout: handleTimeout,
    enabled: Boolean(isAuthenticated && user),
  });

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <IdleSessionModal
      isOpen={isWarning}
      formattedRemaining={formattedRemaining}
      onStayLoggedIn={resetTimer}
      onLogout={handleManualLogout}
    />
  );
}
