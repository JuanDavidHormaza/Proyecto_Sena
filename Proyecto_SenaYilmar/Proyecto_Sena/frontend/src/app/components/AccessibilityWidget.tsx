import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Accessibility,
  Type,
  AArrowDown,
  AArrowUp,
  RotateCcw,
  Sun,
  Eye,
  Contrast,
  Check,
  X,
  BookOpen,
  Sparkles,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
} from "lucide-react";

export type FontSizeLevel = 'normal' | 'large' | 'extra-large';

// Niveles de fuente estrictos y escalado tipográfico real sin zoom:
export const applyGlobalFontScale = (level: 'normal' | 'large' | 'extra-large') => {
  // 1. Limpiar cualquier rastro de zoom o transformación
  document.documentElement.style.zoom = '';
  document.body.style.zoom = '';
  document.body.style.transform = '';

  const root = document.documentElement;
  root.classList.remove(
    'font-scale-normal',
    'font-scale-large',
    'font-scale-xl',
    'font-level-normal',
    'font-level-large',
    'font-level-extra-large'
  );

  switch (level) {
    case 'normal':
      root.classList.add('font-scale-normal', 'font-level-normal');
      root.style.fontSize = '16px';
      break;
    case 'large':
      root.classList.add('font-scale-large', 'font-level-large');
      root.style.fontSize = '18px';
      break;
    case 'extra-large':
      root.classList.add('font-scale-xl', 'font-level-extra-large');
      root.style.fontSize = '20px';
      break;
  }
  localStorage.setItem('worklex_font_size', level);
  localStorage.setItem('worklex_font_level', level);
};

export const setFontSizeLevel = applyGlobalFontScale;

type ContrastMode = "default" | "high-contrast" | "clean-reading";

