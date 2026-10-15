import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { BookOpen, LogOut, Settings, User, LifeBuoy, GraduationCap, Presentation, ShieldCheck, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SupportTicketModal } from "./SupportTicketModal";
import * as api from "../services/api";
import { toast } from "./Toast";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "SuperAdministrador",
  admin: "Administrador",
  teacher: "Instructor",
  student: "Aprendiz",
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
  const { user, logout, updateUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showFichaPicker, setShowFichaPicker] = useState(false);
  const [isSwitchingFicha, setIsSwitchingFicha] = useState(false);

  const userName = user?.name || localStorage.getItem("userName") || "Usuario";
  const role = user?.role || localStorage.getItem("userRole") || "student";
  const userProgram = user?.program || localStorage.getItem("userProgram") || "";
  const subtitle = userProgram || ROLE_LABELS[role] || "Usuario";
  const accentClass = accent === "blue" ? "bg-sena-blue" : accent === "purple" ? "bg-purple-600" : "bg-sena-green";

  // Multi-ficha: Obtener programas aprobados/activos sin duplicados
  const enrolledPrograms = useMemo(() => {
    let list: string[] = user?.enrolledPrograms || [];
    if (!list || list.length === 0) {
      try {
        const stored = localStorage.getItem("userEnrolledPrograms");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch {}
    }
    return Array.from(new Set(list.filter(Boolean)));
  }, [user?.enrolledPrograms]);

  // Condición Estricta: Mostrar selector única y exclusivamente si el usuario tiene 2 o más fichas aprobadas
  const hasMultipleFichas = enrolledPrograms.length >= 2;

  const handleNavigate = (path: string) => {
    setShowMenu(false);
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSwitchFicha = async (targetProg: string) => {
    if (targetProg.trim().toLowerCase() === (user?.program || "").trim().toLowerCase()) {
      setShowMenu(false);
      return;
    }
    setIsSwitchingFicha(true);
    try {
      const updatedUser = await api.switchProgram(targetProg);
      updateUser(updatedUser);
      localStorage.setItem("userProgram", targetProg);
      localStorage.setItem("activeProgram", targetProg);
      window.dispatchEvent(new Event("programChanged"));
      toast.success(`Ficha activa cambiada a: ${targetProg}`);
      setShowMenu(false);
      setShowFichaPicker(false);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo cambiar la ficha activa");
    } finally {
      setIsSwitchingFicha(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`flex items-center gap-3 rounded-xl transition-colors hover:bg-muted ${compact ? "p-1.5" : "p-2"}`}
        aria-label="Abrir menu de usuario"
      >
        <div className={`${compact ? "w-9 h-9" : "w-10 h-10"} ${accentClass} rounded-xl flex items-center justify-center text-white font-medium overflow-hidden`}>
          {user?.avatar ? (
            <img src={user.avatar} alt={userName} className="w-full h-full object-cover" />
          ) : (
            getInitials(userName)
          )}
        </div>
        {!compact && (
          <div className="hidden sm:block text-left min-w-0">
            <p className="font-medium text-foreground text-sm truncate max-w-40" title={userName}>{userName}</p>
            {showRole && (
              <p className="text-xs text-muted-foreground truncate max-w-40 flex items-center gap-1" title={subtitle}>
                {role === "student" && <GraduationCap className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />}
                {role === "teacher" && <Presentation className="w-3.5 h-3.5 text-blue-600 inline shrink-0" />}
                {(role === "admin" || role === "superadmin") && <ShieldCheck className="w-3.5 h-3.5 text-purple-600 inline shrink-0" />}
                <span className="truncate">{subtitle}</span>
              </p>
            )}
          </div>
        )}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 mt-2 w-64 bg-card rounded-xl shadow-xl border border-border py-2 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border">
              <p className="font-medium text-foreground truncate">{userName}</p>
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                {role === "student" && <GraduationCap className="w-4 h-4 text-emerald-600 shrink-0" />}
                {role === "teacher" && <Presentation className="w-4 h-4 text-blue-600 shrink-0" />}
                {(role === "admin" || role === "superadmin") && <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />}
                <span className="truncate">{subtitle}</span>
              </p>
            </div>
            <button
              onClick={() => handleNavigate("/profile")}
              className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 text-sm text-foreground cursor-pointer"
            >
              <User className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
              Mi Perfil
            </button>
            <button
              onClick={() => handleNavigate("/settings")}
              className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 text-sm text-foreground cursor-pointer"
            >
              <Settings className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
              Configuración
            </button>

            {/* Selector Dinámico de Ficha Activa (Estrictamente si cuenta con >= 2 fichas aprobadas) */}
            {hasMultipleFichas && (
              <div className="border-t border-border my-1 pt-1">
                <button
                  type="button"
                  onClick={() => setShowFichaPicker(!showFichaPicker)}
                  className="w-full px-4 py-2 text-left hover:bg-muted flex items-center justify-between text-sm text-foreground cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-sena-blue" strokeWidth={1.8} />
                    <span className="font-medium">Cambiar de Ficha</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-sena-green/10 text-sena-green font-bold px-1.5 py-0.5 rounded-full">
                      {enrolledPrograms.length}
                    </span>
                    {showFichaPicker ? (
                      <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {showFichaPicker && (
                  <div className="px-2 py-1 space-y-1 bg-muted/40 rounded-lg mx-2 my-1 max-h-48 overflow-y-auto">
                    {enrolledPrograms.map((prog) => {
                      const isCurrent = prog.trim().toLowerCase() === (user?.program || "").trim().toLowerCase();
                      return (
                        <button
                          key={prog}
                          type="button"
                          disabled={isSwitchingFicha}
                          onClick={() => handleSwitchFicha(prog)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isCurrent
                              ? "bg-sena-green/10 text-sena-green font-bold"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <span className="truncate pr-2" title={prog}>{prog}</span>
                          {isCurrent ? (
                            <Check className="w-3.5 h-3.5 text-sena-green shrink-0" />
                          ) : isSwitchingFicha ? (
                            <Loader2 className="w-3 h-3 text-muted-foreground animate-spin shrink-0" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {role === "teacher" && (
              <button
                onClick={() => handleNavigate("/teacher/dictionaries")}
                className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 text-sm text-foreground cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                Mis diccionarios
              </button>
            )}
            {role !== "superadmin" && role !== "admin" && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  setShowTicketModal(true);
                }}
                className="w-full px-4 py-2.5 text-left hover:bg-muted flex items-center gap-3 text-sm text-sena-green font-medium cursor-pointer"
              >
                <LifeBuoy className="w-4 h-4 text-sena-green" strokeWidth={1.8} />
                Soporte y PQRS
              </button>
            )}
            <div className="border-t border-border mt-2 pt-2">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left hover:bg-destructive/10 flex items-center gap-3 text-sm text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.8} />
                Cerrar Sesión
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* Modal de radicación de ticket PQRS */}
      <SupportTicketModal
        isOpen={showTicketModal}
        onClose={() => setShowTicketModal(false)}
      />
    </div>
  );
}
