// frontend/src/app/components/PlacementTestModal.tsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Headphones,
  Mic,
  BookOpen,
  PenTool,
  Clock,
  Award,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PlacementTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart?: () => void;
  programName?: string;
  fichaCode?: string;
}

export const PlacementTestModal: React.FC<PlacementTestModalProps> = ({
  isOpen,
  onClose,
  onStart,
  programName = "Formación Profesional SENA",
  fichaCode,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleStartExam = () => {
    onClose();
    if (onStart) {
      onStart();
    } else {
      navigate("/exam");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        >
          {/* Header Institucional */}
          <div className="bg-gradient-to-r from-sena-blue to-sena-green p-6 text-white relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white backdrop-blur-xs">
                Marco Común Europeo (CEFR A1 - B2)
              </span>
              {fichaCode && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/30 text-white border border-emerald-300/40">
                  Ficha {fichaCode}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black tracking-tight">Placement Test Institucional</h2>
            <p className="text-white/85 text-xs sm:text-sm mt-1">
              Prueba de nivelación diagnóstica adaptativa para {programName}.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* ⚠️ BANNER DE ADVERTENCIA TÉCNICA DE MICRÓFONO Y AMBIENTE SILENCIOSO */}
            <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-2xl p-4 flex items-start gap-3 text-xs sm:text-sm leading-relaxed shadow-xs">
              <span className="text-xl flex-shrink-0 mt-0.5">⚠️</span>
              <div>
                <strong className="font-bold block text-amber-950 mb-0.5">
                  Nota Importante de Audio y Micrófono:
                </strong>
                Para los ejercicios de pronunciación (Speaking), asegúrese de utilizar un dispositivo de
                audio y micrófono de alta calidad (preferiblemente diadema con supresión de ruido) y ubicarse en un entorno silencioso. La distancia al micrófono o el ruido ambiente del salón afectarán directamente el porcentaje de similitud fonética.
              </div>
            </div>

            {/* Competencias Evaluadas */}
            <div>
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-3">
                Competencias Pedagógicas Evaluadas
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                  <BookOpen className="w-5 h-5 text-indigo-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">Reading</p>
                  <p className="text-[10px] text-slate-500">Vocabulario Técnico</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                  <PenTool className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">Writing</p>
                  <p className="text-[10px] text-slate-500">Gramática y Sintaxis</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                  <Headphones className="w-5 h-5 text-sky-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">Listening</p>
                  <p className="text-[10px] text-slate-500">Comprensión Auditiva</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-center">
                  <Mic className="w-5 h-5 text-rose-600 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-slate-800">Speaking</p>
                  <p className="text-[10px] text-slate-500">Pronunciación Fonética</p>
                </div>
              </div>
            </div>

            {/* Detalles Rápidos del Examen */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Duración: <strong>~15-20 minutos</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-slate-400" />
                Nivelación: <strong>A1, A2, B1, B2</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-slate-400" />
                Intentos: <strong>Sesión Monitoreada</strong>
              </span>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-slate-600 font-semibold hover:bg-slate-100 transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleStartExam}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-sena-green hover:bg-sena-green/90 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Iniciar Placement Test</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
