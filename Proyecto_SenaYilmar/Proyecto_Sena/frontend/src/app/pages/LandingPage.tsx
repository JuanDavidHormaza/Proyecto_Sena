import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  Clock,
  FileQuestion,
  Award,
  Sparkles,
  GraduationCap,
  Layers,
  Trophy,
  Languages,
  PlayCircle,
  ArrowRight,
  UserCheck,
  LogIn,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

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
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-border">
        <div className="w-full flex items-center justify-between px-4 sm:px-8 py-4 transition-all duration-300">
          <div className="flex-shrink-0 flex items-center gap-3">
            <img
              src="/worklex.png"
              alt="WorkLex SENA"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-500/30 shadow-md transition-transform hover:scale-105 flex-shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-foreground leading-tight truncate">
                English Level Test
              </h1>
              <p className="text-[11px] sm:text-xs text-muted-foreground font-medium truncate">
                Plataforma SENA
              </p>
            </div>
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
            className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
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
        <div className="absolute top-20 right-0 w-96 h-96 bg-sena-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sena-blue/10 rounded-full blur-3xl" />

        <div className="container mx-auto max-w-6xl relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sena-green/10 text-sena-green rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" strokeWidth={2} />
                Evaluación Interactiva
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight text-balance">
                Evalúa tu Nivel de{" "}
                <span className="text-sena-green">Inglés</span>
              </h2>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
                Completa un cuestionario interactivo y descubre tu nivel lingüístico en minutos. 
                Recibe retroalimentación personalizada de tus instructores.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={handleStartExamCTA}
                  className="flex items-center justify-center gap-2 bg-sena-green text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-sena-green-dark transition-all duration-300 shadow-xl shadow-sena-green/30 hover:shadow-sena-green/40 hover:-translate-y-0.5 cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <PlayCircle className="w-5 h-5 mr-1" strokeWidth={2} />
                  <span>Comenzar Evaluación</span>
                  <ArrowRight className="w-5 h-5 ml-1" strokeWidth={2} />
                </motion.button>
                <motion.button
                  onClick={() => navigate("/login")}
                  className="flex items-center justify-center gap-2 bg-white text-sena-blue px-8 py-4 rounded-xl text-lg font-semibold border-2 border-sena-blue/20 hover:border-sena-blue/40 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <UserCheck className="w-5 h-5" strokeWidth={2} />
                  <span>Ya tengo cuenta</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Right - Stats Cards */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-2 gap-4"
            >
              <motion.div
                className="col-span-2 bg-white rounded-2xl p-6 shadow-xl border border-border"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                    <GraduationCap className="w-6 h-6 text-blue-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">0</p>
                    <p className="text-muted-foreground">Aprendices evaluados</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white rounded-2xl p-5 shadow-xl border border-border"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-green-600 mb-3 shadow-xs">
                  <Layers className="w-6 h-6 text-green-600" strokeWidth={2} />
                </div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Programas SENA</p>
              </motion.div>

              <motion.div
                className="bg-white rounded-2xl p-5 shadow-xl border border-border"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
                  <Trophy className="w-6 h-6 text-amber-500" strokeWidth={2} />
                </div>
                <p className="text-2xl font-bold text-foreground">0%</p>
                <p className="text-sm text-muted-foreground">Satisfacción</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4 text-balance">
              Cómo funciona la evaluación
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Un proceso simple y efectivo para conocer tu nivel de inglés
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Tiempo del quiz",
                description: "El tiempo se registra automáticamente cuando el aprendiz finaliza la evaluación.",
                color: "sena-green",
                delay: 0.1,
              },
              {
                icon: FileQuestion,
                title: "Preguntas por nivel",
                description: "La evaluación avanza por A1, A2, B1 y B2 con preguntas, escritura y audio.",
                color: "sena-blue",
                delay: 0.2,
              },
              {
                icon: Award,
                title: "Resultado",
                description: "Al terminar el último nivel se muestra la página de resultados con datos reales.",
                color: "warning",
                delay: 0.3,
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: feature.delay }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-border hover:shadow-xl transition-all duration-300 group"
              >
                <div className={`w-16 h-16 bg-${feature.color}/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`w-8 h-8 text-${feature.color}`} strokeWidth={2} />
                </div>
                <h4 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
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
                className="relative overflow-hidden bg-white rounded-2xl p-6 shadow-lg border border-border group hover:shadow-xl transition-all duration-300"
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
      <footer className="py-8 px-6 border-t border-border bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/worklex.png"
                alt="WorkLex"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-500/30 shadow-md transition-transform hover:scale-105 flex-shrink-0"
              />
              <div>
                <p className="font-semibold text-foreground">English Level Test</p>
                <p className="text-sm text-muted-foreground">SENA - 2026</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Plataforma educativa para la evaluacion de competencias en ingles
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
