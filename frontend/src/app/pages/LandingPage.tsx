import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  IconUsers,
  IconBooks,
  IconCertificate,
  IconAward,
  IconPlayerPlay,
  IconLogin,
  IconLayoutDashboard,
  IconArrowRight,
  IconSparkles,
  IconClock,
  IconHelp,
  IconLanguage,
  IconWheelchair,
  IconUserCheck,
} from "@tabler/icons-react";
import { useAuth } from "../context/AuthContext";
import { BrandLogo } from "../components/BrandLogo";

export function LandingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // Detección estricta y obligatoria de sesión activa:
  // Condición 1: Token existente y no vacío en sessionStorage o localStorage
  // Condición 2: isAuthenticated === true y user !== null
  const token = typeof window !== "undefined"
    ? (sessionStorage.getItem("accessToken") ||
       sessionStorage.getItem("access_token") ||
       sessionStorage.getItem("token") ||
       localStorage.getItem("accessToken") ||
       localStorage.getItem("access_token") ||
       localStorage.getItem("token"))
    : null;

  const hasValidSession = Boolean(
    token &&
    String(token).trim() !== "" &&
    token !== "null" &&
    token !== "undefined" &&
    isAuthenticated === true &&
    user !== null &&
    user?.id
  );

  const getDashboardPath = () => {
    const role = (user?.role || sessionStorage.getItem("userRole") || "").toLowerCase();
    if (role === "admin" || role === "superadmin") return "/admin";
    if (role === "teacher") return "/teacher";
    return "/dashboard";
  };

  const handleStartExamCTA = () => {
    if (hasValidSession) {
      navigate(getDashboardPath());
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white overflow-x-hidden selection:bg-[#39A900]/20 selection:text-[#39A900]">
      {/* ── Header Global Responsivo ── */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 sm:h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
          {/* Identidad de marca WorkLex y SENA */}
          <div className="flex-shrink-0 flex items-center">
            <BrandLogo
              size="md"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            />
          </div>

          {/* Botón de navegación dinámico SaaS según estado de sesión */}
          <div className="flex items-center gap-2.5">
            {hasValidSession ? (
              <button
                type="button"
                onClick={() => navigate(getDashboardPath())}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm hover:shadow transition-all cursor-pointer active:scale-98"
                title="Ir a mi panel principal de WorkLex"
              >
                <IconLayoutDashboard size={18} stroke={2} />
                <span>Ir a mi Panel</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
                >
                  <IconLogin size={16} stroke={2} />
                  <span>Iniciar Sesión</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs hover:shadow transition-all cursor-pointer active:scale-98"
                >
                  <span>Registrarse</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section (Mobile-First Real & 60/40 Desktop) ── */}
      <section className="pt-28 sm:pt-36 lg:pt-40 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Fondo decorativo sutil */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            
            {/* ── LADO IZQUIERDO: 60% en escritorio (lg:col-span-7) ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7 flex flex-col items-start w-full text-left"
            >
              {/* Badge temático */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold mb-5 shadow-2xs">
                <IconSparkles size={16} stroke={2} className="text-[#39A900]" />
                <span>Evaluación Interactiva SENA</span>
              </div>

              {/* Título Principal */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white mb-5 tracking-tight leading-[1.15] text-balance">
                Evalúa tu Nivel de{" "}
                <span className="text-[#39A900]">Inglés Técnico</span>
              </h1>

              {/* Descripción */}
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-xl">
                Completa un cuestionario adaptativo y descubre tu nivel de competencia lingüística en minutos. Recibe retroalimentación personalizada avalada por instructores SENA.
              </p>

              {/* Botones de Acción Móvil-First */}
              <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleStartExamCTA}
                  className="w-full sm:w-auto h-12 px-6 sm:px-8 bg-[#39A900] hover:bg-[#2e8600] text-white rounded-xl text-base font-bold transition-all shadow-md hover:shadow-lg hover:shadow-[#39A900]/25 flex items-center justify-center cursor-pointer active:scale-98"
                >
                  <IconPlayerPlay size={20} stroke={2} className="mr-2" />
                  <span>Comenzar Evaluación</span>
                </button>

                {hasValidSession ? (
                  <button
                    type="button"
                    onClick={() => navigate(getDashboardPath())}
                    className="w-full sm:w-auto h-12 px-6 sm:px-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-900 dark:text-white rounded-xl text-base font-bold border border-slate-300 dark:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <IconLayoutDashboard size={20} stroke={1.8} className="text-[#39A900]" />
                    <span>Continuar a mi formación</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-base shadow-sm transition-all dark:bg-slate-800 dark:hover:bg-slate-700/60 dark:border-slate-700 dark:text-white cursor-pointer active:scale-98"
                  >
                    <IconLogin size={20} stroke={2} className="text-slate-600 dark:text-slate-300" />
                    <span>Iniciar Sesión</span>
                  </button>
                )}
              </div>
            </motion.div>

            {/* ── LADO DERECHO: 40% en escritorio (lg:col-span-5) ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="lg:col-span-5 w-full"
            >
              {/* Tarjetas Estadísticas Estilo MatDash (Vertical en móvil < 768px: grid-cols-1 sm:grid-cols-3 lg:grid-cols-1) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 w-full">
                {/* Tarjeta 1: Aprendices evaluados */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 flex items-center justify-between group cursor-default">
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                      1,250+
                    </p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Aprendices evaluados
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                    <IconUsers size={28} stroke={1.6} />
                  </div>
                </div>

                {/* Tarjeta 2: Programas SENA */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 flex items-center justify-between group cursor-default">
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                      24
                    </p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Programas SENA
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                    <IconBooks size={28} stroke={1.6} />
                  </div>
                </div>

                {/* Tarjeta 3: Satisfacción General */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 flex items-center justify-between group cursor-default">
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                      98%
                    </p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Satisfacción General
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center transition-transform group-hover:scale-105 shrink-0">
                    <IconCertificate size={28} stroke={1.6} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Features Section: Cómo Funciona ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/70 dark:bg-slate-900/50 border-y border-slate-200/80 dark:border-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">
              Cómo funciona la evaluación
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Un proceso ágil y riguroso para medir con exactitud tu comprensión técnica en inglés.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                icon: IconClock,
                title: "Tiempo controlado",
                description: "Cronometraje dinámico por pregunta para simular entornos profesionales reales.",
                iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
              },
              {
                icon: IconHelp,
                title: "Preguntas por nivel",
                description: "Evaluación adaptativa estructurada en módulos A1, A2, B1 y B2 con audio y código.",
                iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
              },
              {
                icon: IconAward,
                title: "Certificación inmediata",
                description: "Resultados instantáneos con desglose porcentual por competencia y retroalimentación.",
                iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800/90 rounded-2xl p-6 sm:p-7 shadow-xs hover:shadow-md border border-slate-200/90 dark:border-slate-700/80 transition-all flex flex-col items-start"
              >
                <div className={`w-12 h-12 ${feature.iconBg} rounded-xl flex items-center justify-center mb-5 shrink-0`}>
                  <feature.icon size={24} stroke={1.8} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Levels Section: MCER ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">
              Niveles de Evaluación
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Alineado con el Marco Común Europeo de Referencia para las Lenguas (MCER).
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                level: "Principiante",
                range: "A1",
                percentage: "0% - 59%",
                color: "#E21B3C",
                description: "Fundamentos del idioma y vocabulario técnico esencial.",
              },
              {
                level: "Elemental",
                range: "A2",
                percentage: "60% - 64%",
                color: "#FF6B00",
                description: "Comprensión de instrucciones y flujos de software básicos.",
              },
              {
                level: "Intermedio",
                range: "B1",
                percentage: "65% - 69%",
                color: "#D89E00",
                description: "Comunicación técnica y resolución práctica de problemas.",
              },
              {
                level: "Intermedio Alto",
                range: "B2",
                percentage: "70% - 100%",
                color: "#39A900",
                description: "Dominio profesional y comunicación fluida en tecnología.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200/90 dark:border-slate-700 hover:shadow-lg transition-all"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: item.color }}
                />
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: `${item.color}15`, color: item.color }}
                    >
                      {item.range}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.percentage}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{item.level}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final Call To Action ── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden bg-gradient-to-br from-[#39A900] to-[#256f00] rounded-3xl p-8 sm:p-14 text-center text-white shadow-2xl"
          >
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-6 h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl">
                <IconLanguage size={36} stroke={2} className="text-white" />
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold mb-4 text-balance tracking-tight">
                ¿Listo para certificar tus competencias?
              </h2>
              <p className="text-base sm:text-lg opacity-90 mb-8 max-w-xl leading-relaxed">
                Inicia la evaluación interactiva y recibe el diagnóstico de tus habilidades técnicas en inglés.
              </p>
              <button
                type="button"
                onClick={handleStartExamCTA}
                className="inline-flex items-center gap-2.5 bg-white text-[#39A900] hover:bg-slate-50 px-8 py-4 rounded-xl text-base sm:text-lg font-bold transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer"
              >
                <IconPlayerPlay size={20} stroke={2} className="fill-current" />
                <span>Comenzar Ahora</span>
                <IconArrowRight size={20} stroke={2.5} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer con Integración de Accesibilidad ── */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center">
              <BrandLogo size="md" showSena={true} />
              <span className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-3 shrink-0 hidden sm:block" />
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Ecosistema Digital de Formación Profesional
              </p>
            </div>

            {/* Accesibilidad discreta e integrada */}
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("toggle-worklex-accessibility"))}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                title="Abrir panel de accesibilidad universal"
              >
                <IconWheelchair size={18} stroke={1.8} className="text-[#39A900]" />
                <span>Accesibilidad Visual</span>
              </button>
              <p className="text-xs text-slate-400 dark:text-slate-500">© 2026 WorkLex</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
