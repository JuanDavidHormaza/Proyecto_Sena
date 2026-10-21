import React from "react";
import { X, Award, CheckCircle2, MessageSquare, Clock, Send, Calendar, User } from "lucide-react";
import { AuditedQuestion } from "../services/api";
import { QuestionAuditCard } from "./QuestionAuditCard";

export interface ExamAuditModalData {
  id?: string | number;
  userName?: string;
  studentName?: string;
  userEmail?: string;
  studentProgram?: string;
  program?: string;
  score: number;
  level: string;
  date?: string;
  completedAt?: string;
  correctAnswers?: number;
  totalQuestions?: number;
  duration?: string;
  feedback?: string;
  answers?: AuditedQuestion[];
  audit_questions?: AuditedQuestion[];
}

interface ExamAuditModalProps {
  data: ExamAuditModalData;
  onClose: () => void;
  feedbackText?: string;
  onFeedbackChange?: (text: string) => void;
  onSaveFeedback?: () => void;
  isSavingFeedback?: boolean;
  canEditFeedback?: boolean;
}

export const ExamAuditModal: React.FC<ExamAuditModalProps> = ({
  data,
  onClose,
  feedbackText = "",
  onFeedbackChange,
  onSaveFeedback,
  isSavingFeedback = false,
  canEditFeedback = false,
}) => {
  const rawQuestions = data.audit_questions || data.answers || [];
  const studentName = data.userName || data.studentName || "Aprendiz";
  const studentProgram = data.studentProgram || data.program || "Programa de Formación SENA";
  const formattedDate = data.date || (data.completedAt ? new Date(data.completedAt).toLocaleDateString() : "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60">
              <Award className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                Auditoría Pedagógica de la Evaluación
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-slate-700">{studentName}</span>
                <span>•</span>
                <span>{studentProgram}</span>
                {formattedDate && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formattedDate}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" strokeWidth={1.8} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-center">
              <p className="text-xs font-medium text-slate-500 mb-1">Puntaje Global</p>
              <p
                className={`text-2xl sm:text-3xl font-extrabold ${
                  data.score >= 80
                    ? "text-emerald-600"
                    : data.score >= 60
                    ? "text-amber-500"
                    : "text-rose-600"
                }`}
              >
                {data.score}%
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-center">
              <p className="text-xs font-medium text-slate-500 mb-1">Nivel Asignado</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                {data.level || "A1"}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 text-center">
              <p className="text-xs font-medium text-slate-500 mb-1">Aciertos</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-800">
                {data.correctAnswers ?? 0}
                <span className="text-base font-normal text-slate-400">
                  /{data.totalQuestions ?? rawQuestions.length ?? 0}
                </span>
              </p>
            </div>
          </div>

          {/* List of Audited Questions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm sm:text-base text-slate-900">
                Desglose Reactivo a Reactivo
              </h4>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {rawQuestions.length} reactivos auditados
              </span>
            </div>

            {rawQuestions.length > 0 ? (
              <div className="space-y-3">
                {rawQuestions.map((q, idx) => (
                  <QuestionAuditCard
                    key={q.question_id || q.question || idx}
                    item={q}
                    index={idx}
                  />
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                No se registraron reactivos individuales para esta sesión.
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <label className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
              <MessageSquare className="w-4 h-4 text-emerald-600" strokeWidth={1.8} />
              Retroalimentación Pedagógica del Docente
            </label>

            {canEditFeedback ? (
              <div className="space-y-2">
                <textarea
                  value={feedbackText}
                  onChange={(e) => onFeedbackChange?.(e.target.value)}
                  rows={3}
                  placeholder="Escribe comentarios formativos y recomendaciones técnicas para el aprendiz..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all resize-none"
                />
                {data.feedback && (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Último comentario registrado: "{data.feedback}"</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                {data.feedback ? (
                  <p className="leading-relaxed italic">"{data.feedback}"</p>
                ) : (
                  <p className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Pendiente de retroalimentación formativa por parte del docente.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 justify-end">
          {canEditFeedback && onSaveFeedback && (
            <button
              type="button"
              onClick={onSaveFeedback}
              disabled={isSavingFeedback}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-60"
            >
              <Send className="w-4 h-4" strokeWidth={1.8} />
              {isSavingFeedback ? "Guardando..." : "Guardar Retroalimentación"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
