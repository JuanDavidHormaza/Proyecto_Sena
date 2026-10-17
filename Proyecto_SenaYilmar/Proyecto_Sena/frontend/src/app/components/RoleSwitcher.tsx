import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IconArrowsExchange } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

export function RoleSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();

  const userRole = (user?.role || localStorage.getItem("userRole") || "student").toLowerCase();
  const availableRoles = user?.availableRoles || [];
  const isDualRole = Boolean(
    user?.isDualRole ||
    availableRoles.length > 1 ||
    userRole === "teacher" ||
    (user as any)?.is_instructor ||
    localStorage.getItem("isDualRole") === "true" ||
    localStorage.getItem("originalRole") === "teacher"
  );

  // Solo mostrar si el usuario tiene doble rol o es docente con capacidad de alternar
  if (!isDualRole) {
    return null;
  }

  const isCurrentlyInstructor = location.pathname.startsWith("/teacher") || location.pathname.startsWith("/instructor") || userRole === "teacher";
  const activeRole = isCurrentlyInstructor ? "INSTRUCTOR" : "APRENDIZ";

  const handleToggleRole = async () => {
    const nextRole = isCurrentlyInstructor ? "student" : "teacher";
    const nextPath = isCurrentlyInstructor ? "/dashboard" : "/teacher";

    // Registrar rol original para que persista la capacidad de volver
    if (!localStorage.getItem("originalRole")) {
      localStorage.setItem("originalRole", userRole);
    }
    localStorage.setItem("isDualRole", "true");

    try {
      await api.switchRole(nextRole === "teacher" ? "INSTRUCTOR" : "APRENDIZ");
    } catch {
      // Fallback frontend silencioso
    }

    if (user) {
      updateUser({
        ...user,
        role: nextRole,
        isDualRole: true,
      });
    }
    localStorage.setItem("userRole", nextRole);
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
        {activeRole === "INSTRUCTOR"
          ? "Vista: Docente ➔ Cambiar a Aprendiz"
          : "Vista: Aprendiz ➔ Cambiar a Docente"}
      </span>
    </button>
  );
}

export default RoleSwitcher;
