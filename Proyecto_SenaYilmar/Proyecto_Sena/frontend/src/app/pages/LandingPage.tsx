import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  Clock,
  FileQuestion,
  Award,
  Sparkles,
  GraduationCap,
  BookOpen,
  Languages,
  PlayCircle,
  ArrowRight,
  UserCheck,
  LogIn,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { WorklexBrandLogo } from "../components/WorklexBrandLogo";

export function LandingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const hasValidSession = Boolean(isAuthenticated && user && localStorage.getItem("accessToken"));

  const handleStartExamCTA = () => {
    if (hasValidSession) {
      navigate("/quiz");
    } else {
      navigate("/register");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Responsivo */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="w-full h-full flex items-center justify-between px-4 sm:px-8 transition-all duration-300">
          <div className="flex-shrink-0 flex items-center gap-3">
            <WorklexBrandLogo size="md" showText={true} />
            <span className="h-6 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
            <img
              src="/logo-sena.png"
              alt="SENA"
              className="h-8 sm:h-9 w-auto object-contain shrink-0 opacity-90"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (hasValidSession) {
                if (user?.role === "admin" || user?.role === "superadmin") {
                  navigate("/admin");
                } else if (user?.role === "teacher") {
                  navigate("/teacher");
                } else {
                  navigate("/dashboard");
                }
              } else {
                navigate("/login");
              }
            }}
            className="h-10 bg-[#39A900] hover:bg-[#2e8600] text-white font-medium text-sm px-5 rounded-lg shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>{hasValidSession ? "Mi Dashboard" : "Ingresar"}</span>
            <LogIn className="w-4 h-4 ml-1" strokeWidth={2} />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-sena-green/5 via-transparent to-sena-blue/5" />

        <div className="container mx-auto max-w-6xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
                Evaluación Interactiva SENA
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-5 leading-tight text-balance">
                Evalúa tu Nivel de{" "}
                <span className="text-[#39A900]">Inglés Técnico</span>
              </h2>

              <p className="text-base text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-lg">
                Completa un cuestionario interactivo y descubre tu nivel lingüístico en minutos. 
                Recibe retroalimentación personalizada de tus instructores.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleStartExamCTA}
                  className="h-11 px-6 bg-[#39A900] hover:bg-[#2e8600] text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PlayCircle className="w-4 h-4" strokeWidth={2} />
                  <span>Comenzar Evaluación</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="h-11 px-6 bg-white dark:bg-slate-800 text-slate-700 dark:text-white rounded-lg text-sm font-semibold border border-slate-300 dark:border-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" strokeWidth={2} />
                  <span>Ya tengo cuenta</span>
                </button>
              </div>
            </motion.div>

            {/* Right - Stats Cards (MatDash Clean Metric Cards) */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 gap-4"
            >
              <div className="col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
                    <p className="text-xs font-medium text-slate-500">Aprendices evaluados</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3 shrink-0">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">0</p>
                <p className="text-xs font-medium text-slate-500">Programas SENA</p>
              </div>

              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center mb-3 shrink-0">
                  <Award className="w-5 h-5 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">0%</p>
                <p className="text-xs font-medium text-slate-500">Satisfacción</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-slate-50/70 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Cómo funciona la evaluación
            </h3>
            <p className="text-sm text-slate-500 max-w-2xl mx-auto">
              Un proceso simple y efectivo para conocer tu nivel de inglés técnico
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Clock,
                title: "Tiempo del quiz",
                description: "El tiempo se registra automáticamente cuando el aprendiz finaliza la evaluación.",
                iconBg: "bg-emerald-50 text-emerald-600",
              },
              {
                icon: FileQuestion,
                title: "Preguntas por nivel",
                description: "La evaluación avanza por A1, A2, B1 y B2 con preguntas, escritura y audio.",
                iconBg: "bg-blue-50 text-blue-600",
              },
              {
                icon: Award,
                title: "Resultado",
                description: "Al terminar el último nivel se muestra la página de resultados con datos reales.",
                iconBg: "bg-amber-50 text-amber-500",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700"
              >
                <div className={`w-10 h-10 ${feature.iconBg} rounded-lg flex items-center justify-center mb-4`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">{feature.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Levels Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
              Niveles de Evaluacion
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Basado en el Marco Comun Europeo de Referencia para las Lenguas (MCER)
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                level: "Principiante",
                range: "A1",
                percentage: "0% - 59%",
                color: "#E21B3C",
                description: "Fundamentos del idioma y vocabulario técnico esencial",
              },
              {
                level: "Elemental",
                range: "A2",
                percentage: "60% - 64%",
                color: "#FF6B00",
                description: "Comprensión de instrucciones y flujos de software básicos",
              },
              {
                level: "Intermedio",
                range: "B1",
                percentage: "65% - 69%",
                color: "#D89E00",
                description: "Comunicación técnica y resolución de problemas",
              },
              {
                level: "Intermedio Alto",
                range: "B2",
                percentage: "70% - 100%",
                color: "#39A900",
                description: "Dominio profesional y comunicación fluida en tecnología",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative overflow-hidden bg-card rounded-2xl p-6 shadow-lg border border-border group hover:shadow-xl transition-all duration-300"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1.5"
                  style={{ backgroundColor: item.color }}
                />
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-sm font-semibold px-3 py-1 rounded-full"
                      style={{ backgroundColor: `${item.color}20`, color: item.color }}
                    >
                      {item.range}
                    </span>
                    <span className="text-sm text-muted-foreground">{item.percentage}</span>
                  </div>
                  <h4 className="text-2xl font-bold text-foreground mb-2">{item.level}</h4>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative overflow-hidden bg-gradient-to-br from-sena-green to-sena-green-dark rounded-3xl p-12 text-center text-white shadow-2xl"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOSAxLjc5MS00IDQtNHM0IDEuNzkxIDQgNC0xLjc5MSA0LTQgNC00LTEuNzkxLTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
            
            <div className="relative z-10">
              <div className="mx-auto mb-6 h-18 w-18 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl shadow-emerald-950/20">
                <Languages className="w-9 h-9 text-white" strokeWidth={2} />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                Listo para conocer tu nivel?
              </h3>
              <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
                Inicia la evaluacion y guarda tus resultados reales en la plataforma.
              </p>
              <motion.button
                onClick={handleStartExamCTA}
                className="inline-flex items-center gap-2 bg-white text-sena-green px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-xl cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PlayCircle className="w-5 h-5 mr-1" strokeWidth={2} />
                <span>Comenzar Ahora</span>
                <ArrowRight className="w-5 h-5 ml-1" strokeWidth={2} />
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <WorklexBrandLogo
              size="sm"
              showText={true}
              subtitle="SENA - 2026"
            />
            <p className="text-sm text-muted-foreground">
              Plataforma educativa para la evaluacion de competencias en ingles
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
