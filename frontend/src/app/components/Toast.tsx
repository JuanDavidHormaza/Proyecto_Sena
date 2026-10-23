import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string, action?: ToastAction, duration?: number) => void;
  success: (message: string, title?: string, action?: ToastAction) => void;
  warning: (message: string, title?: string, action?: ToastAction) => void;
  error: (message: string, title?: string, action?: ToastAction) => void;
  info: (message: string, title?: string, action?: ToastAction) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalToastHandler: ((type: ToastType, message: string, title?: string, action?: ToastAction, duration?: number) => void) | null = null;

export const toast = {
  success: (message: string, title?: string, action?: ToastAction) => globalToastHandler?.("success", message, title, action),
  warning: (message: string, title?: string, action?: ToastAction) => globalToastHandler?.("warning", message, title, action),
  error: (message: string, title?: string, action?: ToastAction) => globalToastHandler?.("error", message, title, action),
  info: (message: string, title?: string, action?: ToastAction) => globalToastHandler?.("info", message, title, action),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, action?: ToastAction, duration = 4500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, action, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  globalToastHandler = showToast;

  const success = useCallback((msg: string, title?: string, action?: ToastAction) => showToast("success", msg, title, action), [showToast]);
  const warning = useCallback((msg: string, title?: string, action?: ToastAction) => showToast("warning", msg, title, action), [showToast]);
  const error = useCallback((msg: string, title?: string, action?: ToastAction) => showToast("error", msg, title, action), [showToast]);
  const info = useCallback((msg: string, title?: string, action?: ToastAction) => showToast("info", msg, title, action), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, warning, error, info, removeToast }}>
      {children}
      {/* Toast Viewport Container */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const styles = {
              success: {
                bg: "bg-white",
                border: "border-emerald-200/90",
                badgeBg: "bg-emerald-50 text-emerald-600",
                textTitle: "text-emerald-950",
                textBody: "text-emerald-800/90",
                shadow: "shadow-emerald-900/5",
                icon: CheckCircle2,
              },
              warning: {
                bg: "bg-white",
                border: "border-amber-200/90",
                badgeBg: "bg-amber-50 text-amber-600",
                textTitle: "text-amber-950",
                textBody: "text-amber-800/90",
                shadow: "shadow-amber-900/5",
                icon: AlertTriangle,
              },
              error: {
                bg: "bg-white",
                border: "border-rose-200/90",
                badgeBg: "bg-rose-50 text-rose-600",
                textTitle: "text-rose-950",
                textBody: "text-rose-800/90",
                shadow: "shadow-rose-900/5",
                icon: AlertCircle,
              },
              info: {
                bg: "bg-white",
                border: "border-sky-200/90",
                badgeBg: "bg-sky-50 text-sky-600",
                textTitle: "text-sky-950",
                textBody: "text-sky-800/90",
                shadow: "shadow-sky-900/5",
                icon: Info,
              },
            }[t.type];

            const Icon = styles.icon;

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.95 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className={`pointer-events-auto w-full rounded-2xl border p-4 shadow-xl ${styles.bg} ${styles.border} ${styles.shadow} flex items-start gap-3 backdrop-blur-md`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${styles.badgeBg}`}>
                  <Icon className="w-5 h-5" strokeWidth={1.8} />
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  {t.title && (
                    <h4 className={`text-sm font-bold tracking-tight mb-0.5 ${styles.textTitle}`}>{t.title}</h4>
                  )}
                  <p className={`text-xs font-medium leading-relaxed ${styles.textBody}`}>{t.message}</p>

                  {t.action && (
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          t.action?.onClick();
                          removeToast(t.id);
                        }}
                        className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        {t.action.label}
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 cursor-pointer"
                  aria-label="Cerrar notificación"
                >
                  <X className="w-4 h-4" strokeWidth={1.8} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
