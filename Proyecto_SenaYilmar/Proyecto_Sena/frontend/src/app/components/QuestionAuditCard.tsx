import React from "react";
import { CheckCircle2, XCircle, AlertCircle, BookOpen, Layers } from "lucide-react";
import { AuditedQuestion } from "../services/api";

interface QuestionAuditCardProps {
  item: AuditedQuestion;
  index: number;
}

export const QuestionAuditCard: React.FC<QuestionAuditCardProps> = ({ item, index }) => {
  const isCorrect = Boolean(item.is_correct ?? item.isCorrect);
  const isUnanswered = Boolean(
    item.is_unanswered ||
    !item.user_answer_text ||
    item.user_answer_text.trim().toLowerCase() === "sin responder" ||
    item.user_answer_text.trim().toLowerCase() === "n/a" ||
    item.user_answer_text.trim() === "-1"
  );

  const questionText = item.question_text || item.question || `Reactivo #${index + 1}`;
  const userAnswerText = isUnanswered ? "Sin responder" : (item.user_answer_text || "Sin responder");
  const correctAnswerText = item.correct_answer_text || "Indicada en rúbrica";
  const technicalTerm = item.technical_term;
  const competence = item.competence || item.category;

  return (
    <div
      className={`p-4 rounded-2xl border transition-all duration-200 shadow-2xs ${
        isCorrect
          ? "border-emerald-200 bg-emerald-50/40 text-emerald-950"
          : "border-rose-200 bg-rose-50/40 text-rose-950"
      }`}
    >
      {/* Encabezado del reactivo y badge de estado */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span
            className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0 mt-0.5 ${
              isCorrect ? "bg-emerald-200/80 text-emerald-900" : "bg-rose-200/80 text-rose-900"
            }`}
          >
            {index + 1}
          </span>
          <div className="flex-1 min-w-0">
            <h5 className="font-semibold text-sm text-slate-800 leading-snug break-words">
              {questionText}
            </h5>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {competence && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-white/80 border border-slate-200 px-2 py-0.5 rounded-md">
                  <Layers className="w-3 h-3 text-slate-400" />
                  {competence}
                </span>
              )}
              {technicalTerm && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                  <BookOpen className="w-3 h-3 text-indigo-500" />
                  Término: {technicalTerm}
                </span>
              )}
              {item.type && (
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  {item.type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Badge estricto de calificación */}
        <div className="shrink-0">
          {isCorrect ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              CORRECTO
            </span>
          ) : isUnanswered ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              NO RESPONDIDO
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              INCORRECTO
            </span>
          )}
        </div>
      </div>

      {/* Desglose comparativo de respuestas literales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs bg-white/90 p-3 rounded-xl border border-slate-200/90 shadow-2xs mt-2">
        <div className="space-y-0.5">
          <span className="text-slate-500 text-[11px] block font-medium">Respuesta del aprendiz:</span>
          <p className="text-xs break-words">
            <strong
              className={
                isUnanswered
                  ? "text-rose-600 italic font-semibold"
                  : isCorrect
                  ? "text-slate-800 font-semibold"
                  : "text-rose-700 font-semibold"
              }
            >
              {userAnswerText}
            </strong>
          </p>
        </div>

        <div className="space-y-0.5">
          <span className="text-slate-500 text-[11px] block font-medium">Respuesta correcta:</span>
          <p className="text-xs break-words">
            <strong className="text-emerald-700 font-semibold">{correctAnswerText}</strong>
          </p>
        </div>
      </div>

      {/* Retroalimentación Pedagógica del Reactivo */}
      {item.feedback && (
        <div className="mt-2 text-xs text-slate-600 bg-slate-50/90 p-2.5 rounded-lg border border-slate-200/80">
          <span className="font-semibold text-slate-700 block text-[11px] mb-0.5">
            Nota de análisis pedagógico:
          </span>
          <p className="leading-relaxed">{item.feedback}</p>
        </div>
      )}
    </div>
  );
};
