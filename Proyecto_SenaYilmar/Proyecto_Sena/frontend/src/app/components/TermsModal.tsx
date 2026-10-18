import React from "react";
import { IconShieldCheck, IconX, IconCheck, IconExternalLink, IconPhone, IconScale } from "@tabler/icons-react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAccept,
}) => {
  if (!isOpen) return null;

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 flex flex-col max-h-[88vh] text-left relative overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/60 shadow-sm shrink-0">
              <IconShieldCheck size={24} stroke={1.8} />
            </div>
            <div>
              <h2
                id="terms-modal-title"
                className="text-lg font-bold text-slate-800 tracking-tight"
              >
                Términos, Condiciones y Política de Datos SENA
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Servicio Nacional de Aprendizaje — Plataforma Institucional WorkLex
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Contenido Desplazable */}
        <div className="overflow-y-auto pr-2 my-4 text-sm text-slate-600 space-y-4 leading-relaxed max-h-[55vh] text-justify">
          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100/60 flex items-start gap-3 text-xs text-emerald-900">
            <IconScale size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <p>
              El tratamiento de datos personales en esta plataforma se rige conforme a la{" "}
              <strong className="font-semibold">Ley Estatutaria 1581 de 2012</strong> y el{" "}
              <strong className="font-semibold">Decreto Reglamentario 1377 de 2013</strong> de la República de Colombia.
            </p>
          </div>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              1. Autorización de Tratamiento de Datos Personales
            </h3>
            <p>
              Al registrarse en WorkLex, el usuario (aprendiz, instructor o colaborador institucional) autoriza de manera libre, previa, expresa e informada al SENA y a los administradores de la plataforma para recolectar, almacenar, procesar y utilizar su información personal (nombres, documento de identidad, correo electrónico institucional y desempeño formativo).
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              2. Finalidad Académica y Pedagógica
            </h3>
            <p>
              La recolección de información se realiza exclusivamente con fines de gestión académica, seguimiento pedagógico, trazabilidad de evaluaciones diagnósticas de bilingüismo técnico (Listening, Reading, Speaking, Writing), control de asignación a fichas de formación y acreditación institucional.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              3. Derechos del Titular (Habeas Data)
            </h3>
            <p>
              Usted tiene derecho a conocer, actualizar, rectificar y revocar la autorización de uso de sus datos personales, así como a solicitar la supresión de los mismos conforme a los procedimientos y tiempos fijados en la normatividad colombiana de protección de datos.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              4. Reglamento del Aprendiz SENA
            </h3>
            <p>
              El usuario se compromete a mantener la honestidad académica, abstenerse de compartir credenciales o códigos OTP de verificación, y realizar un uso ético y constructivo de los recursos pedagógicos, herramientas de evaluación y diccionario técnico de WorkLex.
            </p>
          </section>

          <section className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">
              Canales Oficiales de Atención SENA
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-700">
                <IconPhone size={16} className="text-emerald-600 shrink-0" />
                <span>
                  <strong>Bogotá:</strong> (601) 736 6060
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 text-slate-700">
                <IconPhone size={16} className="text-emerald-600 shrink-0" />
                <span>
                  <strong>Línea Nacional:</strong> 01 8000 910 270
                </span>
              </div>
            </div>
            <div className="pt-1">
              <a
                href="https://oferta.senasofiaplus.edu.co/sofia-oferta/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2 transition-colors"
              >
                Consultar Portal Oficial SENA SOFIA Plus
                <IconExternalLink size={14} />
              </a>
            </div>
          </section>
        </div>

        {/* Acciones del Modal */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-5 py-2.5 text-sm font-medium bg-[#39A900] hover:bg-[#2e8800] text-white rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
          >
            <IconCheck size={18} />
            Entendido y Aceptar Términos
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsModal;
