import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Accessibility,
  Type,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Eye,
  Contrast,
  Check,
  X,
  BookOpen,
  Sparkles,
} from "lucide-react";

type ContrastMode = "default" | "high-contrast" | "clean-reading";

export function AccessibilityWidget() {
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const isOpen = accessibilityOpen;
  const setIsOpen = setAccessibilityOpen;

  // 1. Escala tipográfica relativa (% sobre rem del documentElement)
  const [fontScale, setFontScale] = useState<number>(() => {
    const saved = localStorage.getItem("worklex_font_scale");
    return saved ? Number(saved) : 100;
  });

  // 2. Modo de contraste y lectura visual
  const [contrastMode, setContrastMode] = useState<ContrastMode>(() => {
    const saved = localStorage.getItem("worklex_contrast_mode");
    return (saved as ContrastMode) || "default";
  });

  // Aplicar escala de fuente al DOM en unidades relativas
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
    localStorage.setItem("worklex_font_scale", String(fontScale));
  }, [fontScale]);

  // Aplicar modo de contraste al elemento raíz
  useEffect(() => {
    document.documentElement.classList.remove("high-contrast", "clean-reading");
    if (contrastMode === "high-contrast") {
      document.documentElement.classList.add("high-contrast");
    } else if (contrastMode === "clean-reading") {
      document.documentElement.classList.add("clean-reading");
    }
    localStorage.setItem("worklex_contrast_mode", contrastMode);
  }, [contrastMode]);

  const handleIncreaseFont = () => setFontScale((prev) => Math.min(prev + 10, 140));
  const handleDecreaseFont = () => setFontScale((prev) => Math.max(prev - 10, 80));
  const handleReset = () => {
    setFontScale(100);
    setContrastMode("default");
  };

  return (
    <>
      {/* Botón Flotante de Accesibilidad (Muñeco Universal en SVG Puro) */}
      <button
        aria-label="Opciones de Accesibilidad"
        onClick={() => setAccessibilityOpen(!accessibilityOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105 focus:outline-none cursor-pointer z-50"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor" 
          className="w-8 h-8 text-white"
        >
          <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>
        </svg>
      </button>

      {/* Menú Interactivo Desplegable */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-24 right-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-80 sm:w-88 bg-card rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Panel de accesibilidad visual"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-sena-green/15 via-emerald-500/10 to-sena-blue/15 px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sena-green text-white flex items-center justify-center shadow-xs">
                    <Accessibility className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Accesibilidad Visual</h3>
                    <p className="text-[11px] text-muted-foreground">Inclusión & Ergonomía Digital</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" strokeWidth={1.8} />
                </button>
              </div>

              {/* Contenido */}
              <div className="p-5 space-y-5">
                {/* 1. Control de Tamaño de Fuente */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-sena-green" strokeWidth={1.8} />
                      Tamaño de Letra (DOM)
                    </span>
                    <span className="text-xs font-bold text-sena-green bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {fontScale}%
                    </span>
                  </div>

                  {/* Slider */}
                  <input
                    type="range"
                    min="80"
                    max="140"
                    step="5"
                    value={fontScale}
                    onChange={(e) => setFontScale(Number(e.target.value))}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-sena-green"
                    aria-label="Ajustar tamaño de fuente"
                  />

                  {/* Botones de acción rápida */}
                  <div className="grid grid-cols-3 gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={handleDecreaseFont}
                      disabled={fontScale <= 80}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-muted/60 hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                      title="Disminuir tamaño (A-)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.8} />
                      <span>A-</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontScale(100)}
                      className="py-1.5 px-2 bg-muted/60 hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors cursor-pointer"
                      title="Restablecer tamaño normal (100%)"
                    >
                      100%
                    </button>
                    <button
                      type="button"
                      onClick={handleIncreaseFont}
                      disabled={fontScale >= 140}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-muted/60 hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                      title="Aumentar tamaño (A+)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.8} />
                      <span>A+</span>
                    </button>
                  </div>
                </div>

                {/* 2. Modos de Contraste y Lectura */}
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2.5">
                    <Contrast className="w-3.5 h-3.5 text-sena-blue" strokeWidth={1.8} />
                    Modo de Contraste & Lectura
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Estándar */}
                    <button
                      type="button"
                      onClick={() => setContrastMode("default")}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        contrastMode === "default"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-emerald-900 dark:text-emerald-100 shadow-xs ring-2 ring-sena-green/30"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" strokeWidth={1.8} />
                      <span className="text-[11px] font-bold">Estándar</span>
                    </button>

                    {/* Alto Contraste */}
                    <button
                      type="button"
                      onClick={() => setContrastMode("high-contrast")}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        contrastMode === "high-contrast"
                          ? "bg-slate-900 dark:bg-black border-white text-white shadow-xs ring-2 ring-white"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Contrast className={`w-4 h-4 ${contrastMode === "high-contrast" ? "text-white" : "text-foreground"}`} strokeWidth={1.8} />
                      <span className="text-[11px] font-bold">Alto Contraste</span>
                    </button>

                    {/* Lectura Limpia */}
                    <button
                      type="button"
                      onClick={() => setContrastMode("clean-reading")}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        contrastMode === "clean-reading"
                          ? "bg-amber-100 dark:bg-amber-950/50 border-amber-600 text-amber-900 dark:text-amber-100 shadow-xs ring-2 ring-amber-400/40"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <BookOpen className="w-4 h-4 text-amber-700 dark:text-amber-400" strokeWidth={1.8} />
                      <span className="text-[11px] font-bold">Lectura Limpia</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-muted/40 px-5 py-3 border-t border-border flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.8} />
                  <span>Restablecer todo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 bg-sena-green text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
