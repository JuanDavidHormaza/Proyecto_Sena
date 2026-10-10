import { FormEvent, useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { ArrowLeft, Bell, Check, Lock, Mail, Phone, Save, User, GraduationCap, Plus, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserAccountMenu } from "../components/UserAccountMenu";
import * as api from "../services/api";
import {
  validateName,
  sanitizeName,
  validateEmail,
  sanitizeEmail,
  getFieldValidationClass,
} from "../utils/validation";
import { FieldError } from "../components/FieldError";

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

  // Estado para solicitudes de vinculación a programa alterno
  const [newFichaInput, setNewFichaInput] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [fichaRequests, setFichaRequests] = useState<api.ApiFichaRequest[]>([]);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string | null;
    email?: string | null;
  }>({});
  const [touched, setTouched] = useState<{
    name?: boolean;
    email?: boolean;
  }>({});

  const role = user?.role || localStorage.getItem("userRole") || "student";
  const enrolledPrograms = user?.enrolledPrograms && user.enrolledPrograms.length > 0
    ? user.enrolledPrograms
    : (user?.program ? [user.program] : []);

  const loadFichaRequests = async () => {
    try {
      const reqs = await api.getFichaRequests();
      if (Array.isArray(reqs)) {
        setFichaRequests(reqs);
      }
    } catch (e) {
      console.warn("No se pudieron cargar solicitudes de ficha:", e);
    }
  };

  useEffect(() => {
    setName(user?.name || localStorage.getItem("userName") || "");
    setEmail(user?.email || "");
    setPhoneNum(user?.phoneNum ? String(user.phoneNum) : "");
    loadFichaRequests();
  }, [user]);

  const handleNameChange = (val: string) => {
    const hasInvalidChars = !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(val);
    const sanitized = sanitizeName(val);
    setName(sanitized);
    setTouched((prev) => ({ ...prev, name: true }));
    if (hasInvalidChars) {
      setFieldErrors((prev) => ({
        ...prev,
        name: "Solo se permiten letras y espacios. No se aceptan números ni caracteres especiales.",
      }));
    } else {
      const v = validateName(sanitized, "Nombre completo");
      setFieldErrors((prev) => ({ ...prev, name: v.error }));
    }
  };

  const handleNameBlur = () => {
    setTouched((prev) => ({ ...prev, name: true }));
    const v = validateName(name, "Nombre completo");
    setFieldErrors((prev) => ({ ...prev, name: v.error }));
  };

  const handleEmailChange = (val: string) => {
    const sanitized = sanitizeEmail(val);
    setEmail(sanitized);
    setTouched((prev) => ({ ...prev, email: true }));
    const v = validateEmail(sanitized);
    setFieldErrors((prev) => ({ ...prev, email: v.error }));
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const v = validateEmail(email);
    setFieldErrors((prev) => ({ ...prev, email: v.error }));
  };

  const isFormValid =
    !fieldErrors.name &&
    !fieldErrors.email &&
    name.trim().length >= 2 &&
    email.trim().length > 0;

  const handleRequestFicha = async (e: FormEvent) => {
    e.preventDefault();
    const cleanFicha = newFichaInput.trim();
    if (!cleanFicha) return;
    setIsEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");
    try {
      const req = await api.createFichaRequest(cleanFicha);
      setEnrollSuccess("Solicitud enviada correctamente. El Administrador validará tu vinculación.");
      setNewFichaInput("");
      await loadFichaRequests();
    } catch (err: any) {
      setEnrollError(err?.message || "No se pudo registrar la solicitud de ficha.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;

    const nameVal = validateName(name, "Nombre completo");
    const emailVal = validateEmail(email);

    if (!nameVal.isValid || !emailVal.isValid) {
      setTouched({ name: true, email: true });
      setFieldErrors({
        name: nameVal.error,
        email: emailVal.error,
      });
      setMessage("Por favor corrige los campos con errores antes de continuar.");
      return;
    }

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
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
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
          <div className="lg:col-span-2 space-y-6">
            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-sena-green/10 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-sena-green" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Datos del perfil</h2>
                  <p className="text-sm text-muted-foreground">Informacion visible en tu cuenta</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block">
                    <span className="block text-sm font-medium text-foreground mb-1.5">Nombre completo</span>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => handleNameChange(event.target.value)}
                        onBlur={handleNameBlur}
                        className={`w-full pl-12 pr-4 py-3 bg-white border rounded-xl focus:outline-none transition-all ${getFieldValidationClass(
                          !!touched.name,
                          fieldErrors.name,
                          name
                        )}`}
                        placeholder="Tu nombre completo"
                        required
                      />
                    </div>
                  </label>
                  <FieldError error={touched.name ? fieldErrors.name : undefined} />
                </div>

                <div>
                  <label className="block">
                    <span className="block text-sm font-medium text-foreground mb-1.5">Correo electronico</span>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => handleEmailChange(event.target.value)}
                        onBlur={handleEmailBlur}
                        className={`w-full pl-12 pr-4 py-3 bg-white border rounded-xl focus:outline-none transition-all ${getFieldValidationClass(
                          !!touched.email,
                          fieldErrors.email,
                          email
                        )}`}
                        placeholder="usuario@ejemplo.com"
                        required
                      />
                    </div>
                  </label>
                  <FieldError error={touched.email ? fieldErrors.email : undefined} />
                </div>

                <label className="block">
                  <span className="block text-sm font-medium text-foreground mb-1.5">Telefono</span>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
                    <input
                      type="tel"
                      value={phoneNum}
                      onChange={(event) => setPhoneNum(event.target.value.replace(/\D/g, ""))}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                      placeholder="Numero de contacto"
                    />
                  </div>
                </label>
              </div>
            </motion.section>

            {/* Apartado: Solicitar Vinculación a Programa Alterno (Multiprograma SENA) */}
            <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">Solicitar Vinculación a Programa Alterno</h2>
                    <p className="text-sm text-muted-foreground">Gestión y solicitud de segunda ficha formativa SENA</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sena-green/10 text-sena-green border border-sena-green/20">
                  {enrolledPrograms.length} {enrolledPrograms.length === 1 ? "Ficha activa" : "Fichas activas"}
                </span>
              </div>

              {/* Fichas activas */}
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fichas vinculadas activas:</p>
                <div className="flex flex-wrap gap-2">
                  {enrolledPrograms.map((prog) => (
                    <span
                      key={prog}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-sena-blue" strokeWidth={1.8} />
                      {prog}
                    </span>
                  ))}
                </div>
              </div>

              {/* Formulario de solicitud de vinculación */}
              <form onSubmit={handleRequestFicha} className="p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4 text-sena-green" strokeWidth={1.8} />
                  <span className="text-xs font-bold text-slate-800">Solicitar vinculación de nueva ficha extra:</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Ingresa el código numérico de la ficha adicional que cursas (ej. 3520681, 3411643). El Administrador verificará y autorizará tu vinculación.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFichaInput}
                    onChange={(e) => setNewFichaInput(e.target.value)}
                    placeholder="Ej. 3520681"
                    className="flex-1 px-3.5 py-2 bg-white border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                  />
                  <button
                    type="submit"
                    disabled={isEnrolling || !newFichaInput.trim()}
                    className="px-4 py-2 bg-sena-green hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    {isEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.8} /> : <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />}
                    <span>Enviar Solicitud</span>
                  </button>
                </div>
                {enrollSuccess && (
                  <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
                    <span>{enrollSuccess}</span>
                  </div>
                )}
                {enrollError && (
                  <div className="mt-2 text-xs text-rose-600 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
                    <span>{enrollError}</span>
                  </div>
                )}
              </form>

              {/* Historial de Solicitudes Realizadas */}
              {fichaRequests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Estado de tus solicitudes:</p>
                  <div className="space-y-2">
                    {fichaRequests.map((req) => (
                      <div
                        key={req.request_id}
                        className="p-3 bg-white border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">Ficha {req.ficha_code}</span>
                            <span className="text-xs text-muted-foreground">• {req.program_name}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Fecha: {new Date(req.created_at).toLocaleDateString("es-CO")}
                            {req.admin_notes && ` — Observación: ${req.admin_notes}`}
                          </p>
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              req.status === "APROBADA"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : req.status === "RECHAZADA"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {req.status === "APROBADA"
                              ? "Aprobada por Administrador"
                              : req.status === "RECHAZADA"
                              ? "Rechazada"
                              : "Pendiente de revisión"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          </div>

          <motion.aside initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <section className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
                </div>
                <h2 className="font-semibold text-foreground">Preferencias</h2>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-xl cursor-pointer">
                  <span className="text-sm text-foreground">Notificaciones por correo</span>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(event) => setEmailNotifications(event.target.checked)}
                    className="w-5 h-5 accent-sena-green"
                  />
                </label>
                <label className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-xl cursor-pointer">
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

            <section className="bg-white rounded-2xl border border-border shadow-sm p-6">
              <div className="flex items-center gap-3 mb-3">
                <Lock className="w-5 h-5 text-warning" strokeWidth={1.8} />
                <h2 className="font-semibold text-foreground">Seguridad</h2>
              </div>
              <p className="text-sm text-muted-foreground">La contrasena se gestiona desde autenticacion. Tus datos basicos quedan asociados a tu sesion actual.</p>
            </section>

            <button
              type="submit"
              disabled={isSaving || !user?.id || !isFormValid}
              className="w-full flex items-center justify-center gap-2 bg-sena-green text-white py-3 rounded-xl hover:bg-sena-green-dark transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? <Check className="w-5 h-5" strokeWidth={1.8} /> : <Save className="w-5 h-5" strokeWidth={1.8} />}
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