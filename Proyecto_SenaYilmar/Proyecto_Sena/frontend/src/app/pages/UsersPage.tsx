import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, RefreshCw, Plus, Edit, Trash2, KeyRound, Check,
  ChevronLeft, ChevronRight, X, AlertTriangle, Shield, UserCheck,
  CheckCircle2, ArrowLeft
} from "lucide-react";
import * as api from "../services/api";
import { User, UserPermissions, getDefaultPermissions } from "../data/users";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";

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

export const UsersPage = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isSuperAdmin = authUser?.role === "superadmin";

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

  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<User | null>(null);
  const [tempPermissions, setTempPermissions] = useState<UserPermissions>(getDefaultPermissions("student"));

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

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase().trim();
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

  const effectiveUserPageSize = userPageSize === "all" ? Math.max(1, filteredUsers.length) : userPageSize;
  const totalUserPages = userPageSize === "all" ? 1 : Math.max(1, Math.ceil(filteredUsers.length / effectiveUserPageSize));
  const safeUserCurrentPage = Math.min(userCurrentPage, totalUserPages);
  const paginatedUsers = userPageSize === "all"
    ? filteredUsers
    : filteredUsers.slice(
        (safeUserCurrentPage - 1) * effectiveUserPageSize,
        safeUserCurrentPage * effectiveUserPageSize
      );

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await api.deleteUser(userToDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
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
      await loadUsersData();
      toast.success("Estado del usuario actualizado correctamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al cambiar estado del usuario");
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      await api.changeUserRole(userId, newRole);
      await loadUsersData();
      toast.success("Rol del usuario modificado exitosamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al cambiar el rol del usuario");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Cabecera */}
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
              className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-muted-foreground hover:bg-muted transition-all text-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.8} /> Actualizar
            </button>
            <button
              onClick={() => navigate("/admin")}
              className="bg-[#39A900] hover:bg-[#2d8500] text-white px-4 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 cursor-pointer text-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={1.8} /> + Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 flex-wrap bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border shadow-xs">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
            <input
              type="text"
              placeholder="Buscar por nombre, correo, documento o ficha..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setUserCurrentPage(1);
              }}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 text-sm shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl border border-border bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold gap-1 shadow-2xs">
              {[
                { id: "all", label: "Todos" },
                { id: "student", label: "Aprendices" },
                { id: "teacher", label: "Instructores" },
                { id: "admin", label: "Administradores" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => {
                    setFilterRole(pill.id);
                    setUserCurrentPage(1);
                  }}
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
                onChange={(e) => {
                  setFilterUserStatus(e.target.value);
                  setUserCurrentPage(1);
                }}
                className="pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 appearance-none cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground shadow-2xs"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla de Usuarios */}
        {isLoading ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-xs p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sena-green border-t-transparent mb-3" />
            <p className="text-sm font-medium text-foreground">Cargando usuarios desde la base de datos...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
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
                <tbody className="divide-y divide-border/60">
                  {paginatedUsers.map((user) => {
                    const isSelf = user.id === authUser?.id;
                    const isTargetSuperAdmin = user.role === "superadmin";

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
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
                                <span className="truncate max-w-[220px] font-semibold text-slate-900 dark:text-slate-100 text-sm inline-block" title={user.name}>
                                  {user.name}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                                    Tú
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-normal truncate max-w-[220px]" title={user.email}>{user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                            {user.docType ? `${user.docType} ` : ""}{user.docNum || "—"}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold inline-block ${ROLE_COLORS[user.role] || "bg-muted text-muted-foreground"}`}>
                            {ROLE_LABELS[user.role] || user.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-5">
                          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px] inline-block" title={user.program || "Sin asignar"}>
                            {user.program || "—"}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => !isSelf && !isTargetSuperAdmin && handleToggleUserStatus(user.id)}
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

                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {!isSelf && !isTargetSuperAdmin && (
                              <button
                                type="button"
                                onClick={() => setUserToDelete(user)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar usuario permanentemente"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {filteredUsers.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3.5 border-t border-border bg-muted/20 gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    Mostrando <span className="font-semibold text-foreground">{(safeUserCurrentPage - 1) * effectiveUserPageSize + 1}</span> a{" "}
                    <span className="font-semibold text-foreground">{Math.min(safeUserCurrentPage * effectiveUserPageSize, filteredUsers.length)}</span> de{" "}
                    <span className="font-semibold text-foreground">{filteredUsers.length}</span> usuarios
                  </p>

                  <div className="flex items-center gap-1.5 border-l border-border pl-3">
                    <span className="text-xs text-muted-foreground font-medium">Filas:</span>
                    <div className="inline-flex rounded-lg border border-border bg-white dark:bg-slate-900 p-0.5 text-xs font-semibold shadow-2xs">
                      {([10, 25, 50, "all"] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setUserPageSize(size);
                            setUserCurrentPage(1);
                          }}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            userPageSize === size
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
                  {totalUserPages > 1 ? (
                    <>
                      <button
                        type="button"
                        disabled={safeUserCurrentPage <= 1}
                        onClick={() => setUserCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded-lg border border-border bg-white dark:bg-slate-900 text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Página anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-semibold px-2 text-foreground">
                        Página {safeUserCurrentPage} de {totalUserPages}
                      </span>
                      <button
                        type="button"
                        disabled={safeUserCurrentPage >= totalUserPages}
                        onClick={() => setUserCurrentPage((p) => Math.min(totalUserPages, p + 1))}
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
            )}
          </div>
        )}

        {/* Modal de Confirmación para Eliminar */}
        <AnimatePresence>
          {userToDelete && (
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
                  ¿Deseas eliminar a <strong>{userToDelete.name}</strong>? Esta acción liberará su correo institucional y borrará sus registros de la base de datos.
                </p>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setUserToDelete(null)}
                    disabled={isDeletingUser}
                    className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteUser}
                    disabled={isDeletingUser}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    {isDeletingUser ? "Eliminando..." : "Eliminar permanentemente"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
