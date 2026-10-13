import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  LifeBuoy,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Image as ImageIcon,
  Trash2,
  Wrench,
  HelpCircle,
  MessageSquare,
  ShieldAlert,
  FileCheck,
} from "lucide-react";
import api from "../services/api";

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTicketCreated?: () => void;
}

interface PetitionTypeOption {
  id: "TECNICA" | "CALIFICACION" | "SUGERENCIA" | "RECLAMO";
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const PETITION_TYPES: PetitionTypeOption[] = [
  {
    id: "TECNICA",
    label: "Problema Técnico",
    description: "Fallas de audio, video, conexión o carga",
    icon: Wrench,
  },
  {
    id: "CALIFICACION",
    label: "Duda sobre Evaluación/Calificación",
    description: "Inquietudes con puntajes o nivel asignado",
    icon: HelpCircle,
  },
  {
    id: "SUGERENCIA",
    label: "Petición / Sugerencia",
    description: "Propuestas de mejora para la plataforma",
    icon: MessageSquare,
  },
  {
    id: "RECLAMO",
    label: "Reclamo",
    description: "Disconformidad con un proceso o evaluación",
    icon: ShieldAlert,
  },
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function SupportTicketModal({ isOpen, onClose, onTicketCreated }: SupportTicketModalProps) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<"TECNICA" | "CALIFICACION" | "SUGERENCIA" | "RECLAMO">("TECNICA");
  const [description, setDescription] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdTicketId, setCreatedTicketId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Mounted guard para SSR / hidratación segura en el cliente
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquear el scroll del fondo (body) mientras el modal esté abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Limpiar URL de objeto al desmontar o cambiar archivo
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Reset al cerrar o abrir
  useEffect(() => {
    if (!isOpen) {
      setSubject("");
      setCategory("TECNICA");
      setDescription("");
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setScreenshotFile(null);
      setErrorMessage(null);
      setCreatedTicketId(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleFileSelection = (file: File) => {
    setErrorMessage(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage("Formato no admitido. Selecciona una imagen .png, .jpg, .jpeg o .webp.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage("La captura excede el tamaño máximo permitido de 5 MB.");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setScreenshotFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelection(file);
    }
  };

  const handleRemoveScreenshot = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setScreenshotFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanSubject = subject.trim();
    const cleanDesc = description.trim();

    if (!cleanSubject) {
      setErrorMessage("Por favor ingresa un asunto descriptivo para la solicitud.");
      return;
    }
    if (!cleanDesc) {
      setErrorMessage("Por favor ingresa una descripción detallada de tu consulta o incidencia.");
      return;
    }

    try {
      setIsSubmitting(true);
      const ticket = await api.createSupportTicket({
        subject: cleanSubject,
        category,
        description: cleanDesc,
        screenshot: screenshotFile,
      });

      setCreatedTicketId(ticket.ticket_id);

      if (onTicketCreated) {
        onTicketCreated();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "No se pudo radicar la solicitud. Por favor intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      {/* Tarjeta del Modal con máxima jerarquía z-[100000] */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl z-[100000] border border-slate-200 dark:border-slate-800 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="support-modal-title"
      >
            {/* Encabezado moderno institucional */}
            <div className="bg-gradient-to-r from-emerald-500/10 via-sena-green/5 to-sena-blue/10 border-b border-border px-6 py-4.5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 flex-shrink-0">
                  <LifeBuoy className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h3 id="support-modal-title" className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                    Centro de Soporte y PQRS
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Radica tu solicitud, reporte técnico o inquietud académica
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Contenido principal scrolleable */}
            <div className="p-6 overflow-y-auto space-y-5">
              {createdTicketId !== null ? (
                /* Vista de Feedback de Éxito */
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-6 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner border border-emerald-500/20">
                    <CheckCircle2 className="w-9 h-9" strokeWidth={2.2} />
                  </div>

                  <div>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-2">
                      Radicado Exitoso
                    </span>
                    <h4 className="text-xl font-black text-foreground">
                      ¡Solicitud Radicada con Éxito!
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
                      Tu solicitud ha sido ingresada a la mesa de ayuda institucional de Worklex SENA.
                    </p>
                  </div>

                  <div className="bg-muted/50 dark:bg-muted/30 border border-border rounded-2xl p-4 text-left max-w-md mx-auto space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Número de Radicado:</span>
                      <span className="font-mono font-bold text-sena-blue text-sm">
                        #{createdTicketId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Tipo de Petición:</span>
                      <span className="font-semibold text-foreground">
                        {PETITION_TYPES.find((t) => t.id === category)?.label || category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Estado Inicial:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        Abierto (En cola de atención)
                      </span>
                    </div>
                    {screenshotFile && (
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600" /> Evidencia Adjunta:
                        </span>
                        <span className="font-medium text-foreground truncate max-w-[180px]">
                          {screenshotFile.name}
                        </span>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    Recibirás atención oportuna de nuestros administradores e instructores a través de la plataforma.
                  </p>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full sm:w-auto px-8 py-3 rounded-xl bg-sena-green hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
                    >
                      Entendido / Cerrar
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Formulario de Radicación */
                <form onSubmit={handleSubmit} className="space-y-4.5">
                  {errorMessage && (
                    <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-2xl flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{errorMessage}</span>
                    </div>
                  )}

                  {/* 1. Tipo de Petición (Selector Estilizado) */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                      1. Tipo de Petición <span className="text-destructive">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PETITION_TYPES.map((type) => {
                        const IconComponent = type.icon;
                        const isSelected = category === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => setCategory(type.id)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-2.5 ${
                              isSelected
                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/30 shadow-xs"
                                : "bg-muted/30 hover:bg-muted/70 border-border text-foreground hover:border-border/80"
                            }`}
                          >
                            <div
                              className={`p-1.5 rounded-xl flex-shrink-0 ${
                                isSelected
                                  ? "bg-emerald-600 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              <IconComponent className="w-4 h-4" strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold leading-tight truncate">{type.label}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                {type.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Asunto */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="ticket-subject" className="text-xs font-bold text-foreground uppercase tracking-wider">
                        2. Asunto <span className="text-destructive">*</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {subject.length}/120
                      </span>
                    </div>
                    <input
                      id="ticket-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ej. No carga el audio de la pregunta 3"
                      maxLength={120}
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-muted/20 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                  </div>

                  {/* 3. Descripción */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="ticket-description" className="text-xs font-bold text-foreground uppercase tracking-wider">
                        3. Descripción Detallada <span className="text-destructive">*</span>
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {description.length}/800
                      </span>
                    </div>
                    <textarea
                      id="ticket-description"
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe qué ocurrió, en qué examen o módulo sucedió y los detalles necesarios para ayudarte con rapidez..."
                      maxLength={800}
                      required
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-muted/20 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none leading-relaxed transition-all"
                    />
                  </div>

                  {/* 4. Adjuntar Evidencia (Captura de Pantalla) */}
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                      4. Adjuntar Evidencia (Captura de Pantalla)
                    </label>

                    {previewUrl ? (
                      /* Vista previa de la captura seleccionada */
                      <div className="relative rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-3 flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/10 border border-border flex-shrink-0 flex items-center justify-center">
                          <img
                            src={previewUrl}
                            alt="Vista previa de captura"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">
                            {screenshotFile?.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {screenshotFile ? `${(screenshotFile.size / (1024 * 1024)).toFixed(2)} MB` : ""} • Imagen lista para enviar
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleRemoveScreenshot}
                          title="Eliminar imagen seleccionada"
                          aria-label="Eliminar captura adjunta"
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors cursor-pointer flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      /* Dropzone interactivo */
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center transition-all cursor-pointer ${
                          isDragging
                            ? "border-emerald-500 bg-emerald-500/10 scale-[0.99]"
                            : "border-border hover:border-emerald-500/50 hover:bg-muted/40 bg-muted/15"
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                          onChange={handleFileInputChange}
                          className="hidden"
                          aria-label="Seleccionar captura de pantalla"
                        />

                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                          <UploadCloud className="w-5 h-5" strokeWidth={1.8} />
                        </div>
                        <p className="text-xs font-bold text-foreground">
                          Arrastra tu captura aquí o <span className="text-emerald-600 dark:text-emerald-400 underline">haz clic para examinar</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Admite .png, .jpg, .jpeg, .webp (máx. 5 MB)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pie del modal con botones */}
                  <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 text-xs font-bold rounded-xl bg-sena-green hover:bg-emerald-700 text-white transition-all shadow-md shadow-sena-green/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Radicando solicitud...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Radicar PQRS</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
      </div>
    </div>,
    document.body
  );
}

export default SupportTicketModal;
