import { useState, useEffect, useMemo, FC } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, RefreshCw, Plus, Trash2, Pencil, ShieldCheck,
  ChevronLeft, ChevronRight, ChevronDown, AlertTriangle, ArrowLeft, X, Check
} from "lucide-react";
import * as api from "../services/api";
import { User, UserRole } from "../data/users";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";

// Helper institucional: Extrae y formatea programa y ficha en dos líneas sin cortes abruptos
const parseProgramAndFicha = (programRaw?: string) => {
  if (!programRaw || !programRaw.trim()) {
    return { programName: "Sin asignar", fichaNumber: null };
  }
  const clean = programRaw.trim();
  const fichaMatch = clean.match(/(?:ficha|f\.)?\s*[:#-]?\s*(\d{6,8})/i);
  if (fichaMatch) {
    const fichaNumber = fichaMatch[1];
    let programName = clean.replace(fichaMatch[0], "").replace(/[-–()]/g, "").trim();
    if (!programName) programName = "ADSO";
    return { programName, fichaNumber: `Ficha: ${fichaNumber}` };
  }
  return { programName: clean, fichaNumber: null };
};

// ─── Mapas de Estilos y Etiquetas de Roles ──────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  admin: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  teacher: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  student: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: "SuperAdministrador",
  admin: "Administrador",
  teacher: "Instructor",
  student: "Aprendiz",
};

// ─── 1. Subcomponente Modular: Toolbar de Usuarios ──────────────────────────
interface UserToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterRole: string;
  onRoleChange: (role: string) => void;
  filterUserStatus: string;
  onStatusChange: (status: string) => void;
  totalUsersCount: number;
  pageSize: number | "all";
  onPageSizeChange: (size: number | "all") => void;
  onNewUser: () => void;
}

const UserToolbar: FC<UserToolbarProps> = ({
  searchTerm,
  onSearchChange,
  filterRole,
  onRoleChange,
  filterUserStatus,
  onStatusChange,
  totalUsersCount,
  pageSize,
  onPageSizeChange,
  onNewUser,
}) => {
  const rolePills = [
    { id: "all", label: `Todos (${totalUsersCount})` },
    { id: "student", label: "Aprendices" },
    { id: "teacher", label: "Instructores" },
    { id: "admin", label: "Administradores" },
  ];

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border shadow-xs">
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
        <input
          type="text"
          placeholder="Buscar por nombre, correo o número de documento..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900]/50 text-sm shadow-2xs"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Pestañas/Píldoras de filtro rápido */}
        <div className="inline-flex rounded-xl border border-border bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold gap-1 shadow-2xs">
          {rolePills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => onRoleChange(pill.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterRole === pill.id
                  ? "bg-white dark:bg-slate-900 text-foreground font-bold shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Selector de cantidad de registros visibles: [ 10 | 25 | 50 | Todos ] */}
        <div className="inline-flex items-center rounded-xl border border-border bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold gap-1 shadow-2xs">
          {([10, 25, 50, "all"] as const).map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onPageSizeChange(size)}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                pageSize === size
                  ? "bg-[#39A900] text-white font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              {size === "all" ? "Todos" : size}
            </button>
          ))}
        </div>

        {/* Botón institucional SENA: + Nuevo Usuario */}
        <button
          type="button"
          onClick={onNewUser}
          className="bg-[#39A900] hover:bg-[#2d8500] text-white px-4 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 cursor-pointer text-xs sm:text-sm transition-all"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          <span>+ Nuevo Usuario</span>
        </button>
      </div>
    </div>
  );
};

// ─── 2. Subcomponente Modular: Encabezado de la Tabla ─────────────────────────
const UserTableHeader: FC = () => (
  <thead>
    <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
      <th className="text-left py-3.5 px-5 font-semibold">Usuario</th>
      <th className="text-left py-3.5 px-5 font-semibold">Documento</th>
      <th className="text-left py-3.5 px-5 font-semibold">Rol</th>
      <th className="text-left py-3.5 px-5 font-semibold">Programa / Ficha</th>
      <th className="text-left py-3.5 px-5 font-semibold">Estado</th>
      <th className="text-left py-3.5 px-5 font-semibold">Acciones</th>
    </tr>
  </thead>
);

