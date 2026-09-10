import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowLeft, Bell, Check, Lock, Mail, Phone, Save, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { IconBadge } from "../components/ui/icon-badge";
import * as api from "../services/api";

const ROLE_DASHBOARDS: Record<string, string> = {
  superadmin: "/admin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/dashboard",
};

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNum, setPhoneNum] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem("emailNotifications") !== "false");
  const [studyReminders, setStudyReminders] = useState(() => localStorage.getItem("studyReminders") === "true");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const role = user?.role || localStorage.getItem("userRole") || "student";

  useEffect(() => {
    setName(user?.name || localStorage.getItem("userName") || "");
    setEmail(user?.email || "");
    setPhoneNum(user?.phoneNum ? String(user.phoneNum) : "");
  }, [user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;

    setIsSaving(true);
    setMessage("");

    try {
      const updatedUser = await api.updateUser(user.id, {
        name,
        email,
        phoneNum: phoneNum ? Number(phoneNum) : undefined,
      });
      updateUser(updatedUser);
      localStorage.setItem("emailNotifications", String(emailNotifications));
      localStorage.setItem("studyReminders", String(studyReminders));
      setMessage("Configuracion guardada correctamente");
    } catch (error) {
      setMessage("No se pudo guardar la configuracion");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate(ROLE_DASHBOARDS[role] || "/dashboard")}
              className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <UserAccountMenu accent={role === "teacher" ? "blue" : role === "superadmin" ? "purple" : "green"} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Configuracion</h1>
          <p className="text-muted-foreground">Actualiza tus datos y preferencias de cuenta.</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
          <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2 surface-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <IconBadge tone="green" size="md">
                <User />
              </IconBadge>
              <div>
                <h2 className="font-semibold text-foreground">Datos del perfil</h2>
                <p className="text-sm text-muted-foreground">Informacion visible en tu cuenta</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="block text-sm font-medium text-foreground mb-1.5">Nombre completo</span>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-green/40"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-foreground mb-1.5">Correo electronico</span>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-green/40"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-foreground mb-1.5">Telefono</span>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="tel"
                    value={phoneNum}
                    onChange={(event) => setPhoneNum(event.target.value.replace(/\D/g, ""))}
                    className="w-full pl-12 pr-4 py-3 bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-green/40"
                    placeholder="Numero de contacto"
                  />
                </div>
              </label>
            </div>
          </motion.section>

          <motion.aside initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <section className="surface-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <IconBadge tone="blue" size="md">
                  <Bell />
                </IconBadge>
                <h2 className="font-semibold text-foreground">Preferencias</h2>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-2xl cursor-pointer">
                  <span className="text-sm text-foreground">Notificaciones por correo</span>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(event) => setEmailNotifications(event.target.checked)}
                    className="w-5 h-5 accent-sena-green"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-2xl cursor-pointer">
                  <span className="text-sm text-foreground">Recordatorios de estudio</span>
                  <input
                    type="checkbox"
                    checked={studyReminders}
                    onChange={(event) => setStudyReminders(event.target.checked)}
                    className="w-5 h-5 accent-sena-green"
                  />
                </label>
              </div>
            </section>

            <section className="surface-card p-6">
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-5 h-5 text-warning" />
                <h2 className="font-semibold text-foreground">Seguridad</h2>
              </div>
              <p className="text-sm text-muted-foreground">La contrasena se gestiona desde autenticacion. Tus datos basicos quedan asociados a tu sesion actual.</p>
            </section>

            <button
              type="submit"
              disabled={isSaving || !user?.id}
              className="w-full flex items-center justify-center gap-2 bg-sena-green text-white py-3 rounded-full hover:bg-sena-green-dark transition-all font-medium shadow-brand disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>

            {message && (
              <p className={`text-sm text-center ${message.startsWith("No") ? "text-destructive" : "text-sena-green"}`}>
                {message}
              </p>
            )}
          </motion.aside>
        </form>
      </main>
    </div>
  );
}