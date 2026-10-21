import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIdleTimeout } from "../hooks/useIdleTimeout";

interface Props {
  children: ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading } = useAuth();
  useIdleTimeout();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  if (!user) return <Navigate to="/login" replace />;

  const roles = user.roles || [];
  const isDualRole = Boolean(
    user.is_dual_role ||
    user.isDualRole ||
    (roles.includes("INSTRUCTOR") && roles.includes("APRENDIZ")) ||
    (user.availableRoles && user.availableRoles.includes("teacher") && user.availableRoles.includes("student")) ||
    sessionStorage.getItem("is_dual_role") === "true" ||
    sessionStorage.getItem("isDualRole") === "true"
  );

  const activeRole = (
    user.active_role ||
    user.activeRole ||
    sessionStorage.getItem("active_role") ||
    sessionStorage.getItem("activeRole") ||
    (user.role === "teacher" ? "INSTRUCTOR" : "APRENDIZ")
  ).toUpperCase();

  const effectiveRole = activeRole === "INSTRUCTOR" ? "teacher" : "student";

  // Permitir acceso si el rol del usuario está permitido, o si tiene rol activo correspondiente (caso especial doble rol)
  const hasAccess =
    allowedRoles.includes(user.role) ||
    allowedRoles.includes(effectiveRole) ||
    (isDualRole && (allowedRoles.includes("student") || allowedRoles.includes("teacher"))) ||
    (user.role === "admin" || user.role === "superadmin");

  if (!hasAccess) {
    // Redirigir según su rol efectivo
    if (effectiveRole === "student") return <Navigate to="/dashboard" replace />;
    if (effectiveRole === "teacher") return <Navigate to="/teacher" replace />;
    if (user.role === "admin" || user.role === "superadmin") return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}