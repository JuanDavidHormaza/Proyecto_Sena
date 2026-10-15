import React, { Component, ErrorInfo, ReactNode } from "react";
import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { AlertTriangle, RefreshCw, Home, LogIn } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Institucional para Worklex SENA.
 * Captura excepciones no controladas en el árbol de componentes de React,
 * evitando pantallas blancas vacías y proporcionando opciones de recuperación.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary Worklex SENA capturó una excepción:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <InstitutionalErrorFallback
          error={this.state.error}
          onReload={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Componente de fallback visual institucional para errores en tiempo de ejecución.
 */
export function InstitutionalErrorFallback({
  error,
  onReload,
}: {
  error?: Error | null;
  onReload?: () => void;
}) {
  const errorMessage = error?.message || "Se produjo una excepción no controlada en la aplicación.";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center relative overflow-hidden">
        {/* Barra decorativa superior SENA */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-sena-green to-emerald-600" />

        {/* Logo o Escudo SENA */}
        <div className="flex justify-center mb-5 mt-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-sena-green shadow-sm">
            <AlertTriangle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" strokeWidth={1.8} />
          </div>
        </div>

        <span className="text-[11px] font-bold tracking-widest uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
          Worklex SENA — Sistema Protegido
        </span>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mt-4 mb-2">
          Inconveniente Temporal
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6 max-w-md mx-auto">
          El sistema institucional ha contenido un error de ejecución en esta vista para proteger tu sesión. Puedes recargar la aplicación o regresar al inicio de sesión de forma segura.
        </p>

        {/* Mensaje de error técnico colapsable / sutil */}
        <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-3.5 mb-6 text-left border border-slate-200 dark:border-slate-700/60">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            Detalle del evento
          </p>
          <p className="text-xs font-mono text-slate-700 dark:text-slate-300 break-words line-clamp-3">
            {errorMessage}
          </p>
        </div>

        {/* Botones de acción institucional */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onReload ? onReload : () => window.location.reload()}
            className="flex-1 py-3 px-4 bg-sena-green hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recargar Página</span>
          </button>

          <button
            type="button"
            onClick={() => (window.location.href = "/login")}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <LogIn className="w-4 h-4" />
            <span>Ir al Login</span>
          </button>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => (window.location.href = "/")}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Volver a la página principal</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ErrorBoundary específico para React Router (`errorElement`).
 * Utiliza `useRouteError` para capturar errores de carga y renderizado de rutas.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();
  let errorObj: Error | null = null;

  if (isRouteErrorResponse(error)) {
    errorObj = new Error(`${error.status} ${error.statusText}: ${error.data || "Ruta no encontrada"}`);
  } else if (error instanceof Error) {
    errorObj = error;
  } else if (typeof error === "string") {
    errorObj = new Error(error);
  } else {
    errorObj = new Error("Error desconocido al resolver la ruta.");
  }

  return (
    <InstitutionalErrorFallback
      error={errorObj}
      onReload={() => window.location.reload()}
    />
  );
}

export default ErrorBoundary;
