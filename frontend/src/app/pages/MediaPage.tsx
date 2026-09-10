import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Image, ChevronRight } from "lucide-react";

import { UnifiedMediaDictionary } from "../components/UnifiedMediaDictionary";
import { BrandLogo } from "../components/BrandLogo";

// ─── Página de Medios ────────────────────────────────────────────────────────
// Reutiliza el Diccionario Multimedia Unificado (la misma vista del panel del
// estudiante) para que todo el contenido multimedia quede "empaquetado" en una
// sola pantalla: palabra + imagen + audio + video, con carga optimizada.

export function MediaPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header (igual al LandingPage) ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <BrandLogo height="h-14" />
              <div>
                <h1 className="text-xl font-semibold text-foreground">English Level Test</h1>
                <p className="text-xs text-muted-foreground">Plataforma SENA</p>
              </div>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-sena-blue text-white rounded-full hover:bg-sena-blue-light transition-all duration-300 font-medium shadow-lg shadow-sena-blue/25"
            >
              Ingresar
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </header>

      {/* ── Hero de la sección ── */}
      <section className="pt-32 pb-10 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sena-green/5 via-transparent to-sena-blue/5" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-sena-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sena-blue/10 rounded-full blur-3xl" />

        <div className="container mx-auto max-w-6xl relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-sena-green/10 text-sena-green rounded-full text-sm font-medium mb-6">
              <Image className="w-4 h-4" />
              Diccionario
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Recursos{" "}
              <span className="text-sena-green">Visuales y Sonoros</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Explora las palabras con su imagen, audio y video del programa de inglés SENA
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Diccionario Unificado ── */}
      <section className="pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <UnifiedMediaDictionary
            title="Galería Multimedia"
            subtitle="Palabra, imagen, audio y video empaquetados en una sola vista"
          />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-border bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo height="h-10" />
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

export default MediaPage;
