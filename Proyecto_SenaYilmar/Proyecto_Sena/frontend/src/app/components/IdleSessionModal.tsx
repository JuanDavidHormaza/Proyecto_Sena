import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, RefreshCw, LogOut, ShieldAlert } from "lucide-react";

interface IdleSessionModalProps {
  isOpen: boolean;
  formattedRemaining: string;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

export function IdleSessionModal({
  isOpen,
  formattedRemaining,
  onStayLoggedIn,
  onLogout,
}: IdleSessionModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/70 backdrop-blur-md px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200/90 text-center relative overflow-hidden"
            role="alertdialog"
            aria-labelledby="idle-modal-title"
            aria-describedby="idle-modal-description"
          >
            {/* Barra de acento decorativa superior */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-sena-green" />

            {/* Icono con badge pulso */}
            <div className="relative w-16 h-16 mx-auto mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-amber-500/15 animate-ping opacity-60" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100/80 border border-amber-200 flex items-center justify-center shadow-xs">
                <Clock className="w-8 h-8 text-amber-600 animate-pulse" strokeWidth={2} />
              </div>
            </div>

            {/* Título */}
            <h3
              id="idle-modal-title"
              className="text-xl sm:text-2xl font-bold text-slate-900 mb-2.5 tracking-tight"
            >
              Sesión a punto de expirar
            </h3>

            {/* Mensaje descriptivo con contador regresivo destacado */}
            <p
              id="idle-modal-description"
              className="text-sm text-slate-600 mb-6 leading-relaxed"
            >
              Tu sesión expirará por inactividad en{" "}
              <span className="inline-block font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-base shadow-2xs">
                {formattedRemaining}
              </span>
              . ¿Deseas mantenerla abierta?
            </p>

            {/* Insignia de seguridad SENA */}
            <div className="flex items-center justify-center gap-2 mb-6 px-3 py-1.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs text-slate-500">
              <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Protección de seguridad por inactividad en Worklex SENA</span>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto px-4 py-3 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer order-2 sm:order-1"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.8} />
                <span>Cerrar sesión</span>
              </button>

              <button
                type="button"
                onClick={onStayLoggedIn}
                className="w-full flex-1 py-3 px-5 bg-sena-green hover:bg-sena-green/90 text-white rounded-xl font-bold text-sm shadow-md shadow-sena-green/20 transition-all flex items-center justify-center gap-2 cursor-pointer order-1 sm:order-2"
                autoFocus
              >
                <RefreshCw className="w-4 h-4" strokeWidth={2} />
                <span>Continuar conectado</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
