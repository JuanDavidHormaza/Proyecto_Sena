import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Accessibility,
  Type,
  AArrowDown,
  AArrowUp,
  RotateCcw,
  Sun,
  Contrast,
  BookOpen,
  X,
  Check,
  MoveHorizontal,
  Baseline,
} from "lucide-react";

export type FontSizeLevel = "normal" | "medium" | "large";
export type ContrastMode = "normal" | "high-contrast" | "clean-reading";

// Aplicar escala tipográfica estándar mediante atributo data-font-size en <html>
export const applyGlobalFontScale = (level: FontSizeLevel) => {
  // 1. Limpiar cualquier residuo de zoom o transformación en el DOM
  document.documentElement.style.zoom = "";
  document.body.style.zoom = "";
  document.body.style.transform = "";

  // 2. Establecer atributo estándar data-font-size en <html>
  document.documentElement.setAttribute("data-font-size", level);

  // 3. Persistir en localStorage
  localStorage.setItem("worklex_accessibility_font", level);
  localStorage.setItem("worklex_font_size", level);
};

export const setFontSizeLevel = applyGlobalFontScale;

export function AccessibilityWidget() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // 1. Tamaño de fuente ('normal' | 'medium' | 'large')
  const [fontSize, setFontSize] = useState<FontSizeLevel>(() => {
    const saved = localStorage.getItem("worklex_accessibility_font") || localStorage.getItem("worklex_font_size");
    if (saved === "large" || saved === "medium" || saved === "normal") {
      return saved as FontSizeLevel;
    }
    if (saved === "extra-large") return "large";
    return "normal";
  });

  // 2. Modo de contraste ('normal' | 'high-contrast' | 'clean-reading')
  const [contrastMode, setContrastMode] = useState<ContrastMode>(() => {
    const saved = localStorage.getItem("worklex_accessibility_contrast") || localStorage.getItem("worklex_contrast_mode");
    if (saved === "high-contrast" || saved === "clean-reading") {
      return saved as ContrastMode;
    }
    return "normal";
  });

  // 3. Espaciado para Dislexia (boolean)
  const [dyslexiaSpacing, setDyslexiaSpacing] = useState<boolean>(() => {
    return localStorage.getItem("worklex_accessibility_dyslexia") === "true";
  });

  // 4. Guía horizontal de lectura que sigue el cursor (boolean)
  const [readingGuide, setReadingGuide] = useState<boolean>(() => {
    return localStorage.getItem("worklex_accessibility_guide") === "true";
  });
  const [mouseY, setMouseY] = useState<number>(100);

  // Asegurar montaje en cliente para createPortal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Efecto: aplicar tamaño de fuente
  useEffect(() => {
    applyGlobalFontScale(fontSize);
  }, [fontSize]);

  // Efecto: aplicar modo de contraste
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-contrast", contrastMode);
    root.classList.remove("high-contrast", "clean-reading");

    if (contrastMode === "high-contrast") {
      root.classList.add("high-contrast");
    } else if (contrastMode === "clean-reading") {
      root.classList.add("clean-reading");
    }
    localStorage.setItem("worklex_accessibility_contrast", contrastMode);
  }, [contrastMode]);

  // Efecto: aplicar espaciado de dislexia
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-dyslexia", dyslexiaSpacing ? "true" : "false");
    localStorage.setItem("worklex_accessibility_dyslexia", dyslexiaSpacing ? "true" : "false");
  }, [dyslexiaSpacing]);

  // Efecto: guía de lectura horizontal que sigue el puntero
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-reading-guide", readingGuide ? "true" : "false");
    localStorage.setItem("worklex_accessibility_guide", readingGuide ? "true" : "false");

    if (!readingGuide) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [readingGuide]);

  // Handlers para tamaño de letra
  const handleIncreaseFont = useCallback(() => {
    setFontSize((prev) => {
      if (prev === "normal") return "medium";
      if (prev === "medium") return "large";
      return "large";
    });
  }, []);

  const handleDecreaseFont = useCallback(() => {
    setFontSize((prev) => {
      if (prev === "large") return "medium";
      if (prev === "medium") return "normal";
      return "normal";
    });
  }, []);

  // Restablecer todas las configuraciones a valores por defecto
  const handleReset = useCallback(() => {
    setFontSize("normal");
    setContrastMode("normal");
    setDyslexiaSpacing(false);
    setReadingGuide(false);
  }, []);

  // Eventos globales para abrir/alternar el widget
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("toggle-worklex-accessibility", handleToggle);
    window.addEventListener("open-worklex-accessibility", handleOpen);
    return () => {
      window.removeEventListener("toggle-worklex-accessibility", handleToggle);
      window.removeEventListener("open-worklex-accessibility", handleOpen);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div id="accessibility-panel">
      {/* Guía horizontal de lectura interactiva */}
      {readingGuide && (
        <div
          style={{ top: `${mouseY}px` }}
          className="fixed left-0 right-0 h-1 bg-sena-green/80 pointer-events-none z-[99999] shadow-[0_0_10px_rgba(57,169,0,0.7)] transition-all duration-75"
        >
          <div className="w-full h-8 -mt-3.5 bg-sena-green/5 pointer-events-none border-y border-sena-green/20" />
        </div>
      )}

      {/* Botón Flotante de Accesibilidad (Muñeco Universal SENA en SVG) */}
      <button
        type="button"
        aria-label="Abrir panel de accesibilidad institucional"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-sena-green hover:bg-sena-green-dark text-white shadow-2xl flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-sena-green/30 cursor-pointer z-[99998] transition-transform active:scale-95"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-8 h-8 text-white"
        >
          <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
        </svg>
      </button>

      {/* Panel Flotante Aislado */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-24 right-6 z-[99999]">
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-84 sm:w-92 bg-card text-card-foreground rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Panel de accesibilidad universal Worklex SENA"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-sena-green/15 via-emerald-500/10 to-sena-blue/15 px-5 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-sena-green text-white flex items-center justify-center shadow-xs">
                    <Accessibility className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Accesibilidad Visual</h3>
                    <p className="panel-sub text-[11px] text-muted-foreground">Inclusión & Ergonomía Digital</p>
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

              {/* Contenido Modular */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* 1. Control de Tamaño de Texto */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-sena-green" strokeWidth={1.8} />
                      Tamaño de Texto
                    </span>
                    <span className="badge-text text-[11px] font-bold text-sena-green bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {fontSize === "normal" ? "Normal (100%)" : fontSize === "medium" ? "Mediano (+10%)" : "Grande (+22%)"}
                    </span>
                  </div>
                  <p className="panel-sub text-[11px] text-muted-foreground mb-2.5 leading-snug">
                    Escala el texto de forma fluida y predecible sin deformar contenedores ni mover la cuadrícula.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFontSize("normal")}
                      className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        fontSize === "normal"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-emerald-900 dark:text-emerald-100 font-bold shadow-xs ring-2 ring-sena-green/30"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
                      }`}
                    >
                      <span className="btn-title font-bold text-xs">Normal</span>
                      <span className="btn-desc text-[10px] text-muted-foreground">Base</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSize("medium")}
                      className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        fontSize === "medium"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-emerald-900 dark:text-emerald-100 font-bold shadow-xs ring-2 ring-sena-green/30"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
                      }`}
                    >
                      <span className="btn-title font-bold text-xs">Mediano</span>
                      <span className="btn-desc text-[10px] text-muted-foreground">+10%</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSize("large")}
                      className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        fontSize === "large"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-emerald-900 dark:text-emerald-100 font-bold shadow-xs ring-2 ring-sena-green/30"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
                      }`}
                    >
                      <span className="btn-title font-bold text-xs">Grande</span>
                      <span className="btn-desc text-[10px] text-muted-foreground">+22%</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleDecreaseFont}
                      disabled={fontSize === "normal"}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-muted/60 hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <AArrowDown className="w-3.5 h-3.5" strokeWidth={1.8} />
                      <span>Reducir (A-)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleIncreaseFont}
                      disabled={fontSize === "large"}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-muted/60 hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <AArrowUp className="w-3.5 h-3.5" strokeWidth={1.8} />
                      <span>Aumentar (A+)</span>
                    </button>
                  </div>
                </div>

                {/* 2. Modos de Contraste */}
                <div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5 mb-2">
                    <Contrast className="w-3.5 h-3.5 text-sena-blue" strokeWidth={1.8} />
                    Modo de Contraste
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setContrastMode("normal")}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        contrastMode === "normal"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-emerald-900 dark:text-emerald-100 shadow-xs ring-2 ring-sena-green/30"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" strokeWidth={1.8} />
                      <span className="text-[11px] font-bold">Estándar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setContrastMode("high-contrast")}
                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                        contrastMode === "high-contrast"
                          ? "bg-slate-900 dark:bg-black border-amber-400 text-white shadow-xs ring-2 ring-amber-400"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Contrast className={`w-4 h-4 ${contrastMode === "high-contrast" ? "text-amber-400" : "text-foreground"}`} strokeWidth={1.8} />
                      <span className="text-[11px] font-bold">Alto Contraste</span>
                    </button>

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
                      <span className="text-[11px] font-bold">Modo Sepia</span>
                    </button>
                  </div>
                </div>

                {/* 3. Ayudas Adicionales: Dislexia y Guía de Lectura */}
                <div className="space-y-2 pt-1 border-t border-border">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Baseline className="w-3.5 h-3.5 text-sena-green" strokeWidth={1.8} />
                    Ayudas de Lectura & Dislexia
                  </span>

                  {/* Espaciado para Dislexia */}
                  <button
                    type="button"
                    onClick={() => setDyslexiaSpacing((prev) => !prev)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      dyslexiaSpacing
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-foreground"
                        : "bg-card border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${dyslexiaSpacing ? "bg-sena-green text-white" : "bg-muted text-muted-foreground"}`}>
                        <Baseline className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Espaciado para Dislexia</p>
                        <p className="text-[10px] text-muted-foreground">Mayor separación entre letras y renglones</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${dyslexiaSpacing ? "bg-sena-green border-sena-green text-white" : "border-border bg-white"}`}>
                      {dyslexiaSpacing && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    </div>
                  </button>

                  {/* Guía Horizontal de Lectura */}
                  <button
                    type="button"
                    onClick={() => setReadingGuide((prev) => !prev)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      readingGuide
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-foreground"
                        : "bg-card border-border hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${readingGuide ? "bg-sena-green text-white" : "bg-muted text-muted-foreground"}`}>
                        <MoveHorizontal className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Guía de Lectura</p>
                        <p className="text-[10px] text-muted-foreground">Línea guía horizontal que sigue el cursor</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${readingGuide ? "bg-sena-green border-sena-green text-white" : "border-border bg-white"}`}>
                      {readingGuide && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    </div>
                  </button>
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
                  className="px-3.5 py-1.5 bg-sena-green text-white rounded-xl text-xs font-bold hover:bg-sena-green-dark transition-colors cursor-pointer shadow-xs"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>,
    document.body
  );
}
