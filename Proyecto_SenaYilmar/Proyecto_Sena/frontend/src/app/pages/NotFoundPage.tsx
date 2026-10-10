import React from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Compass,
  Home,
  ArrowLeft,
  BookOpen,
  FileQuestion,
  LogIn,
  Search,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function NotFoundPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Redirección inteligente al dashboard según el rol del usuario
  const getDashboardPath = () => {
    if (!isAuthenticated || !user) return "/login";
    switch (user.role) {
      case "teacher":
        return "/teacher";
      case "admin":
      case "superadmin":
        return "/admin";
      default:
        return "/dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex flex-col justify-between text-slate-800 relative overflow-hidden">
      {/* Elementos decorativos de fondo con colores SENA */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-sena-green/10 via-sena-blue/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header simplificado */}
      <header className="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src="/worklex.png"
              alt="WorkLex SENA"
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500/30 shadow-xs group-hover:scale-105 transition-transform"
            />
            <div>
              <span className="font-bold text-base text-slate-900 block leading-tight">
                Worklex SENA
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                English Evaluation & Technical Practice
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(getDashboardPath())}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-sena-green" />
            <span className="hidden sm:inline">
              {isAuthenticated ? "Mi Panel" : "Iniciar Sesión"}
            </span>
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 relative z-10">
        <div className="max-w-2xl w-full text-center">
          {/* Badge 404 animado */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative inline-block mb-4"
          >
            <div className="text-8xl sm:text-9xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sena-blue via-emerald-600 to-sena-green select-none">
              404
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-white border border-slate-200/90 rounded-full shadow-md text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
              <Compass className="w-3.5 h-3.5 text-sena-green animate-spin" style={{ animationDuration: "8s" }} />
              <span>Ruta no encontrada</span>
            </div>
          </motion.div>

          {/* Título y descripción */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 tracking-tight">
              Página no encontrada en Worklex
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-lg mx-auto mb-8 leading-relaxed">
              La dirección URL a la que intentas acceder no existe, ha sido movida o la sesión ha cambiado. Puedes volver a tu panel o consultar los módulos habilitados.
            </p>
          </motion.div>

          {/* Botones de acción principales */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la página anterior</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(getDashboardPath())}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sena-green hover:bg-sena-green/90 text-white font-bold text-sm transition shadow-md shadow-sena-green/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>
                {isAuthenticated ? "Ir al Panel Principal" : "Ir a Iniciar Sesión"}
              </span>
            </button>
          </motion.div>

          {/* Tarjetas de acceso rápido sugeridas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-left pt-6 border-t border-slate-200/80"
          >
            <div
              onClick={() => navigate(isAuthenticated ? "/quiz" : "/login")}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <FileQuestion className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 mb-0.5">Simulacro de Nivel</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Evalúa tu nivel progresivo CEFR A1 a B2.
              </p>
            </div>

            <div
              onClick={() => navigate(isAuthenticated ? "/dictionary" : "/login")}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-sena-blue flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <BookOpen className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 mb-0.5">Vocabulario Técnico</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Términos contextualizados por programa SENA.
              </p>
            </div>

            <div
              onClick={() => navigate("/")}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <Search className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 mb-0.5">Inicio Worklex</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">
                Información general de la plataforma formativa.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer discreto */}
      <footer className="w-full border-t border-slate-200/80 py-4 text-center text-xs text-muted-foreground bg-white/50">
        <p>Servicio Nacional de Aprendizaje SENA • Worklex Plataforma de Bilingüismo</p>
      </footer>
    </div>
  );
}

export default NotFoundPage;
