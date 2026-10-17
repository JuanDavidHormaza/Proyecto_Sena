import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

export function RoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();

  // Obtener roles institucionales del usuario
  const roles = user?.roles || [];
  const isDualRole = Boolean(
    user?.is_dual_role ||
    user?.isDualRole ||
    (roles.includes("INSTRUCTOR") && roles.includes("APRENDIZ")) ||
    (user?.availableRoles && user.availableRoles.includes("teacher") && user.availableRoles.includes("student")) ||
    localStorage.getItem("is_dual_role") === "true" ||
    localStorage.getItem("isDualRole") === "true"
  );

  // REGLA ESTRICTA DE CASOS ESPECIALES:
  // El botón conmutador de rol NO debe ser visible para usuarios normales.
  // SOLO debe aparecer si el usuario posee simultáneamente ambos roles activos.
  if (!isDualRole) {
    return null;
  }

  // Determinar rol activo actual
  const currentActiveRole = (
    user?.active_role ||
    user?.activeRole ||
    localStorage.getItem("active_role") ||
    localStorage.getItem("activeRole") ||
    (location.pathname.startsWith("/teacher") ? "INSTRUCTOR" : "APRENDIZ")
  ).toUpperCase();

  const isCurrentlyInstructor = currentActiveRole === "INSTRUCTOR" || location.pathname.startsWith("/teacher");

  const handleToggleRole = async () => {
    const nextActiveRole = isCurrentlyInstructor ? "APRENDIZ" : "INSTRUCTOR";
    const nextFrontendRole = isCurrentlyInstructor ? "student" : "teacher";
    const nextPath = isCurrentlyInstructor ? "/dashboard" : "/teacher";

    // 1. Persistir el nuevo active_role en localStorage
    localStorage.setItem("active_role", nextActiveRole);
    localStorage.setItem("activeRole", nextActiveRole);
    localStorage.setItem("userRole", nextFrontendRole);
    localStorage.setItem("is_dual_role", "true");
    localStorage.setItem("isDualRole", "true");

    // 2. Notificar al backend si el endpoint está disponible
    try {
      await api.switchRole(nextActiveRole);
    } catch {
      // Fallback frontend silencioso
    }

    // 3. Actualizar estado global del usuario sin cerrar sesión
    if (user) {
      updateUser({
        ...user,
        role: nextFrontendRole,
        active_role: nextActiveRole,
        activeRole: nextActiveRole,
        is_dual_role: true,
        isDualRole: true,
      });
    }

    // 4. Redirigir a la vista correspondiente
    navigate(nextPath);
  };

  return (
    <button
      type="button"
      onClick={handleToggleRole}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
      title="Alternar entre vista de Docente e Instructor y vista de Aprendiz"
    >
      <IconArrowsExchange size={16} />
      <span>
        {isCurrentlyInstructor
          ? "Vista: Docente ➔ Cambiar a Aprendiz"
          : "Vista: Aprendiz ➔ Cambiar a Docente"}
      </span>
    </button>
  );
}

export default RoleSwitcher;
