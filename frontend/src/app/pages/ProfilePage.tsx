import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Award, BadgeCheck, BookOpen, ClipboardList, Mail,
  Phone, Shield, User, UserRound
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserAccountMenu } from "../components/UserAccountMenu";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "SuperAdministrador",
  admin: "Administrador",
  teacher: "Docente",
  student: "Estudiante",
};

const ROLE_DASHBOARDS: Record<string, string> = {
  superadmin: "/admin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/dashboard",
};

const PERMISSIONS: Array<{ key: string; label: string }> = [
  { key: "canManageUsers", label: "Gestionar usuarios" },
  { key: "canManageDocuments", label: "Gestionar documentos" },
  { key: "canViewStatistics", label: "Ver estadisticas" },
  { key: "canGiveFeedback", label: "Dar retroalimentacion" },
  { key: "canTakeQuiz", label: "Realizar pruebas" },
  { key: "canViewResults", label: "Ver resultados" },
  { key: "canManageSubjects", label: "Gestionar asignaturas" },
  { key: "canConfigureLevels", label: "Configurar niveles" },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const name = user?.name || localStorage.getItem("userName") || "Usuario";
  const role = user?.role || localStorage.getItem("userRole") || "student";
  const roleLabel = ROLE_LABELS[role] || "Usuario";
  const program = localStorage.getItem("userProgram") || (role === "student" ? "Desarrollo de Software" : "English Level Test");
  const activePermissions = PERMISSIONS.filter((permission) => Boolean(user?.permissions?.[permission.key as keyof typeof user.permissions]));
  const lastScore = Number(localStorage.getItem("quizScore") || "0");
  const totalQuestions = Number(localStorage.getItem("totalQuestions") || "0");
  const currentLevel = localStorage.getItem("quizLevel") || (totalQuestions > 0 ? "Registrado" : "Sin nivel");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate(ROLE_DASHBOARDS[role] || "/dashboard")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <UserAccountMenu accent={role === "teacher" ? "blue" : role === "superadmin" ? "purple" : "green"} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden mb-6"
        >
          <div className="bg-gradient-to-r from-sena-green to-sena-blue p-6 lg:p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-24 h-24 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-4xl font-bold shadow-lg">
                {getInitials(name)}
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-3">
                  <BadgeCheck className="w-4 h-4" />
                  {roleLabel}
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold truncate">{name}</h1>
                <p className="text-white/80">{program}</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-5 flex items-center gap-3">
              <Mail className="w-5 h-5 text-sena-blue" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Correo</p>
                <p className="font-medium text-foreground truncate">{user?.email || "Sin correo"}</p>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3">
              <Phone className="w-5 h-5 text-sena-green" />
              <div>
                <p className="text-xs text-muted-foreground">Telefono</p>
                <p className="font-medium text-foreground">{user?.phoneNum || "No registrado"}</p>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3">
              <Shield className="w-5 h-5 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <p className="font-medium text-foreground">{user?.status === "active" ? "Activo" : "Inactivo"}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-sena-green/10 rounded-xl flex items-center justify-center">
                <UserRound className="w-5 h-5 text-sena-green" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Informacion personal</h2>
                <p className="text-sm text-muted-foreground">Datos principales de la cuenta</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                ["Nombres", user?.firstName || name.split(" ")[0] || "No registrado"],
                ["Apellidos", user?.lastName || name.split(" ").slice(1).join(" ") || "No registrado"],
                ["Tipo de documento", user?.docType || "No registrado"],
                ["Numero de documento", user?.docNum || "No registrado"],
              ].map(([label, value]) => (
                <div key={label} className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-sena-blue" />
              </div>
              <h2 className="font-semibold text-foreground">Resumen</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ultima puntuacion</span>
                <span className="font-bold text-foreground">{lastScore}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nivel actual</span>
                <span className="font-bold text-sena-green">{currentLevel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Preguntas registradas</span>
                <span className="font-bold text-foreground">{totalQuestions}</span>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6 bg-white rounded-2xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Permisos activos</h2>
              <p className="text-sm text-muted-foreground">Accesos disponibles para este usuario</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(activePermissions.length > 0 ? activePermissions : [{ key: "default", label: "Sin permisos asignados" }]).map((permission) => (
              <span key={permission.key} className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-xl text-sm text-foreground">
                <BookOpen className="w-4 h-4 text-sena-green" />
                {permission.label}
              </span>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
