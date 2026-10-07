import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  GraduationCap,
  Wrench,
  Database,
  Code,
  CheckCircle2,
  ArrowRight,
  X,
  Layers,
  Sparkles,
} from "lucide-react";

interface DictionaryProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  enrolledPrograms: string[];
  activeProgram: string;
  onSelectProgram: (programName: string) => void;
  onNavigateToEnroll?: () => void;
}

function getProgramIcon(progName: string) {
  const p = progName.toLowerCase();
  if (p.includes("mecánica") || p.includes("mecanica") || p.includes("3520681")) {
    return <Wrench className="w-6 h-6 text-amber-500" strokeWidth={1.8} />;
  }
  if (p.includes("datos") || p.includes("data") || p.includes("3411643")) {
    return <Database className="w-6 h-6 text-blue-500" strokeWidth={1.8} />;
  }
  if (p.includes("software") || p.includes("adso") || p.includes("2670142")) {
    return <Code className="w-6 h-6 text-sena-green" strokeWidth={1.8} />;
  }
  return <GraduationCap className="w-6 h-6 text-sena-blue" strokeWidth={1.8} />;
}

function extractFichaInfo(progName: string) {
  const match = progName.match(/ficha\s*(\d+)/i);
  if (match) {
    const fichaNumber = match[1];
    const nameWithoutFicha = progName.replace(/-\s*ficha\s*\d+/i, "").trim();
    return { name: nameWithoutFicha, ficha: fichaNumber };
  }
  return { name: progName, ficha: "Principal" };
}

export function DictionaryProgramModal({
  isOpen,
  onClose,
  enrolledPrograms,
  activeProgram,
  onSelectProgram,
  onNavigateToEnroll,
}: DictionaryProgramModalProps) {
  const navigate = useNavigate();
  const [selectedProg, setSelectedProg] = useState<string>(activeProgram || enrolledPrograms[0] || "ADSO");

  if (!isOpen) return null;

  const isSingle = enrolledPrograms.length <= 1;

  const handleConfirm = () => {
    const fichaInfo = extractFichaInfo(selectedProg);
    const activeFichaId = fichaInfo.ficha !== "Principal" ? fichaInfo.ficha : selectedProg;

    // Persistir parámetro y estado de la ficha activa globalmente
    localStorage.setItem("activeFichaId", activeFichaId);
    localStorage.setItem("activeProgram", selectedProg);
    localStorage.setItem("userProgram", selectedProg);

    onSelectProgram(selectedProg);
    onClose();

    // Navegación reactiva hacia la vista del diccionario técnico
    navigate(`/dictionary?program=${encodeURIComponent(selectedProg)}&ficha=${encodeURIComponent(activeFichaId)}`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop con Blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-sena-green/10 via-emerald-50 to-sena-blue/10 px-6 py-5 border-b border-border/80 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-sena-green text-white flex items-center justify-center shadow-md shadow-sena-green/30">
                <BookOpen className="w-6 h-6" strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground tracking-tight">
                  Diccionario Técnico Especializado
                </h3>
                <p className="text-xs text-muted-foreground">
                  Aislamiento Multi-tenant por Ficha SENA
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" strokeWidth={1.8} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5">
            {isSingle ? (
              // Vista para aprendiz con UNA sola ficha matriculada
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-white rounded-xl shadow-xs text-sena-green mt-0.5">
                      {getProgramIcon(enrolledPrograms[0] || activeProgram)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-sena-green text-white rounded-md uppercase tracking-wider">
                          Ficha Activa
                        </span>
                        <span className="text-xs font-semibold text-emerald-800">
                          {extractFichaInfo(enrolledPrograms[0] || activeProgram).ficha !== "Principal"
                            ? `Ficha: ${extractFichaInfo(enrolledPrograms[0] || activeProgram).ficha}`
                            : "Programa Registrado"}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-800 truncate">
                        {enrolledPrograms[0] || activeProgram}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Este diccionario contiene exclusivamente el vocabulario técnico, audios nativos y
                        multimedia especializada de tu ficha. No verás términos de otros programas.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 px-1">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-sena-green" strokeWidth={1.8} />
                    Pronunciación nativa & práctica por voz en 1 clic
                  </span>
                  {onNavigateToEnroll && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToEnroll();
                      }}
                      className="text-sena-blue hover:underline font-semibold"
                    >
                      ¿Vincular otra ficha?
                    </button>
                  )}
                </div>
              </div>
            ) : (
              // Vista interactiva con MÚLTIPLES fichas matriculadas
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-600 font-medium">
                    Tienes varias fichas matriculadas. Selecciona cuál diccionario técnico deseas explorar:
                  </p>
                </div>

                <div className="grid gap-3">
                  {enrolledPrograms.map((prog) => {
                    const isSelected = selectedProg === prog;
                    const info = extractFichaInfo(prog);
                    return (
                      <motion.button
                        key={prog}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setSelectedProg(prog)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? "bg-emerald-50/90 border-sena-green shadow-md shadow-emerald-500/10 ring-2 ring-sena-green/30"
                            : "bg-white border-border/90 hover:border-emerald-300 hover:bg-slate-50/70"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected
                                ? "bg-sena-green text-white shadow-xs"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {getProgramIcon(prog)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                                  isSelected
                                    ? "bg-emerald-200/80 text-emerald-900"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {info.ficha !== "Principal" ? `Ficha ${info.ficha}` : "SENA"}
                              </span>
                              {prog === activeProgram && (
                                <span className="text-[10px] font-semibold text-emerald-700">
                                  (Activa en Panel)
                                </span>
                              )}
                            </div>
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {prog}
                            </h4>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <CheckCircle2 className="w-5 h-5 text-sena-green fill-sena-green/20" strokeWidth={1.8} />
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-slate-300" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-slate-50/80 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-slate-600 hover:bg-white hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sena-green hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-sena-green/25 hover:shadow-lg transition-all cursor-pointer"
            >
              <span>Ingresar al Diccionario Técnico</span>
              <ArrowRight className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