export function AccessibilityWidget() {
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const isOpen = accessibilityOpen;
  const setIsOpen = setAccessibilityOpen;

  // 1. Escala tipográfica real (Niveles estrictos: 'normal' | 'large' | 'extra-large')
  const [fontSizeLevel, setFontSizeLevelState] = useState<FontSizeLevel>(() => {
    const saved = (localStorage.getItem("worklex_font_size") || localStorage.getItem("worklex_font_level")) as FontSizeLevel | null;
    if (saved && ["normal", "large", "extra-large"].includes(saved)) {
      return saved;
    }
    const legacy = localStorage.getItem("worklex_font_scale");
    if (legacy === "125" || legacy === "130") return "extra-large";
    if (legacy === "112.5" || legacy === "115" || legacy === "112") return "large";
    return "normal";
  });

  // 2. Modo de contraste y lectura visual
  const [contrastMode, setContrastMode] = useState<ContrastMode>(() => {
    const saved = localStorage.getItem("worklex_contrast_mode");
    return (saved as ContrastMode) || "default";
  });

  // 3. Lector de Pantalla TalkBack (Web Speech API)
  const [talkBackEnabled, setTalkBackEnabled] = useState<boolean>(() => {
    return localStorage.getItem("worklex_talkback") === "true";
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const talkBackRef = useRef(talkBackEnabled);
  talkBackRef.current = talkBackEnabled;

  // Aplicar escala tipográfica real mediante font-size en documentElement y clases globales
  useEffect(() => {
    applyGlobalFontScale(fontSizeLevel);
  }, [fontSizeLevel]);

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

  // Controladores de audio TTS
  const cancelSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  const pauseSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  };

  const resumeSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      }
    }
  };

  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const clean = text.replace(/\s+/g, " ").trim();
    if (!clean || clean.length < 2) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    const esVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith("es-co")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("es-es")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("es-419")) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("es"));

    if (esVoice) utterance.voice = esVoice;
    utterance.lang = esVoice ? esVoice.lang : "es-CO";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Efecto global para TalkBack / Lector de pantalla al enfocar o pasar el cursor
  useEffect(() => {
    localStorage.setItem("worklex_talkback", String(talkBackEnabled));
    if (!talkBackEnabled) {
      cancelSpeech();
      return;
    }

    let hoverTimeout: any = null;
    let lastSpokenText = "";
    let lastSpokenTime = 0;

    const extractElementText = (el: HTMLElement): string => {
      if (el.closest(".talkback-ignore")) return "";

      const ariaLabel = el.getAttribute("aria-label");
      if (ariaLabel) return ariaLabel;

      const title = el.getAttribute("title");
      if (title) return title;

      const alt = el.getAttribute("alt");
      if (alt) return alt;

      if (el instanceof HTMLInputElement) {
        if (el.placeholder && !el.value) return `Campo de entrada: ${el.placeholder}`;
        if (el.value) return `Valor ingresado: ${el.value}`;
        return "Campo de entrada";
      }

      if (el instanceof HTMLSelectElement) {
        const selText = el.options[el.selectedIndex]?.text || "";
        return `Menú desplegable: ${selText}`;
      }

      const semantic = el.closest<HTMLElement>(
        "h1, h2, h3, h4, h5, h6, p, button, a, label, li, th, td, [role='button'], [role='option'], [data-tts]"
      ) || el;
      const text = (semantic.innerText || semantic.textContent || "").trim();
      if (text.length > 0 && text.length <= 400) {
        return text;
      }
      return text.slice(0, 300);
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (!talkBackRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const text = extractElementText(target);
      if (text) speakText(text);
    };

    const handleMouseOver = (e: MouseEvent) => {
      if (!talkBackRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (hoverTimeout) clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(() => {
        const text = extractElementText(target);
        if (!text) return;
        const now = Date.now();
        if (text === lastSpokenText && now - lastSpokenTime < 1800) return;
        lastSpokenText = text;
        lastSpokenTime = now;
        speakText(text);
      }, 160);
    };

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("mouseover", handleMouseOver);

    return () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("mouseover", handleMouseOver);
      cancelSpeech();
    };
  }, [talkBackEnabled]);

  const handleIncreaseFont = () => {
    setFontSizeLevelState((prev) => {
      if (prev === "normal") return "large";
      if (prev === "large") return "extra-large";
      return "extra-large";
    });
  };

  const handleDecreaseFont = () => {
    setFontSizeLevelState((prev) => {
      if (prev === "extra-large") return "large";
      if (prev === "large") return "normal";
      return "normal";
    });
  };

  const handleReset = () => {
    setFontSizeLevelState("normal");
    setContrastMode("default");
    setTalkBackEnabled(false);
    cancelSpeech();
  };

  useEffect(() => {
    const handleToggle = () => setAccessibilityOpen((prev) => !prev);
    const handleOpen = () => setAccessibilityOpen(true);
    window.addEventListener("toggle-worklex-accessibility", handleToggle);
    window.addEventListener("open-worklex-accessibility", handleOpen);
    return () => {
      window.removeEventListener("toggle-worklex-accessibility", handleToggle);
      window.removeEventListener("open-worklex-accessibility", handleOpen);
    };
  }, []);

  return (
    <>
      {/* Botón Flotante de Accesibilidad (Muñeco Universal en SVG Puro) */}
      <button
        aria-label="Opciones de Accesibilidad"
        onClick={() => setAccessibilityOpen(!accessibilityOpen)}
        className="accessibility-widget-panel fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105 focus:outline-none cursor-pointer z-50"
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
          <div className="accessibility-widget-panel fixed bottom-24 right-6 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ duration: 0.2 }}
              className="accessibility-widget-panel w-80 sm:w-88 bg-card rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col"
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
                {/* 1. Control de Tamaño de Fuente (Escalado Tipográfico Real sin zoom) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-sena-green" strokeWidth={1.8} />
                      Escalado Tipográfico Real
                    </span>
                    <span className="text-xs font-bold text-sena-green bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {fontSizeLevel === "normal" ? "16px (Normal)" : fontSizeLevel === "large" ? "18px (Grande)" : "20px (Extra Grande)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3 leading-tight">
                    Incrementa la fuente proporcionalmente mediante unidades relativas (rem), sin escalar la ventana ni deformar botones o tarjetas.
                  </p>

                  {/* Selector de Presets (Normal: 16px, Grande: 18px, Extra Grande: 20px) */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFontSizeLevelState("normal")}
                      className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        fontSizeLevel === "normal"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-emerald-900 dark:text-emerald-100 font-bold shadow-xs ring-2 ring-sena-green/30"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
                      }`}
                      title="Tamaño normal (16px base)"
                    >
                      <span className="text-xs font-bold">16px</span>
                      <span className="text-[10px] text-muted-foreground">Normal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSizeLevelState("large")}
                      className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        fontSizeLevel === "large"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-emerald-900 dark:text-emerald-100 font-bold shadow-xs ring-2 ring-sena-green/30"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
                      }`}
                      title="Tamaño grande (18px base)"
                    >
                      <span className="text-xs font-bold">18px</span>
                      <span className="text-[10px] text-muted-foreground">Grande</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFontSizeLevelState("extra-large")}
                      className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                        fontSizeLevel === "extra-large"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-sena-green text-emerald-900 dark:text-emerald-100 font-bold shadow-xs ring-2 ring-sena-green/30"
                          : "bg-card border-border hover:bg-muted text-muted-foreground hover:text-foreground font-medium"
                      }`}
                      title="Tamaño extra grande (20px base)"
                    >
                      <span className="text-xs font-bold">20px</span>
                      <span className="text-[10px] text-muted-foreground">Extra</span>
                    </button>
                  </div>

                  {/* Acciones de incremento/decremento A- / A+ */}
                  <div className="grid grid-cols-2 gap-2 mt-2.5">
                    <button
                      type="button"
                      onClick={handleDecreaseFont}
                      disabled={fontSizeLevel === "normal"}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-muted/60 hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                      title="Disminuir tamaño (A-)"
                    >
                      <AArrowDown className="w-3.5 h-3.5" strokeWidth={1.8} />
                      <span>Reducir (A-)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleIncreaseFont}
                      disabled={fontSizeLevel === "extra-large"}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-muted/60 hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground disabled:opacity-40 transition-colors cursor-pointer"
                      title="Aumentar tamaño (A+)"
                    >
                      <AArrowUp className="w-3.5 h-3.5" strokeWidth={1.8} />
                      <span>Aumentar (A+)</span>
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

                {/* 3. Lector de Pantalla / TalkBack (Web Speech API) */}
                <div className="pt-4 border-t border-border talkback-ignore">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-sena-green" strokeWidth={1.8} />
                      <span className="text-xs font-bold text-foreground">
                        Lector de Pantalla / TalkBack
                      </span>
                    </div>
                    {/* Switch Toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={talkBackEnabled}
                      onClick={() => {
                        const next = !talkBackEnabled;
                        setTalkBackEnabled(next);
                        if (!next) cancelSpeech();
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-sena-green/50 ${
                        talkBackEnabled ? "bg-sena-green" : "bg-muted-foreground/30"
                      }`}
                      title={talkBackEnabled ? "Desactivar TalkBack" : "Activar TalkBack"}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-xs ${
                          talkBackEnabled ? "translate-x-4.5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2.5 leading-tight">
                    Sintetiza la voz en español al pasar el cursor (hover) o enfocar títulos, preguntas y botones.
                  </p>

                  {talkBackEnabled && (
                    <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSpeaking ? "bg-emerald-500 animate-ping" : isPaused ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          {isSpeaking
                            ? "Leyendo en voz alta..."
                            : isPaused
                            ? "Lectura en pausa"
                            : "Listo (pasa el cursor o selecciona)"}
                        </span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          es-CO
                        </span>
                      </div>

                      {/* Botones de acción rápida: Pausar/Reanudar y Detener */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {isPaused ? (
                          <button
                            type="button"
                            onClick={resumeSpeech}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                            title="Reanudar lectura de voz"
                          >
                            <Play className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Reanudar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={pauseSpeech}
                            disabled={!isSpeaking}
                            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white hover:bg-muted border border-border text-foreground text-[11px] font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                            title="Pausar lectura actual"
                          >
                            <Pause className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Pausar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={cancelSpeech}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] font-bold transition-colors cursor-pointer"
                          title="Detener lectura inmediatamente"
                        >
                          <Square className="w-3 h-3 text-rose-600" />
                          <span>Detener</span>
                        </button>
                      </div>
                    </div>
                  )}
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
