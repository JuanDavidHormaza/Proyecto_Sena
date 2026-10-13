import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LifeBuoy, X, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import api from "../services/api";

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated?: () => void;
}

export function SupportTicketModal({ isOpen, onClose, onTicketCreated }: SupportTicketModalProps) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("TECNICA");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanSubject = subject.trim();
    const cleanDesc = description.trim();

    if (!cleanSubject) {
      setErrorMessage("Por favor ingresa un asunto claro para el ticket.");
      return;
    }
    if (!cleanDesc) {
      setErrorMessage("Por favor describe detalladamente la situación o problema.");
      return;
    }

    try {
      setIsSubmitting(true);
      const ticket = await api.createSupportTicket({
        subject: cleanSubject,
        category,
        description: cleanDesc,
      });

      setSuccessMessage(`Ticket #${ticket.ticket_id} radicado con éxito. Nuestro equipo de soporte e instructores lo atenderán a la brevedad.`);
      setSubject("");
      setDescription("");
      setCategory("TECNICA");

      if (onTicketCreated) {
        onTicketCreated();
      }

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err?.message || "No se pudo radicar el ticket. Inténtalo nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-card rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-border"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sena-green/10 text-sena-green flex items-center justify-center">
                  <LifeBuoy className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Soporte y Reportes (PQRS)</h3>
                  <p className="text-xs text-muted-foreground">Radica tu solicitud, duda técnica o reporte de examen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" strokeWidth={1.8} />
              </button>
            </div>

            {successMessage ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-foreground">Solicitud Radicada</h4>
                <p className="text-xs text-muted-foreground px-4 leading-relaxed">
                  {successMessage}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-xl flex items-center gap-2 border border-destructive/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Asunto del Ticket <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej. Incidencia de audio en pregunta de Listening"
                    maxLength={150}
                    required
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 bg-muted/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Categoría de Solicitud <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 bg-white dark:bg-card"
                  >
                    <option value="TECNICA">Técnica / Falla de Plataforma</option>
                    <option value="EXAMEN">Examen / Contenido de Preguntas</option>
                    <option value="CALIFICACION">Calificación / Nivel Asignado</option>
                    <option value="SUGERENCIA">Sugerencia de Mejora</option>
                    <option value="OTRO">Otro requerimiento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                    Descripción Detallada <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe detalladamente qué sucedió, los pasos para reproducir el error o los detalles de tu consulta..."
                    required
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 bg-muted/20 resize-none leading-relaxed"
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 text-[11px] text-amber-800 dark:text-amber-300">
                  Estado inicial automático: <strong>Abierto</strong>. Tu solicitud será monitoreada y gestionada por el Administrador Institucional.
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-sena-green hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Radicando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
