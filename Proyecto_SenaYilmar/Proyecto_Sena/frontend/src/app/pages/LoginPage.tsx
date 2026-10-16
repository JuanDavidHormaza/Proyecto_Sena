import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  Wrench,
  Database,
  Code,
  Layers,
  ChevronRight,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Award,
  Mic,
  PenTool,
  Languages,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { toast } from "../components/Toast";
import {
  validateEmail,
  sanitizeEmail,
  getFieldValidationClass,
} from "../utils/validation";
import { FieldError } from "../components/FieldError";

type LoginStep = "credentials" | "otp";

function getProgramIcon(program: string) {
  const norm = (program || "").toLowerCase();
  if (norm.includes("mecánica") || norm.includes("mecanica")) {
    return <Wrench className="w-6 h-6 text-amber-600" strokeWidth={1.8} />;
  }
  if (norm.includes("datos") || norm.includes("data")) {
    return <Database className="w-6 h-6 text-blue-600" strokeWidth={1.8} />;
  }
  if (norm.includes("software") || norm.includes("adso") || norm.includes("desarrollo")) {
    return <Code className="w-6 h-6 text-emerald-600" strokeWidth={1.8} />;
  }
  return <GraduationCap className="w-6 h-6 text-purple-600" strokeWidth={1.8} />;
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams?.get("reason") ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("reason") : null);
  const isIdleTimeout = reason === "timeout" || reason === "idle_timeout";
  const { login, updateUser } = useAuth();

  useEffect(() => {
    if (isIdleTimeout) {
      toast.warning(
        "Tu sesión ha finalizado por inactividad. Inicia sesión nuevamente por seguridad.",
        "Sesión Finalizada"
      );
    }
  }, [isIdleTimeout]);

  const [step, setStep] = useState<LoginStep>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  const handleEmailChange = (val: string) => {
    const hasSpaces = /\s/.test(val);
    const sanitized = sanitizeEmail(val);
    setFormData((p) => ({ ...p, email: sanitized }));
    setEmailTouched(true);
    if (hasSpaces) {
      setEmailError(
        "Ingresa un correo electrónico válido (ej. usuario@ejemplo.com). No se permiten espacios ni caracteres inválidos."
      );
    } else {
      const v = validateEmail(sanitized);
      setEmailError(v.error);
    }
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    const v = validateEmail(formData.email);
    setEmailError(v.error);
  };

  // Paso 2: Código de Verificación OTP
  const [otpEmail, setOtpEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Alert View: Selección de Ficha activa para aprendices multiprograma
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [multiPrograms, setMultiPrograms] = useState<string[]>([]);
  const [authenticatedUser, setAuthenticatedUser] = useState<api.ApiUser | null>(null);

  // Modal de vinculación manual inicial para Aprendiz sin fichas registradas
  const [showManualFichaModal, setShowManualFichaModal] = useState(false);
  const [manualFichaInput, setManualFichaInput] = useState("");
  const [manualProgramInput, setManualProgramInput] = useState("Análisis y Desarrollo de Software (ADSO)");
  const [isManualEnrolling, setIsManualEnrolling] = useState(false);
  const [manualEnrollError, setManualEnrollError] = useState("");

  const handleManualEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFicha = manualFichaInput.trim();
    if (!cleanFicha) return;
    setIsManualEnrolling(true);
    setManualEnrollError("");
    try {
      const updatedUser = await api.enrollFicha({
        ficha: cleanFicha,
        program: manualProgramInput.trim(),
      });
      updateUser(updatedUser);
      const fullProg = updatedUser.program || `${manualProgramInput} - Ficha ${cleanFicha}`;
      localStorage.setItem("userProgram", fullProg);
      toast.success("Ficha y programa vinculados correctamente.", "Formación Actualizada");
      setShowManualFichaModal(false);
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err?.message || "No se pudo vincular la ficha.";
      setManualEnrollError(msg);
      toast.error(msg, "Error al Vincular Ficha");
    } finally {
      setIsManualEnrolling(false);
    }
  };

  const processUserPostLogin = (loggedUser: api.ApiUser) => {
    toast.success("Bienvenido a WorkLex SENA.", "Acceso Autorizado");
    const userRole = loggedUser.role;
    if (userRole === "admin" || userRole === "superadmin") {
      navigate("/admin");
      return;
    }
    if (userRole === "teacher") {
      navigate("/teacher");
      return;
    }

    // ── Flujo Aprendiz: Detección de Fichas Aprobadas ─────────────────────
    const programs = (loggedUser.enrolledPrograms && loggedUser.enrolledPrograms.length > 0)
      ? loggedUser.enrolledPrograms
      : (loggedUser.program ? [loggedUser.program] : []);

    // CASO 1: SIN FICHAS (Aprendiz registrado limpio sin ficha asignada)
    if (programs.length === 0) {
      localStorage.removeItem("userProgram");
      setAuthenticatedUser(loggedUser);
      setShowManualFichaModal(true);
      return;
    }

    // CASO 2: EXACTAMENTE 1 FICHA -> Ingreso directo al Dashboard
    if (programs.length === 1) {
      localStorage.setItem("userProgram", programs[0]);
      navigate("/dashboard");
      return;
    }

    // CASO 3: 2 O MÁS FICHAS -> Alert View de Selección de Ficha
    setMultiPrograms(programs);
    setAuthenticatedUser(loggedUser);
    setShowFichaModal(true);
  };

  // ── Paso 1: Enviar credenciales e iniciar flujo de código de verificación ──
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Purga total de cualquier sesión o token previo antes de iniciar una nueva autenticación
    api.clearAllTokens();

    const v = validateEmail(formData.email);
    setEmailTouched(true);
    setEmailError(v.error);

    if (!v.isValid || !formData.password) {
      setError("Por favor ingresa un correo electrónico válido y tu contraseña.");
      toast.warning("Por favor verifica tus datos de acceso.", "Campos Inválidos");
      return;
    }

    setIsLoading(true);

    try {
      const emailTrimmed = formData.email.trim().toLowerCase();
      const res = await api.requestLogin(emailTrimmed, formData.password);

      setOtpEmail(res?.email || emailTrimmed);
      setStep("otp");
      setOtpDigits(["", "", "", "", "", ""]);
      toast.success("Código de verificación enviado a tu correo.", "Verificación de Seguridad");
    } catch (err: any) {
      console.error("Error en validación de credenciales:", err);
      const msg = err?.message || "Credenciales incorrectas o cuenta inactiva. Verifica tus datos.";
      setError(msg);
      toast.error(msg, "Error de Acceso");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Manejar cambios en las 6 casillas OTP con foco automático ─────────────
  const handleOtpDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
      const nextEl = document.getElementById(`login-otp-${index + 1}`);
      nextEl?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevEl = document.getElementById(`login-otp-${index - 1}`);
      prevEl?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < pasted.length; i++) {
      updated[i] = pasted[i];
    }
    setOtpDigits(updated);

    const targetIdx = Math.min(pasted.length, 5);
    document.getElementById(`login-otp-${targetIdx}`)?.focus();
  };

  // ── Paso 2: Verificar Código OTP de 6 dígitos y acceder ───────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = otpDigits.join("");
    if (code.length < 6) {
      setError("Por favor ingresa los 6 dígitos del código de verificación.");
      toast.warning("Debes completar los 6 dígitos del código de verificación.", "Código Incompleto");
      return;
    }

    setIsLoading(true);

    try {
      // Purga preventiva de cualquier residuo previo antes de autenticar al usuario verificado
      api.clearAllTokens();

      const loggedUser = await login({
        otp_email: otpEmail,
        otp_code: code,
        email: otpEmail,
      });

      processUserPostLogin(loggedUser);
    } catch (err: any) {
      console.error("Error al validar código de verificación:", err);
      const msg = err?.message || "Código de verificación incorrecto o expirado.";
      setError(msg);
      toast.error(msg, "Código Inválido");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reenviar Código OTP ──────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.resendLoginOTP(otpEmail);
      toast.success("Nuevo código enviado a tu correo.", "Código Reenviado");
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      const msg = "No se pudo reenviar el código. Intenta nuevamente en unos momentos.";
      setError(msg);
      toast.error(msg, "Error de Reenvío");
    }
  };

  // ── Selección de Ficha en Alert View ─────────────────────────────────────
  const handleSelectFicha = async (selectedProgram: string) => {
    try {
      localStorage.setItem("userProgram", selectedProgram);
      await api.switchProgram(selectedProgram);
      if (authenticatedUser) {
        updateUser({ ...authenticatedUser, program: selectedProgram });
      }
    } catch (err) {
      console.warn("Aviso al conmutar ficha activa en sesión:", err);
    } finally {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 grid lg:grid-cols-12 relative">
      {/* ── Panel Izquierdo (Formulario - 5 cols) ── */}
      <div className="lg:col-span-5 min-h-screen flex flex-col justify-center items-center px-6 lg:px-16 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800">
        <div className="w-full max-w-sm space-y-5">
          <button
            type="button"
            onClick={() => (step === "otp" ? setStep("credentials") : navigate("/"))}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{step === "otp" ? "Volver a credenciales" : "Volver al inicio"}</span>
          </button>

          {/* Header con logo SENA / WorkLex alineados horizontalmente */}
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/logo-sena.png"
              alt="SENA"
              className="h-10 w-auto object-contain shrink-0"
            />
            <span className="h-6 w-px bg-slate-300 dark:bg-slate-700 shrink-0" />
            <img
              src="/worklex.png"
              alt="WorkLex"
              className="h-8 w-auto object-contain shrink-0"
            />
          </div>

          <AnimatePresence mode="wait">
            {/* ── PASO 1: Ingreso de Credenciales ── */}
            {step === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Iniciar Sesión
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Ingresa tus credenciales para continuar tu formación
                  </p>
                </div>

                {isIdleTimeout && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md text-amber-800 dark:text-amber-200 text-xs font-medium"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="leading-snug">Tu sesión ha finalizado por inactividad. Inicia sesión nuevamente por seguridad.</p>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-600 dark:text-rose-400 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="leading-snug">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={handleEmailBlur}
                        placeholder="aprendiz@soy.sena.edu.co"
                        className={`w-full h-10 text-sm bg-white dark:bg-slate-800 border rounded-md pl-9 pr-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:border-transparent transition-all shadow-sm ${
                          emailTouched && emailError
                            ? "border-rose-400 focus:ring-rose-500"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                      />
                    </div>
                    <FieldError error={emailTouched ? emailError : undefined} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                        Contraseña
                      </label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full h-10 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md pl-9 pr-9 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:border-transparent transition-all shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                        title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const userEmail = (formData.email || "").trim().toLowerCase();
                          if (userEmail) {
                            sessionStorage.setItem("reset_email", userEmail);
                            sessionStorage.setItem("recover_email", userEmail);
                            navigate(`/recuperar-cuenta?email=${encodeURIComponent(userEmail)}`);
                          } else {
                            navigate("/recuperar-cuenta");
                          }
                        }}
                        className="text-[#39A900] hover:underline font-medium text-xs cursor-pointer"
                      >
                        ¿Olvidaste tu contraseña? / Recuperar cuenta
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !formData.email.trim() || !formData.password || Boolean(emailError)}
                    className="w-full h-10 bg-[#39A900] hover:bg-[#2e8600] text-white font-medium text-sm rounded-md shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validando credenciales...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuar</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-[#39A900] hover:underline font-medium text-xs cursor-pointer"
                  >
                    Regístrate aquí
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── PASO 2: Código de Verificación OTP Profesional ── */}
            {step === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-[#39A900] rounded-xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
                    <KeyRound className="w-6 h-6" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-center">
                    Verificación de Seguridad
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-1 text-center leading-relaxed">
                    Hemos enviado un código seguro a tu correo registrado. Ingrésalo para acceder a Worklex SENA.
                  </p>
                  <p className="text-center font-bold text-slate-800 dark:text-slate-200 text-xs">{otpEmail}</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 p-3 bg-rose-500/10 border border-rose-500/20 rounded-md text-rose-600 dark:text-rose-400 text-xs"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="leading-snug">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2.5 block text-center">
                      Código de 6 dígitos
                    </label>
                    <div className="flex justify-between gap-2 max-w-xs mx-auto">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`login-otp-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          required
                          autoFocus={idx === 0}
                          value={digit}
                          onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="w-11 h-11 text-center text-lg font-bold font-mono border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:border-transparent transition-all shadow-sm"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join("").length < 6}
                    className="w-full h-10 bg-[#39A900] hover:bg-[#2e8600] text-white font-medium text-sm rounded-md shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validando código...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Validar y Acceder</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2">
                  <p className="text-xs text-slate-500">¿No recibiste el código?</p>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="flex items-center gap-1 text-[#39A900] hover:underline font-medium text-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${resendCooldown > 0 ? "animate-spin" : ""}`} />
                    <span>{resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : "Reenviar código"}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Columna Derecha (Hero Institucional - 7 cols) ── */}
      <div className="hidden lg:block lg:col-span-7 relative overflow-hidden min-h-screen bg-slate-900">
        <img
          src="/GenteSena.jpg"
          alt="Aprendices SENA"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-slate-900/40" />
        <div className="absolute bottom-12 left-12 right-12 z-10 text-white">
          <blockquote className="text-xl font-medium leading-relaxed">
            "Formación profesional integral para el desarrollo tecnológico y lingüístico de Colombia."
          </blockquote>
          <p className="mt-3 text-sm text-slate-300 font-light">Servicio Nacional de Aprendizaje — SENA</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ALERT VIEW: SELECCIÓN DE FICHA ACTIVA PARA APRENDICES CON MULTIPROGRAMA
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showFichaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Seleccionar Ficha de Formación Activa"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-[#39A900] rounded-lg flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <Layers className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Bienvenido a Worklex SENA
                </h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  {multiPrograms.length === 2
                    ? "Tienes dos programas activos. ¿Con cuál ficha deseas ingresar en esta sesión?"
                    : `Tienes ${multiPrograms.length} programas activos. ¿Con cuál ficha deseas ingresar en esta sesión?`}
                </p>
              </div>

              {/* Tarjetas interactivas de cada Ficha */}
              <div className="space-y-2.5 mb-5 max-h-72 overflow-y-auto pr-1">
                {multiPrograms.map((prog, idx) => {
                  const fichaMatch = prog.match(/Ficha\s*(\d+)/i) || prog.match(/(\d{6,8})/);
                  const fichaNum = fichaMatch ? fichaMatch[1] : `Ficha #${idx + 1}`;
                  const cleanName = prog.replace(/\s*-\s*Ficha.*$/i, "").trim();

                  return (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => handleSelectFicha(prog)}
                      className="w-full text-left p-3.5 rounded-lg border border-slate-200 hover:border-[#39A900] bg-white hover:bg-slate-50/80 transition-colors flex items-center gap-3.5 group cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:border-emerald-300">
                        {getProgramIcon(prog)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-slate-800 text-sm group-hover:text-[#39A900] truncate">
                            {cleanName}
                          </span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {fichaNum}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          Habilitar panel y vocabulario técnico especializado
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#39A900] transition-colors flex-shrink-0" strokeWidth={1.8} />
                    </button>
                  );
                })}
              </div>

              {/* Botón de acceso por defecto si no decide */}
              <button
                type="button"
                onClick={() => handleSelectFicha(multiPrograms[0])}
                className="w-full py-2.5 px-4 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer text-center"
              >
                Ingresar con programa predeterminado ({multiPrograms[0]})
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: VINCULACIÓN INICIAL DE FICHA Y PROGRAMA (APRENDIZ SIN FICHAS)
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showManualFichaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-200 p-6 sm:p-8 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Vinculación Inicial de Ficha y Programa"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-[#39A900] rounded-lg flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <GraduationCap className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  Bienvenido a Worklex SENA
                </h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                  Para habilitar tu entorno de formación y los diccionarios técnicos, por favor ingresa los datos de tu ficha y programa:
                </p>
              </div>

              {manualEnrollError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" strokeWidth={1.8} />
                  <span>{manualEnrollError}</span>
                </div>
              )}

              <form onSubmit={handleManualEnrollSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    Número / Código de Ficha
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={manualFichaInput}
                    onChange={(e) => setManualFichaInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="Número de ficha (ej. 2670142)"
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:border-transparent text-sm shadow-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    Programa de Formación
                  </label>
                  <select
                    value={manualProgramInput}
                    onChange={(e) => setManualProgramInput(e.target.value)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:border-transparent text-sm shadow-sm"
                  >
                    <option value="Análisis y Desarrollo de Software (ADSO)">Análisis y Desarrollo de Software (ADSO)</option>
                    <option value="Análisis de Datos">Análisis de Datos</option>
                    <option value="Mecánica Industrial">Mecánica Industrial</option>
                    <option value="Redes y Telecomunicaciones">Redes y Telecomunicaciones</option>
                    <option value="Producción Multimedia">Producción Multimedia</option>
                    <option value="Seguridad Informática">Seguridad Informática</option>
                    <option value="Automatización Industrial">Automatización Industrial</option>
                    <option value="Gestión Empresarial">Gestión Empresarial</option>
                    <option value="Diseño Gráfico">Diseño Gráfico</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isManualEnrolling || !manualFichaInput.trim()}
                  className="w-full h-10 bg-[#39A900] hover:bg-[#2d8500] text-white font-medium text-sm rounded-md shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {isManualEnrolling ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} />
                      <span>Vinculando formación...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />
                      <span>Vincular Ficha y Programa</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors text-center cursor-pointer"
                >
                  Continuar al panel y configurar más tarde
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LoginPage;
