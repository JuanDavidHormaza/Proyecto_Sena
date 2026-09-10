import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ChevronRight, Sparkles, ShieldCheck, Headphones } from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { IconStudent, IconBook, IconGear, IconTimer, IconQuiz, IconTrophy } from "../components/BrandIcons";
import { IconBadge } from "../components/ui/icon-badge";

// =======================================================================
// LandingPage — piloto del nuevo lenguaje visual (estilo plantilla):
// cards con radios grandes, sombras suaves y difusas, íconos en círculos
// de color sólido en vez de cajas cuadradas con tinte. El logo de WorkLex
// (BrandLogo) se mantiene intacto.
// =======================================================================

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 gradient-brand backdrop-blur-lg border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <BrandLogo height="h-11" />
              <div>
                <h1 className="text-xl font-semibold text-white">English Level Test</h1>
                <p className="text-xs text-white/65">Plataforma SENA</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:flex items-center gap-2 px-6 py-2.5 bg-worklex-orange text-white rounded-full hover:bg-worklex-orange-dark transition-all duration-300 font-medium shadow-brand"
            >
              Ingresar
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 bg-gradient-to-br from-sena-green/8 via-transparent to-sena-blue/6" />
        <div className="decor-blob top-10 right-[-6rem] w-[26rem] h-[26rem] bg-sena-green/15" />
        <div className="decor-blob bottom-[-4rem] left-[-4rem] w-[24rem] h-[24rem] bg-sena-blue/10" />

        <div className="container mx-auto max-w-6xl relative">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-sena-green/10 text-sena-green rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Evaluación Interactiva
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight text-balance">
                Evalúa tu Nivel de{" "}
                <span className="text-sena-green">Inglés</span>
              </h2>

              <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-lg">
                Completa un cuestionario interactivo y descubre tu nivel lingüístico en minutos.
                Recibe retroalimentación personalizada de tus docentes.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <motion.button
                  onClick={() => navigate("/register")}
                  className="flex items-center justify-center gap-2 bg-worklex-orange text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-worklex-orange-dark transition-all duration-300 shadow-brand hover:-translate-y-0.5"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Comenzar Evaluación
                  <ChevronRight className="w-5 h-5" />
                </motion.button>
                <motion.button
                  onClick={() => navigate("/login")}
                  className="flex items-center justify-center gap-2 bg-white text-sena-blue px-8 py-4 rounded-full text-lg font-semibold border-2 border-sena-blue/15 hover:border-sena-blue/30 transition-all duration-300 hover:-translate-y-0.5"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Ya tengo cuenta
                </motion.button>
              </div>

              {/* Trust row: íconos circulares + texto corto, como en la plantilla */}
              <div className="flex flex-wrap items-center gap-5">
                {[
                  { Icon: ShieldCheck, tone: "green-soft" as const, label: "Datos protegidos" },
                  { Icon: Headphones, tone: "blue-soft" as const, label: "Audio real MCER" },
                ].map(({ Icon, tone, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <IconBadge tone={tone} size="sm">
                      <Icon />
                    </IconBadge>
                    <span className="text-sm text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right - Stat cards flotantes con íconos circulares */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative"
            >
              <div className="relative surface-card p-8 shadow-soft-lg rotate-1">
                <div className="flex items-center gap-3 mb-6">
                  <BrandLogo height="h-12" />
                  <div>
                    <p className="font-semibold text-foreground">WorkLex English</p>
                    <p className="text-xs text-muted-foreground">Resumen de la plataforma</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {[
                    { value: "0", label: "Estudiantes evaluados", tone: "blue" as const, Icon: IconStudent },
                    { value: "0", label: "Programas SENA activos", tone: "green" as const, Icon: IconBook },
                    { value: "0%", label: "Satisfacción general", tone: "orange" as const, Icon: IconGear },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: 0.5 + i * 0.12 }}
                      className="flex items-center gap-4 rounded-2xl bg-muted/40 px-5 py-4"
                    >
                      <IconBadge tone={stat.tone} size="lg">
                        <stat.Icon size={22} />
                      </IconBadge>
                      <div>
                        <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                        <p className="text-muted-foreground text-sm">{stat.label}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Badge flotante decorativo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.9 }}
                className="absolute -bottom-6 -left-6 surface-card px-5 py-4 shadow-soft-lg flex items-center gap-3"
              >
                <IconBadge tone="white" size="md">
                  <IconTrophy size={20} className="text-sena-green" />
                </IconBadge>
                <div>
                  <p className="text-sm font-semibold text-foreground">MCER A1 → B2</p>
                  <p className="text-xs text-muted-foreground">4 niveles reales</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-muted">
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
                title: "Tiempo del quiz",
                description: "El tiempo se registra automáticamente cuando el estudiante finaliza la evaluación.",
                tone: "green" as const,
                Icon: IconTimer,
                delay: 0.1,
              },
              {
                title: "Preguntas por nivel",
                description: "La evaluación avanza por A1, A2, B1 y B2 con lectura, escritura, escucha y gramática.",
                tone: "blue" as const,
                Icon: IconQuiz,
                delay: 0.2,
              },
              {
                title: "Resultado",
                description: "Al terminar el último nivel se muestra la página de resultados con datos reales.",
                tone: "orange" as const,
                Icon: IconTrophy,
                delay: 0.3,
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: feature.delay }}
                className="surface-card p-7 hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-300"
              >
                <IconBadge tone={feature.tone} size="xl" className="mb-5">
                  <feature.Icon size={30} />
                </IconBadge>
                <h4 className="text-lg font-semibold text-foreground mb-3">{feature.title}</h4>
                <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
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
              Niveles de Evaluación
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Basado en el Marco Común Europeo de Referencia para las Lenguas (MCER)
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                level: "Básico",
                range: "A1 - A2",
                percentage: "Dificultad 2 - 5",
                color: "#C45D55",
                description: "Vocabulario fundamental y escritura guiada del diccionario ADSO.",
              },
              {
                level: "Intermedio",
                range: "B1",
                percentage: "Dificultad 6 - 7",
                color: "#C4943B",
                description: "Escritura, escucha, gramática y habla combinadas en cada intento.",
              },
              {
                level: "Avanzado",
                range: "B2",
                percentage: "Dificultad 8 - 9",
                color: "#3F8F5B",
                description: "Las 4 destrezas MCER con el vocabulario técnico más exigente.",
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="surface-card p-6 group hover:shadow-soft-lg transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm"
                    style={{ backgroundColor: `${item.color}1A`, color: item.color }}
                  >
                    {item.range}
                  </span>
                  <span className="text-sm text-muted-foreground">{item.percentage}</span>
                </div>
                <h4 className="text-2xl font-bold text-foreground mb-2">{item.level}</h4>
                <p className="text-muted-foreground">{item.description}</p>
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
            className="relative overflow-hidden gradient-brand rounded-[2rem] p-12 text-center text-white shadow-soft-lg"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOSAxLjc5MS00IDQtNHM0IDEuNzkxIDQgNC0xLjc5MSA0LTQgNC00LTEuNzkxLTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

            <div className="relative z-10">
              <div className="mx-auto mb-6 flex justify-center">
                <BrandLogo height="h-24" boxed />
              </div>
              <h3 className="text-3xl md:text-4xl font-bold mb-4 text-balance">
                ¿Listo para conocer tu nivel?
              </h3>
              <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
                Inicia la evaluación y guarda tus resultados reales en la plataforma.
              </p>
              <motion.button
                onClick={() => navigate("/register")}
                className="inline-flex items-center gap-2 bg-white text-sena-green px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-soft-lg"
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
              <BrandLogo height="h-11" />
              <div>
                <p className="font-semibold text-foreground">English Level Test</p>
                <p className="text-sm text-muted-foreground">SENA - 2026</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Plataforma educativa para la evaluación de competencias en inglés
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
