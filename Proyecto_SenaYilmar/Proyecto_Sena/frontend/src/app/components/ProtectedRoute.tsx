// frontend/src/components/ProtectedRoute.tsx
import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: ReactNode;
  allowedRoles: string[];
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

  if (!user) return <Navigate to="/login" replace />;

  if (!allowedRoles.includes(user.role)) {
    // Redirigir según su rol real
    if (user.role === "student") return <Navigate to="/dashboard" replace />;
    if (user.role === "teacher") return <Navigate to="/teacher" replace />;
    if (user.role === "admin" || user.role === "superadmin") return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}