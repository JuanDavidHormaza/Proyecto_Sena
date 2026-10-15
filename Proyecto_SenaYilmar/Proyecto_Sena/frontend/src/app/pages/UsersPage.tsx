import { useState, useEffect, useMemo, FC } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, RefreshCw, Plus, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle, ArrowLeft
} from "lucide-react";
import * as api from "../services/api";
import { User } from "../data/users";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";

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
  onRefresh: () => void;
  onNewUser: () => void;
  isLoading: boolean;
}

const UserToolbar: FC<UserToolbarProps> = ({
  searchTerm,
  onSearchChange,
  filterRole,
  onRoleChange,
  filterUserStatus,
  onStatusChange,
  onRefresh,
  onNewUser,
  isLoading,
}) => {
  const rolePills = [
    { id: "all", label: "Todos" },
    { id: "student", label: "Aprendices" },
    { id: "teacher", label: "Instructores" },
    { id: "admin", label: "Administradores" },
  ];

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border shadow-xs">
      <div className="relative flex-1 min-w-[260px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
        <input
          type="text"
          placeholder="Buscar por nombre, correo, documento o ficha..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 text-sm shadow-2xs"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-xl border border-border bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold gap-1 shadow-2xs">
          {rolePills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => onRoleChange(pill.id)}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterRole === pill.id
                  ? "bg-white dark:bg-slate-900 text-foreground font-bold shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <select
            value={filterUserStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 appearance-none cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground shadow-2xs"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>
      </div>
    </div>
  );
};

// ─── 2. Subcomponente Modular: Encabezado de la Tabla ─────────────────────────
const UserTableHeader: FC = () => (
  <thead>
    <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider">
      <th className="text-left py-3.5 px-5 font-semibold">Usuario (Nombre y Correo)</th>
      <th className="text-left py-3.5 px-5 font-semibold">Documento</th>
      <th className="text-left py-3.5 px-5 font-semibold">Rol Institucional</th>
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
}

const UserTableRow: FC<UserTableRowProps> = ({
  user,
  isSelf,
  onToggleStatus,
  onDeleteClick,
}) => {
  const isTargetSuperAdmin = user.role === "superadmin";

  return (
    <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
      {/* Columna 1: Usuario con Avatar y Tooltip Truncado */}
      <td className="py-3.5 px-5">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-xs ${
              user.role === "superadmin" || user.role === "admin"
                ? "bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/20"
                : user.role === "teacher"
                ? "bg-gradient-to-br from-blue-600 to-sky-700 shadow-blue-500/20"
                : "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/20"
            }`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 max-w-[220px]">
            <div className="flex items-center gap-2">
              <span
                className="truncate max-w-[220px] font-semibold text-slate-900 dark:text-slate-100 text-sm inline-block"
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
            <p className="text-xs text-slate-500 font-normal truncate max-w-[220px]" title={user.email}>
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

      {/* Columna 3: Rol Institucional */}
      <td className="py-3.5 px-5 whitespace-nowrap">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold inline-block ${ROLE_COLORS[user.role] || "bg-muted text-muted-foreground"}`}>
          {ROLE_LABELS[user.role] || user.role}
        </span>
      </td>

      {/* Columna 4: Programa / Ficha */}
      <td className="py-3.5 px-5">
        <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px] inline-block" title={user.program || "Sin asignar"}>
          {user.program || "—"}
        </span>
      </td>

      {/* Columna 5: Estado */}
      <td className="py-3.5 px-5 whitespace-nowrap">
        <button
          type="button"
          onClick={() => !isSelf && !isTargetSuperAdmin && onToggleStatus(user.id)}
          disabled={isSelf || isTargetSuperAdmin}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
            user.status === "active"
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          } ${isSelf || isTargetSuperAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-slate-400"}`} />
          {user.status === "active" ? "Activo" : "Inactivo"}
        </button>
      </td>

      {/* Columna 6: Acciones */}
      <td className="py-3.5 px-5 whitespace-nowrap">
        <div className="flex items-center gap-1">
          {!isSelf && !isTargetSuperAdmin && (
            <button
              type="button"
              onClick={() => onDeleteClick(user)}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              title="Eliminar usuario permanentemente"
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

// ─── 5. Subcomponente Modular: Modal de Confirmación de Eliminación ──────────
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
          ¿Deseas eliminar a <strong>{user.name}</strong>? Esta acción liberará su correo institucional y borrará sus registros de la base de datos.
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

  const handleToggleUserStatus = async (userId: string) => {
    try {
      await api.toggleUserStatus(userId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
        )
      );
      toast.success("Estado del usuario actualizado correctamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al cambiar estado del usuario");
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
          onRefresh={loadUsersData}
          onNewUser={() => navigate("/admin")}
          isLoading={isLoading}
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

        {/* Modal Modular de Confirmación */}
        <AnimatePresence>
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
