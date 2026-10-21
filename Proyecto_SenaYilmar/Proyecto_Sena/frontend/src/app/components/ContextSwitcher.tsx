import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { IconChevronDown, IconCheck } from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

export function ContextSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableContexts = user?.available_contexts || (user as any)?.availableContexts || [];
  const isSpecialCase = Boolean(
    user?.is_special_case ||
    (user as any)?.isSpecialCase ||
    availableContexts.length > 1 ||
    user?.is_dual_role ||
    user?.isDualRole ||
    (user?.roles && user.roles.length > 1) ||
    sessionStorage.getItem("is_dual_role") === "true" ||
    sessionStorage.getItem("isDualRole") === "true"
  );

  // REGLA ESTRICTA DE CASOS ESPECIALES:
  // El conmutador NO debe ser visible para usuarios comunes. SOLO para casos especiales con > 1 contexto.
  if (!isSpecialCase && availableContexts.length <= 1) {
    return null;
  }

  // Fallback para construir contextos si aún no vinieron estructurados
  const effectiveContexts = availableContexts.length > 0 ? availableContexts : [
    {
      role: (user?.active_role || user?.role || "APRENDIZ").toUpperCase(),
      ficha_id: user?.id,
      ficha_code: user?.ficha?.codigo || "2670123",
      program_name: user?.program || "Análisis y Desarrollo de Software",
      is_active: true,
    },
    ...(user?.is_dual_role || user?.isDualRole ? [{
      role: (user?.active_role || "").toUpperCase() === "INSTRUCTOR" ? "APRENDIZ" : "INSTRUCTOR",
      ficha_id: (user?.id ? `${user.id}-alt` : "alt"),
      ficha_code: "2680456",
      program_name: "Automatización Industrial",
      is_active: false,
    }] : [])
  ];

  if (effectiveContexts.length <= 1) {
    return null;
  }

  const activeContext = user?.active_context || effectiveContexts.find((c: any) => c.is_active) || effectiveContexts[0];

  const handleSelectContext = async (targetContext: any) => {
    setIsOpen(false);

    try {
      const resp = await api.switchContext({
        ficha_id: targetContext.ficha_id,
        role: targetContext.role,
        ficha_code: targetContext.ficha_code,
        program_name: targetContext.program_name,
      });

      if (resp?.access) {
        sessionStorage.setItem("accessToken", resp.access);
        sessionStorage.setItem("access_token", resp.access);
      }
      if (resp?.refresh) {
        sessionStorage.setItem("refreshToken", resp.refresh);
      }

      const updatedUser = resp?.user || resp;
      if (updatedUser) {
        updateUser(updatedUser);
      }
    } catch {
      // Fallback local en frontend si backend estuviese desconectado
      const nextFrontendRole = targetContext.role.toLowerCase() === "instructor" ? "teacher" : "student";
      sessionStorage.setItem("active_role", targetContext.role);
      sessionStorage.setItem("activeRole", targetContext.role);
      sessionStorage.setItem("userRole", nextFrontendRole);
      sessionStorage.setItem("userProgram", targetContext.program_name);

      if (user) {
        updateUser({
          ...user,
          role: nextFrontendRole,
          active_role: targetContext.role,
          activeRole: targetContext.role,
          program: targetContext.program_name,
          active_context: targetContext,
        });
      }
    }

    // Redirigir según el rol del nuevo contexto si es necesario
    const isTargetInstructor = targetContext.role.toUpperCase() === "INSTRUCTOR";
    if (isTargetInstructor && !location.pathname.startsWith("/teacher")) {
      navigate("/teacher");
    } else if (!isTargetInstructor && location.pathname.startsWith("/teacher")) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 text-slate-800 dark:text-slate-100 shadow-xs transition-all cursor-pointer"
        title="Cambiar ficha o rol de formación (Casos Especiales)"
      >
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
          activeContext.role === "INSTRUCTOR"
            ? "bg-blue-50 text-blue-700 border border-blue-200"
            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}>
          {activeContext.role === "INSTRUCTOR" ? "Instructor" : "Aprendiz"}
        </span>
        <span className="truncate max-w-[130px] sm:max-w-[190px]">
          Ficha: {activeContext.ficha_code || "—"}
        </span>
        <IconChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/80 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Contextos y Fichas Asignadas</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Selecciona para alternar programa y rol</p>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {effectiveContexts.map((ctx: any, idx: number) => {
              const isSelected = (ctx.ficha_id === activeContext.ficha_id && ctx.role === activeContext.role) ||
                                (ctx.ficha_code === activeContext.ficha_code && ctx.role === activeContext.role);
              const isInst = ctx.role === "INSTRUCTOR";
              return (
                <button
                  key={ctx.ficha_id || idx}
                  type="button"
                  onClick={() => handleSelectContext(ctx)}
                  className={`w-full text-left px-3.5 py-2.5 flex items-start justify-between gap-2.5 transition-colors cursor-pointer ${
                    isSelected ? "bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100" : "hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isInst ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {isInst ? "Instructor" : "Aprendiz"}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        Ficha: {ctx.ficha_code || "—"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {ctx.program_name} {isInst ? "(Instructor)" : "(Aprendiz)"}
                    </p>
                  </div>
                  {isSelected && <IconCheck size={16} className="text-emerald-600 shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ContextSwitcher;
