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

  const isDualRole = Boolean(
    user.isDualRole ||
    (user.availableRoles && user.availableRoles.length > 1) ||
    localStorage.getItem("isDualRole") === "true" ||
    localStorage.getItem("originalRole") === "teacher"
  );

  // Permitir acceso si el rol coincide directamente, o si el usuario es docente/doble rol explorando vista de estudiante
  const hasAccess =
    allowedRoles.includes(user.role) ||
    (isDualRole && allowedRoles.includes("student")) ||
    (user.role === "teacher" && allowedRoles.includes("student")) ||
    (user.role === "admin" || user.role === "superadmin");

  if (!hasAccess) {
    // Redirigir según su rol real
    if (user.role === "student") return <Navigate to="/dashboard" replace />;
    if (user.role === "teacher") return <Navigate to="/teacher" replace />;
    if (user.role === "admin" || user.role === "superadmin") return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}