// ─── 3. Subcomponente Modular: Fila Individual de Usuario ───────────────────
interface UserTableRowProps {
  user: User;
  isSelf: boolean;
  onToggleStatus: (userId: string) => void;
  onDeleteClick: (user: User) => void;
  onEditClick: (user: User) => void;
  onRoleChange: (userId: string, newRole: UserRole) => void;
  onViewPermissions: (user: User) => void;
}

const UserTableRow: FC<UserTableRowProps> = ({
  user,
  isSelf,
  onToggleStatus,
  onDeleteClick,
  onEditClick,
  onRoleChange,
  onViewPermissions,
}) => {
  const isTargetSuperAdmin = user.role === "superadmin";

  return (
    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
      {/* Columna 1: Usuario con Avatar Circular y Tooltip Truncado */}
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs ${
              user.role === "superadmin" || user.role === "admin"
                ? "bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/20"
                : user.role === "teacher"
                ? "bg-gradient-to-br from-blue-600 to-sky-700 shadow-blue-500/20"
                : "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/20"
            }`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 max-w-[200px]">
            <div className="flex items-center gap-2">
              <span
                className="truncate max-w-[200px] font-semibold text-slate-900 dark:text-slate-100 text-sm inline-block"
                title={user.name}
              >
                {user.name}
              </span>
              {isSelf && (
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  Tú
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-normal truncate max-w-[200px]" title={user.email}>
              {user.email}
            </p>
          </div>
        </div>
      </td>

      {/* Columna 2: Documento */}
      <td className="py-3.5 px-5 whitespace-nowrap">
        <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
          {user.docType ? `${user.docType} ` : ""}{user.docNum || "—"}
        </span>
      </td>

      {/* Columna 3: Rol (Badge Desplegable Refinado) */}
      <td className="py-3.5 px-5 whitespace-nowrap">
        {isSelf || isTargetSuperAdmin ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5 opacity-90 cursor-not-allowed ${ROLE_COLORS[user.role] || "bg-muted text-muted-foreground"}`}
            title={isSelf ? "Tu cuenta activa (No modificable)" : "Super Administrador (Protegido)"}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
            {ROLE_LABELS[user.role] || user.role}
          </span>
        ) : (
          <div className="relative inline-block text-left">
            <select
              value={user.role}
              onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
              className={`rounded-full pl-3 pr-7 py-1 text-xs font-semibold cursor-pointer transition-all border border-slate-200/80 dark:border-slate-700/80 hover:border-black/20 dark:hover:border-white/20 shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#39A900]/40 ${ROLE_COLORS[user.role] || "bg-muted text-muted-foreground"}`}
              title="Cambiar rol institucional"
            >
              <option value="student">Aprendiz</option>
              <option value="teacher">Instructor</option>
              <option value="admin">Administrador</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" />
          </div>
        )}
      </td>

      {/* Columna 4: Programa / Ficha (Dos líneas limpias sin cortes abruptos) */}
      <td className="py-3.5 px-5">
        {(() => {
          const { programName, fichaNumber } = parseProgramAndFicha(user.program);
          return (
            <div className="flex flex-col min-w-0 max-w-[200px]" title={user.program || "Sin asignar"}>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate inline-block">
                {programName}
              </span>
              {fichaNumber ? (
                <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 inline-block">
                  {fichaNumber}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400/70 dark:text-slate-500/70">
                  General
                </span>
              )}
            </div>
          );
        })()}
      </td>

      {/* Columna 5: Estado (Optimistic Switch) */}
      <td className="py-3.5 px-5 whitespace-nowrap">
        <button
          type="button"
          onClick={() => !isSelf && !isTargetSuperAdmin && onToggleStatus(user.id)}
          disabled={isSelf || isTargetSuperAdmin}
          title={isSelf || isTargetSuperAdmin ? "Estado protegido" : `Alternar a ${user.status === "active" ? "Inactivo" : "Activo"}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
            user.status === "active"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/80"
              : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200/70"
          } ${isSelf || isTargetSuperAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
          {user.status === "active" ? "Activo" : "Inactivo"}
        </button>
      </td>

      {/* Columna 6: Acciones Claras */}
      <td className="py-3.5 px-5 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEditClick(user)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Editar usuario"
            aria-label={`Editar información de ${user.name}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewPermissions(user)}
            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
            title="Permisos"
            aria-label={`Ver permisos de ${user.name}`}
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
          {!isSelf && !isTargetSuperAdmin && (
            <button
              type="button"
              onClick={() => onDeleteClick(user)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              title="Eliminar usuario"
              aria-label={`Eliminar cuenta de ${user.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

// ─── 4. Subcomponente Modular: Paginación de la Tabla ─────────────────────────
interface UserTablePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number | "all";
  totalItems: number;
  effectivePageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number | "all") => void;
}

const UserTablePagination: FC<UserTablePaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  effectivePageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const fromIndex = totalItems === 0 ? 0 : (currentPage - 1) * effectivePageSize + 1;
  const toIndex = Math.min(currentPage * effectivePageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-border bg-muted/20 gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          Mostrando <span className="font-semibold text-foreground">{fromIndex}</span> a{" "}
          <span className="font-semibold text-foreground">{toIndex}</span> de{" "}
          <span className="font-semibold text-foreground">{totalItems}</span> usuarios
        </p>

        <div className="flex items-center gap-1.5 border-l border-border pl-3">
          <span className="text-xs text-muted-foreground font-medium">Filas:</span>
          <div className="inline-flex rounded-lg border border-border bg-white dark:bg-slate-900 p-0.5 text-xs font-semibold shadow-2xs">
            {([10, 25, 50, "all"] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onPageSizeChange(size)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  pageSize === size
                    ? "bg-sena-green text-white font-bold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {size === "all" ? "Todos" : size}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {totalPages > 1 ? (
          <>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className="p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <span className="text-xs font-medium text-muted-foreground px-2">
            Página 1 de 1
          </span>
        )}
      </div>
    </div>
  );
};

// ─── 5. Subcomponente Modular: Modal de Edición de Usuario ───────────────────
interface EditUserModalProps {
  user: User | null;
  currentUserId?: string;
  isSaving: boolean;
  onClose: () => void;
  onSave: (updated: { role: UserRole; name: string; program: string; status: 'active' | 'inactive' }) => void;
}

const EditUserModal: FC<EditUserModalProps> = ({
  user,
  currentUserId,
  isSaving,
  onClose,
  onSave,
}) => {
  if (!user) return null;

  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [program, setProgram] = useState(user.program || "");
  const [status, setStatus] = useState<'active' | 'inactive'>(user.status);

  const isSelf = user.id === currentUserId;
  const isSuperAdmin = user.role === 'superadmin';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ role, name, program, status });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-border shadow-xl space-y-5"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#39A900]/10 text-sena-green flex items-center justify-center">
              <Pencil className="w-5 h-5 text-[#39A900]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Editar Usuario Institucional</h3>
              <p className="text-xs text-muted-foreground">Actualizar rol asignado, estado y datos del perfil</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Nombre Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#39A900]/50"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Correo Institucional</label>
              <input
                type="text"
                value={user.email}
                disabled
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-border rounded-xl text-xs text-muted-foreground cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Documento de Identidad</label>
              <input
                type="text"
                value={`${user.docType || 'CC'} ${user.docNum || '—'}`}
                disabled
                className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-border rounded-xl text-xs text-muted-foreground cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Rol Asignado {isSuperAdmin ? "(SuperAdmin protegido)" : isSelf ? "(Tu cuenta)" : ""}
              </label>
              <select
                value={role}
                disabled={isSuperAdmin || isSelf}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#39A900]/50 cursor-pointer ${
                  isSuperAdmin || isSelf ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {isSuperAdmin && <option value="superadmin">Super Administrador</option>}
                <option value="student">Aprendiz</option>
                <option value="teacher">Instructor</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Estado de la Cuenta</label>
              <select
                value={status}
                disabled={isSuperAdmin || isSelf}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#39A900]/50 cursor-pointer ${
                  isSuperAdmin || isSelf ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Programa / Ficha</label>
            <input
              type="text"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="Ej. ADSO - Ficha 2670142"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#39A900]/50"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-[#39A900] hover:bg-[#2d8500] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ─── 6. Subcomponente Modular: Modal de Permisos Institucionales ─────────────
interface PermissionsModalProps {
  user: User | null;
  onClose: () => void;
}

const PermissionsModal: FC<PermissionsModalProps> = ({ user, onClose }) => {
  if (!user) return null;

  const permissionsList = [
    { key: "canManageUsers", label: "Gestión de Usuarios", desc: "Crear, editar roles y desactivar cuentas" },
    { key: "canManageDocuments", label: "Gestión de Diccionario", desc: "Administrar términos, audios e imágenes ADSO" },
    { key: "canViewStatistics", label: "Métricas y Reportes", desc: "Acceso al panel analítico institucional" },
    { key: "canGiveFeedback", label: "Retroalimentación Pedagógica", desc: "Evaluar pruebas y enviar comentarios" },
    { key: "canTakeQuiz", label: "Presentar Evaluaciones", desc: "Presentar pruebas continuas CEFR" },
    { key: "canViewResults", label: "Historial de Resultados", desc: "Consultar puntajes y métricas de rendimiento" },
    { key: "canManageSubjects", label: "Gestión de Asignaturas", desc: "Configurar programas y materias" },
    { key: "canConfigureLevels", label: "Configurar Niveles CEFR", desc: "Ajustar umbrales A1, A2, B1, B2" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-border shadow-xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Permisos Institucionales</h3>
              <p className="text-xs text-muted-foreground">{user.name} ({ROLE_LABELS[user.role] || user.role})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {permissionsList.map((perm) => {
            const hasPerm = Boolean(user.permissions?.[perm.key as keyof typeof user.permissions]);
            return (
              <div
                key={perm.key}
                className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/60 bg-slate-50/60 dark:bg-slate-800/40"
              >
                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  hasPerm ? "bg-emerald-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                }`}>
                  {hasPerm ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${hasPerm ? "text-foreground" : "text-muted-foreground"}`}>
                    {perm.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{perm.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── 7. Subcomponente Modular: Modal de Confirmación de Eliminación ──────────
interface DeleteUserModalProps {
  user: User | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteUserModal: FC<DeleteUserModalProps> = ({
  user,
  isDeleting,
  onClose,
  onConfirm,
}) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-border shadow-xl space-y-4"
      >
        <div className="flex items-center gap-3 text-rose-600">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Eliminar Usuario</h3>
            <p className="text-xs text-muted-foreground">Acción permanente e irreversible</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300">
          ¿Eliminar al usuario <strong>{user.name}</strong>? Esta acción no se puede deshacer y borrará sus registros de la base de datos.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isDeleting ? "Eliminando..." : "Eliminar permanentemente"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Componente Principal: UsersPage ─────────────────────────────────────────
export const UsersPage = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterUserStatus, setFilterUserStatus] = useState<string>("all");
  const [userCurrentPage, setUserCurrentPage] = useState<number>(1);
  const [userPageSize, setUserPageSize] = useState<number | "all">(50);

  const [serverMetrics, setServerMetrics] = useState<api.AdminMetrics | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isSavingEditUser, setIsSavingEditUser] = useState(false);
  const [userForPermissions, setUserForPermissions] = useState<User | null>(null);

  // Carga inicial desacoplada consumiendo contratos REST limpios
  const loadUsersData = async () => {
    setIsLoading(true);
    try {
      const [apiUsers, metrics] = await Promise.all([
        api.getUsers(),
        api.getAdminMetrics().catch(() => null),
      ]);

      if (metrics) {
        setServerMetrics(metrics);
      }

      const converted: User[] = (apiUsers || [])
        .filter((u) => {
          const email = (u.email || "").toLowerCase();
          const name = (u.name || "").toLowerCase();
          return !email.includes("santiagolegarda") && !name.includes("legarda");
        })
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          password: "",
          role: u.role as any,
          permissions: u.permissions,
          status: u.status,
          createdAt: u.createdAt || new Date().toISOString().split("T")[0],
          docType: u.docType,
          docNum: u.docNum,
          phoneNum: u.phoneNum?.toString(),
          firstName: u.firstName,
          lastName: u.lastName,
          program: u.program || "",
        }));

      setUsers(converted);
    } catch (err: any) {
      toast.error(err?.message || "Error al cargar los usuarios institucionales");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersData();
  }, []);

  // Filtrado reactivo en memoria
  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return users.filter((u) => {
      const matchSearch =
        !term ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        Boolean(u.docNum && u.docNum.toLowerCase().includes(term)) ||
        Boolean(u.program && u.program.toLowerCase().includes(term));
      const matchRole =
        filterRole === "all" ||
        (filterRole === "admin" ? (u.role === "admin" || u.role === "superadmin") : u.role === filterRole);
      const matchStatus = filterUserStatus === "all" || u.status === filterUserStatus;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchTerm, filterRole, filterUserStatus]);

  // Cálculos de Paginación
  const effectiveUserPageSize = userPageSize === "all" ? Math.max(1, filteredUsers.length) : userPageSize;
  const totalUserPages = userPageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredUsers.length / effectiveUserPageSize));
  const safeUserCurrentPage = Math.min(userCurrentPage, totalUserPages);
  const paginatedUsers = useMemo(() => {
    if (userPageSize === "all") return filteredUsers;
    return filteredUsers.slice(
      (safeUserCurrentPage - 1) * effectiveUserPageSize,
      safeUserCurrentPage * effectiveUserPageSize
    );
  }, [filteredUsers, userPageSize, safeUserCurrentPage, effectiveUserPageSize]);

  // Eliminación reactiva sin recargar la página (HTTP 204 handler)
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const targetId = userToDelete.id;
    setIsDeletingUser(true);
    try {
      await api.deleteUser(targetId);
      // Actualizar estado local de React sin requerir recargar la página
      setUsers((prev) => prev.filter((u) => u.id !== targetId));
      if (serverMetrics) {
        setServerMetrics((prev) => prev ? {
          ...prev,
          total_users: Math.max(0, prev.total_users - 1),
          active_users: userToDelete.status === 'active' ? Math.max(0, prev.active_users - 1) : prev.active_users,
        } : null);
      }
      toast.success("Usuario eliminado correctamente de la base de datos.", "Usuario Eliminado");
      setUserToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar usuario en la base de datos.");
    } finally {
      setIsDeletingUser(false);
    }
  };

  // 1. Cambio de estado optimista en 0 milisegundos (sin recargas de tabla ni parpadeo)
  const handleToggleUserStatus = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (target.role === "superadmin" || userId === authUser?.id) {
      toast.error("No es posible desactivar tu propia cuenta o un Super Administrador");
      return;
    }

    const previousStatus = target.status;
    const nextStatus = previousStatus === "active" ? "inactive" : "active";
    const nextIsActive = nextStatus === "active";

    // Actualización optimista inmediata en 0 milisegundos en estado React
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    );

    // Petición en segundo plano: PATCH /api/users/<id>/ con { "is_active": nuevo_estado }
    try {
      await api.updateUser(userId, { is_active: nextIsActive } as any);
      toast.success("Estado actualizado", "Éxito");
    } catch (err: any) {
      // Revertir estado si la API devuelve error
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: previousStatus } : u))
      );
      toast.error(err?.message || "Error al actualizar el estado");
    }
  };

  // 2. Cambio de rol directo desde el badge dropdown con optimistic update
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    if (target.role === newRole) return;
    if (target.role === "superadmin" || userId === authUser?.id) {
      toast.error("No es posible modificar el rol del Super Administrador o tu propia cuenta");
      return;
    }

    const previousRole = target.role;

    // Actualización optimista inmediata en 0 milisegundos
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );

    // Petición en segundo plano: PATCH /api/users/<id>/ con { "role": nuevo_rol }
    try {
      await api.updateUser(userId, { role: newRole } as any);
      toast.success(`Rol actualizado a ${ROLE_LABELS[newRole]}`, "Rol Actualizado");
    } catch (err: any) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: previousRole } : u))
      );
      toast.error(err?.message || "Error al actualizar el rol");
    }
  };

  // 3. Guardado desde el modal de edición de usuario
  const handleSaveEditUser = async (updated: {
    role: UserRole;
    name: string;
    program: string;
    status: "active" | "inactive";
  }) => {
    if (!userToEdit) return;
    const targetId = userToEdit.id;
    const previousUsers = users;

    // Actualización optimista
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetId
          ? {
              ...u,
              role: updated.role,
              name: updated.name,
              program: updated.program,
              status: updated.status,
            }
          : u
      )
    );

    setIsSavingEditUser(true);
    try {
      await api.updateUser(targetId, {
        role: updated.role,
        name: updated.name,
        program: updated.program,
        is_active: updated.status === "active",
      } as any);
      toast.success("Usuario actualizado correctamente", "Perfil Actualizado");
      setUserToEdit(null);
    } catch (err: any) {
      setUsers(previousUsers);
      toast.error(err?.message || "Error al actualizar usuario");
    } finally {
      setIsSavingEditUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-border shadow-xs">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/admin")}
              className="p-2 rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
              title="Volver al Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sena-green/10 text-sena-green border border-sena-green/20">
                  {serverMetrics?.total_users ?? users.length} Registrados
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Administración institucional de aprendices, instructores y directivos SENA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadUsersData}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-muted-foreground hover:bg-muted transition-all text-sm cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} strokeWidth={1.8} /> Actualizar
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="bg-[#39A900] hover:bg-[#2d8500] text-white px-4 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={1.8} /> + Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Toolbar Modular */}
        <UserToolbar
          searchTerm={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setUserCurrentPage(1);
          }}
          filterRole={filterRole}
          onRoleChange={(role) => {
            setFilterRole(role);
            setUserCurrentPage(1);
          }}
          filterUserStatus={filterUserStatus}
          onStatusChange={(status) => {
            setFilterUserStatus(status);
            setUserCurrentPage(1);
          }}
          totalUsersCount={users.length}
          pageSize={userPageSize}
          onPageSizeChange={(size) => {
            setUserPageSize(size);
            setUserCurrentPage(1);
          }}
          onNewUser={() => navigate("/admin")}
        />

        {/* Tabla Modular de Usuarios */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-xs p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sena-green border-t-transparent mb-3" />
            <p className="text-sm font-medium text-foreground">Cargando usuarios desde la base de datos...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <UserTableHeader />
                <tbody className="divide-y divide-border/60">
                  {paginatedUsers.map((user) => (
                    <UserTableRow
                      key={user.id}
                      user={user}
                      isSelf={user.id === authUser?.id}
                      onToggleStatus={handleToggleUserStatus}
                      onDeleteClick={setUserToDelete}
                      onEditClick={setUserToEdit}
                      onRoleChange={handleRoleChange}
                      onViewPermissions={setUserForPermissions}
                    />
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center p-6 text-muted-foreground">
                          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3">
                            <Users className="w-8 h-8 text-muted-foreground/40" strokeWidth={1.5} />
                          </div>
                          <p className="text-base font-semibold text-foreground">No se encontraron usuarios</p>
                          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            {searchTerm || filterRole !== 'all' || filterUserStatus !== 'all'
                              ? "No hay resultados que coincidan con los filtros de búsqueda aplicados."
                              : "No hay usuarios registrados en el sistema institucional."}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación Modular */}
            {filteredUsers.length > 0 && (
              <UserTablePagination
                currentPage={safeUserCurrentPage}
                totalPages={totalUserPages}
                pageSize={userPageSize}
                totalItems={filteredUsers.length}
                effectivePageSize={effectiveUserPageSize}
                onPageChange={setUserCurrentPage}
                onPageSizeChange={(size) => {
                  setUserPageSize(size);
                  setUserCurrentPage(1);
                }}
              />
            )}
          </div>
        )}

        {/* Modales Modulares */}
        <AnimatePresence>
          {userToEdit && (
            <EditUserModal
              user={userToEdit}
              currentUserId={authUser?.id}
              isSaving={isSavingEditUser}
              onClose={() => setUserToEdit(null)}
              onSave={handleSaveEditUser}
            />
          )}
          {userForPermissions && (
            <PermissionsModal
              user={userForPermissions}
              onClose={() => setUserForPermissions(null)}
            />
          )}
          {userToDelete && (
            <DeleteUserModal
              user={userToDelete}
              isDeleting={isDeletingUser}
              onClose={() => setUserToDelete(null)}
              onConfirm={handleConfirmDeleteUser}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
