import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { BookOpen, LogOut, Settings, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "SuperAdministrador",
  admin: "Administrador",
  teacher: "Docente",
  student: "Estudiante",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

interface UserAccountMenuProps {
  accent?: "green" | "blue" | "purple";
  compact?: boolean;
  showRole?: boolean;
}

export function UserAccountMenu({ accent = "green", compact = false, showRole = true }: UserAccountMenuProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const userName = user?.name || localStorage.getItem("userName") || "Usuario";
  const role = user?.role || localStorage.getItem("userRole") || "student";
  // Oculta el rol (admin/superadmin/instructor/docente) pero mantiene el valor en token/storage.
  const subtitle = "";
  const accentClass = accent === "blue" ? "bg-sena-blue" : accent === "purple" ? "bg-purple-600" : "bg-sena-green";

  const handleNavigate = (path: string) => {
    setShowMenu(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-3 rounded-xl transition-colors hover:bg-muted ${compact ? "p-1.5" : "p-2"}`}
        aria-label="Abrir menu de usuario"
      >
        <div className={`${compact ? "w-9 h-9" : "w-10 h-10"} ${accentClass} rounded-xl flex items-center justify-center text-white font-medium`}>
          {getInitials(userName)}
        </div>
        {!compact && (
          <div className="hidden sm:block text-left min-w-0">
            <p className="font-medium text-foreground text-sm truncate max-w-40">{userName}</p>
           <div className="hidden sm:block text-left min-w-0">
  <p className="font-medium text-foreground text-sm truncate max-w-40">
    {userName}
  </p>
  {showRole && (
    <p className="text-xs text-muted-foreground">&nbsp;</p>
  )}
</div>
          </div>
        )}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-border py-2 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium text-foreground truncate">{userName}</p>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <button
              onClick={() => handleNavigate("/profile")}
              className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 text-sm text-foreground"
            >
              <User className="w-4 h-4 text-muted-foreground" />
              Mi Perfil
            </button>
            <button
              onClick={() => handleNavigate("/settings")}
              className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 text-sm text-foreground"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Configuracion
            </button>
            {role === "teacher" && (
              <button
                onClick={() => handleNavigate("/teacher/dictionaries")}
                className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 text-sm text-foreground"
              >
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                Mis diccionarios
              </button>
            )}
            <div className="border-t border-border mt-2 pt-2">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left hover:bg-destructive/10 flex items-center gap-3 text-sm text-destructive"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesion
              </button>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}