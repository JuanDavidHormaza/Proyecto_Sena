import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Clock, FileQuestion, Award, ChevronRight, Sparkles } from "lucide-react";
import senaLogo from "../../asset/logo.png";


export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-sena-green/25 overflow-hidden">
                <img src={senaLogo} alt="SENA" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">English Level Test</h1>
                <p className="text-xs text-muted-foreground">Plataforma SENA</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-sena-blue text-white rounded-xl hover:bg-sena-blue-light transition-all duration-300 font-medium shadow-lg shadow-sena-blue/25"
            >
              Ingresar
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
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
                <Sparkles className="w-4 h-4" />
                Evaluacion Interactiva
              </div>
              
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight text-balance">
                Evalua tu Nivel de{" "}
                <span className="text-sena-green">Ingles</span>
              </h2>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
                Completa un cuestionario interactivo y descubre tu nivel linguistico en minutos. 
                Recibe retroalimentacion personalizada de tus docentes.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  onClick={() => navigate("/register")}
                  className="flex items-center justify-center gap-2 bg-sena-green text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-sena-green-dark transition-all duration-300 shadow-xl shadow-sena-green/30 hover:shadow-sena-green/40 hover:-translate-y-0.5"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Comenzar Evaluacion
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
                <motion.button
                  onClick={() => navigate("/login")}
                  className="flex items-center justify-center gap-2 bg-white text-sena-blue px-8 py-4 rounded-xl text-lg font-semibold border-2 border-sena-blue/20 hover:border-sena-blue/40 transition-all duration-300 hover:-translate-y-0.5"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Ya tengo cuenta
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
                  <div className="w-14 h-14 bg-sena-green/10 rounded-xl flex items-center justify-center">
                    <img src={senaLogo} alt="SENA" className="h-10 w-10 object-contain" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-foreground">0</p>
                    <p className="text-muted-foreground">Estudiantes evaluados</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="bg-white rounded-2xl p-5 shadow-xl border border-border"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-12 h-12 bg-sena-blue/10 rounded-xl flex items-center justify-center mb-3">
                  <img src={senaLogo} alt="SENA" className="h-9 w-9 object-contain" />
                </div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Programas SENA</p>
              </motion.div>

              <motion.div
                className="bg-white rounded-2xl p-5 shadow-xl border border-border"
                whileHover={{ y: -5 }}
                transition={{ duration: 0.3 }}
              >
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center mb-3">
                  <img src={senaLogo} alt="SENA" className="h-9 w-9 object-contain" />
                </div>
                <p className="text-2xl font-bold text-foreground">0%</p>
                <p className="text-sm text-muted-foreground">Satisfaccion</p>
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
              Como funciona la evaluacion
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Un proceso simple y efectivo para conocer tu nivel de ingles
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Tiempo del quiz",
                description: "El tiempo se registra automaticamente cuando el estudiante finaliza la evaluacion.",
                color: "sena-green",
                delay: 0.1,
              },
              {
                icon: FileQuestion,
                title: "Preguntas por nivel",
                description: "La evaluacion avanza por A1, A2, B1 y B2 con preguntas, escritura y audio.",
                color: "sena-blue",
                delay: 0.2,
              },
              {
                icon: Award,
                title: "Resultado",
                description: "Al terminar el ultimo nivel se muestra la pagina de resultados con datos reales.",
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
                  <feature.icon className={`w-8 h-8 text-${feature.color}`} />
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

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                level: "Basico",
                range: "A1 - A2",
                percentage: "0% - 40%",
                color: "#E21B3C",
                description: "Conocimientos fundamentales del idioma",
              },
              {
                level: "Intermedio",
                range: "B1 - B2",
                percentage: "41% - 70%",
                color: "#D89E00",
                description: "Comunicacion en situaciones cotidianas",
              },
              {
                level: "Avanzado",
                range: "C1 - C2",
                percentage: "71% - 100%",
                color: "#39A900",
                description: "Dominio fluido del idioma",
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
              <img src={senaLogo} alt="SENA" className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-white object-contain p-2" />
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                Listo para conocer tu nivel?
              </h3>
              <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
                Inicia la evaluacion y guarda tus resultados reales en la plataforma.
              </p>
              <motion.button
                onClick={() => navigate("/register")}
                className="inline-flex items-center gap-2 bg-white text-sena-green px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-xl"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Comenzar Ahora
                <ChevronRight className="w-5 h-5" />
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
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-border overflow-hidden">
                <img src={senaLogo} alt="SENA" className="h-8 w-8 object-contain" />
              </div>
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
