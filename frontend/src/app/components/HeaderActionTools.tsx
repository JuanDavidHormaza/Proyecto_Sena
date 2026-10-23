import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { SupportTicketModal } from "./SupportTicketModal";
import { useAuth } from "../context/AuthContext";

interface HeaderActionToolsProps {
  className?: string;
  onTicketCreated?: () => void;
}

export function HeaderActionTools({ className = "", onTicketCreated }: HeaderActionToolsProps) {
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const { user } = useAuth();

  const role = (user?.role || sessionStorage.getItem("userRole") || "").toLowerCase();
  const isAdminOrSuperAdmin = role === "admin" || role === "superadmin";

  // El botón superior Soporte / PQRS solo debe existir para Aprendices e Instructores
  if (isAdminOrSuperAdmin) {
    return null;
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>

        {/* Botón Estilizado Cápsula de Soporte / Radicar PQRS */}
        <button
          type="button"
          onClick={() => setIsTicketModalOpen(true)}
          className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50/90 hover:bg-emerald-100/90 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 text-xs font-bold shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-emerald-500"
          title="Soporte / Radicar PQRS"
          aria-label="Soporte / Radicar PQRS"
        >
          {/* Badge sutil de disponibilidad */}
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>

          <LifeBuoy
            className="w-4 h-4 text-emerald-600 dark:text-emerald-400 group-hover:rotate-45 transition-transform duration-300 flex-shrink-0"
            strokeWidth={2}
          />
          <span className="hidden sm:inline text-xs font-bold tracking-tight">
            Soporte / PQRS
          </span>
        </button>
      </div>

      {/* Modal institucional de Soporte y PQRS */}
      <SupportTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onTicketCreated={onTicketCreated}
      />
    </>
  );
}

export default HeaderActionTools;
