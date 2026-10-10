import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
  ArrowLeft,
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { useToast } from "../components/Toast";
import {
  validateEmail,
  sanitizeEmail,
  getFieldValidationClass,
} from "../utils/validation";
import { FieldError } from "../components/FieldError";

type LoginStep = "credentials" | "otp";

function getProgramIcon(program: string) {
  const norm = program.toLowerCase();
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
  const { login, updateUser } = useAuth();
  const toast = useToast();

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
    <div className="min-h-screen bg-background flex relative">
      {/* ── Formulario de Inicio de Sesión y Código ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <button
            type="button"
            onClick={() => (step === "otp" ? setStep("credentials") : navigate("/"))}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
            <span>{step === "otp" ? "Volver a credenciales" : "Volver al inicio"}</span>
          </button>

          {/* Logo Circular Adaptativo */}
          <div className="flex items-center gap-3.5 mb-8">
            <img
              src="/worklex.png"
              alt="WorkLex SENA"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-500/30 shadow-md transition-transform hover:scale-105 flex-shrink-0"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">English Level Test</h1>
              <p className="text-xs text-muted-foreground font-medium">Plataforma SENA</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── PASO 1: Ingreso de Credenciales ── */}
            {step === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">Bienvenido de nuevo</h2>
                <p className="text-sm text-muted-foreground mb-8">Ingresa tus credenciales para continuar tu formación</p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl mb-6 text-destructive text-sm"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
                    <p className="leading-snug">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-1.5 block">Correo electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={handleEmailBlur}
                        placeholder="tu@correo.com"
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none transition-all text-sm ${getFieldValidationClass(
                          emailTouched,
                          emailError,
                          formData.email
                        )}`}
                      />
                    </div>
                    <FieldError error={emailTouched ? emailError : undefined} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-foreground">Contraseña</label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-12 py-3 border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.8} /> : <Eye className="w-4 h-4" strokeWidth={1.8} />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => navigate("/recuperar-cuenta")}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold hover:underline transition-colors cursor-pointer"
                      >
                        ¿Olvidaste tu contraseña? / Recuperar cuenta
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !formData.email.trim() || !formData.password || Boolean(emailError)}
                    className="w-full bg-sena-green hover:bg-sena-green/90 text-white py-3.5 rounded-xl font-bold transition-all shadow-md shadow-sena-green/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <span>Validando credenciales...</span>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" strokeWidth={1.8} />
                        <span>Continuar</span>
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-8">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-sena-green font-semibold hover:underline cursor-pointer"
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
              >
                <div className="flex justify-center mb-5">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs border border-emerald-100">
                    <KeyRound className="w-8 h-8" strokeWidth={1.8} />
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2 text-center tracking-tight">
                  Verificación de Seguridad
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1 text-center leading-relaxed max-w-sm mx-auto">
                  Hemos enviado un código seguro a tu correo registrado. Ingrésalo a continuación para acceder a tu entorno institucional Worklex SENA.
                </p>
                <p className="text-center font-bold text-foreground text-sm mb-6">{otpEmail}</p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl mb-6 text-destructive text-sm"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
                    <p className="leading-snug">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block text-center">
                      Código de 6 dígitos
                    </label>
                    {/* 6 Casillas Numéricas con Foco Automático Secuencial */}
                    <div className="flex justify-between gap-2 sm:gap-2.5 max-w-xs mx-auto">
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
                          className="w-11 h-14 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black font-mono border-2 border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all shadow-2xs"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join("").length < 6}
                    className="w-full bg-sena-green hover:bg-sena-green/90 text-white py-3.5 rounded-xl font-bold transition-all shadow-md shadow-sena-green/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-sm"
                  >
                    {isLoading ? (
                      <span>Validando código...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" strokeWidth={1.8} />
                        <span>Validar y Acceder</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2 mt-6">
                  <p className="text-xs text-muted-foreground">¿No recibiste el código?</p>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown > 0 ? "animate-spin" : ""}`} strokeWidth={1.8} />
                    <span>{resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : "Reenviar código"}</span>
                  </button>
                </div>

                <p className="text-center text-[11px] text-muted-foreground mt-3">
                  Por seguridad, el código tiene una validez de 10 minutos.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Panel lateral corporativo SENA ── */}
      <div
        className="hidden lg:flex flex-1 relative items-center justify-center p-12 bg-cover bg-center"
        style={{ backgroundImage: "url('/GenteSena.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />
        <div className="relative z-10 text-white text-center max-w-sm">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src="/worklex.png"
              alt="WorkLex SENA"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-emerald-500/40 shadow-lg transition-transform hover:scale-105"
            />
            <h3 className="text-3xl font-extrabold tracking-tight">WorkLex SENA</h3>
          </div>
          <p className="text-white/85 text-base leading-relaxed">
            Plataforma institucional de evaluación diagnóstica de inglés técnico y diccionarios por competencias formativas según el Marco Común Europeo (CEFR).
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ALERT VIEW: SELECCIÓN DE FICHA ACTIVA PARA APRENDICES CON MULTIPROGRAMA
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showFichaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Seleccionar Ficha de Formación Activa"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs border border-emerald-100">
                  <Layers className="w-7 h-7" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                  Bienvenido a Worklex SENA
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {multiPrograms.length === 2
                    ? "Tienes dos programas activos. ¿Con cuál ficha deseas ingresar en esta sesión?"
                    : `Tienes ${multiPrograms.length} programas activos. ¿Con cuál ficha deseas ingresar en esta sesión?`}
                </p>
              </div>

              {/* Tarjetas interactivas de cada Ficha */}
              <div className="space-y-3 mb-6 max-h-72 overflow-y-auto pr-1">
                {multiPrograms.map((prog, idx) => {
                  const fichaMatch = prog.match(/Ficha\s*(\d+)/i) || prog.match(/(\d{6,8})/);
                  const fichaNum = fichaMatch ? fichaMatch[1] : `Ficha #${idx + 1}`;
                  const cleanName = prog.replace(/\s*-\s*Ficha.*$/i, "").trim();

                  return (
                    <motion.button
                      key={prog}
                      type="button"
                      onClick={() => handleSelectFicha(prog)}
                      whileHover={{ scale: 1.015, y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/40 transition-all flex items-center gap-4 group cursor-pointer shadow-2xs hover:shadow-md"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:border-emerald-300">
                        {getProgramIcon(prog)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-800 text-sm group-hover:text-emerald-900 truncate">
                            {cleanName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {fichaNum}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          Habilitar panel y vocabulario técnico especializado
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" strokeWidth={1.8} />
                    </motion.button>
                  );
                })}
              </div>

              {/* Botón de acceso por defecto si no decide */}
              <button
                type="button"
                onClick={() => handleSelectFicha(multiPrograms[0])}
                className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer text-center"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Vinculación Inicial de Ficha y Programa"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs border border-emerald-100">
                  <GraduationCap className="w-7 h-7" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                  Bienvenido a Worklex SENA
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Para habilitar tu entorno de formación y los diccionarios técnicos, por favor ingresa los datos de tu ficha y programa:
                </p>
              </div>

              {manualEnrollError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" strokeWidth={1.8} />
                  <span>{manualEnrollError}</span>
                </div>
              )}

              <form onSubmit={handleManualEnrollSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    Número / Código de Ficha
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={manualFichaInput}
                    onChange={(e) => setManualFichaInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ej: 3520681, 3411643..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5 uppercase tracking-wider">
                    Programa de Formación
                  </label>
                  <select
                    value={manualProgramInput}
                    onChange={(e) => setManualProgramInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-sm font-semibold"
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
                  className="w-full py-3.5 bg-sena-green hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
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
                  className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors text-center cursor-pointer"
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
