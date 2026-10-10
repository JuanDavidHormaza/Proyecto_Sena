import React, { useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useIdleTimer } from "../hooks/useIdleTimer";
import { IdleSessionModal } from "./IdleSessionModal";
import { router } from "../routes";
import { toast } from "./Toast";

/**
 * Gestor global de inactividad de sesión para Worklex SENA.
 * - Monitorea actividad solo cuando hay un usuario autenticado.
 * - Límite: 15 minutos (900.000 ms).
 * - Modal de advertencia con cuenta regresiva en el minuto 13 (a falta de 2 minutos).
 * - Cierre de sesión automático al expirar: limpia almacenamiento/estado, redirige a /login y notifica.
 */
export function IdleSessionManager() {
  const { user, isAuthenticated, logout } = useAuth();

  const handleTimeout = useCallback(() => {
    logout();
    router.navigate("/login");
    toast.warning(
      "Sesión cerrada automáticamente por inactividad.",
      "Sesión Expirada"
    );
  }, [logout]);

  const handleManualLogout = useCallback(() => {
    logout();
    router.navigate("/login");
    toast.info("Has cerrado sesión exitosamente.", "Sesión Finalizada");
  }, [logout]);

  const { isWarning, formattedRemaining, resetTimer } = useIdleTimer({
    timeoutMs: 15 * 60 * 1000, // 15 minutos
    warningMs: 2 * 60 * 1000,  // 2 minutos antes
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
