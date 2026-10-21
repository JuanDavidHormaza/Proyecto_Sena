import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  Wrench,
  Database,
  Code,
  Layers,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  Loader2,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { toast } from "../components/Toast";
import {
  validateEmail,
  sanitizeEmail,
} from "../utils/validation";
import { FieldError } from "../components/FieldError";
import { IDLE_LOGOUT_MESSAGE, TOKEN_EXPIRED_MESSAGE } from "../utils/sessionManager";

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
  const isSessionExpired = reason === "session_expired";
  const sessionNotice = isIdleTimeout ? IDLE_LOGOUT_MESSAGE : isSessionExpired ? TOKEN_EXPIRED_MESSAGE : null;
  const { login, updateUser } = useAuth();

  useEffect(() => {
    if (sessionNotice) {
      toast.warning(sessionNotice, "Sesión Finalizada");
    }
  }, [sessionNotice]);

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
      sessionStorage.setItem("userProgram", fullProg);
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
    toast.success("Bienvenido a WorkLex.", "Acceso Autorizado");
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
      sessionStorage.removeItem("userProgram");
      setAuthenticatedUser(loggedUser);
      setShowManualFichaModal(true);
      return;
    }

    // CASO 2: EXACTAMENTE 1 FICHA -> Ingreso directo al Dashboard
    if (programs.length === 1) {
      sessionStorage.setItem("userProgram", programs[0]);
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
      sessionStorage.setItem("userProgram", selectedProgram);
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
    <div className="min-h-screen w-full bg-white dark:bg-slate-950 flex flex-col lg:flex-row relative overflow-x-hidden">
      {/* ── Columna Izquierda: Formulario de Autenticación (50% en pantallas grandes) ── */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-6 sm:px-12 md:px-16 lg:px-20 py-10 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 z-10">
        <div className="w-full max-w-lg lg:max-w-xl mx-auto space-y-6">
          {/* Botón superior de navegación */}
          <button
            type="button"
            onClick={() => (step === "otp" ? setStep("credentials") : navigate("/"))}
            className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
            <span>{step === "otp" ? "Volver a credenciales" : "Volver al inicio"}</span>
          </button>

          {/* ── LOGOTIPOS WORKLEX Y SENA (TRANSPARENTE ESTILO MATDASH) ── */}
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-3.5 bg-transparent p-0 mb-6 cursor-pointer"
            role="button"
            tabIndex={0}
            title="WorkLex & SENA - Volver al inicio"
          >
            {/* 1. Logo WorkLex Transparente */}
            <img
              src="/assets/logo-worklex.png"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.includes('logo-worklex.png')) img.src = '/logo-worklex.png';
              }}
              alt="WorkLex"
              className="h-9 sm:h-10 w-auto object-contain bg-transparent mix-blend-multiply dark:mix-blend-normal"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
            />

            {/* Separador fino */}
            <div className="h-6 w-px bg-slate-300 dark:bg-slate-700" />

            {/* 2. Logo Institucional SENA */}
            <img
              src="/assets/logo-sena.svg"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.includes('logo-sena.png')) img.src = '/assets/logo-sena.png';
              }}
              alt="SENA"
              className="h-8 sm:h-9 w-auto object-contain bg-transparent"
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
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
                    Iniciar Sesión
                  </h1>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed mb-8">
                    Accede a tu plataforma inteligente de aprendizaje y práctica técnica.
                  </p>
                </div>

                {sessionNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-800 dark:text-amber-200 text-sm sm:text-base font-medium"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <p className="leading-snug">{sessionNotice}</p>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-sm sm:text-base"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="leading-snug">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                  <div>
                    <label className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2.5 block">
                      Correo electrónico
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={formData.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onBlur={handleEmailBlur}
                        placeholder="aprendiz@soy.sena.edu.co"
                        className={`w-full h-14 text-base sm:text-lg px-4 pl-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#39A900]/20 focus:border-[#39A900] transition-all shadow-xs ${
                          emailTouched && emailError
                            ? "border-rose-400 focus:ring-rose-500/20 focus:border-rose-500"
                            : ""
                        }`}
                      />
                    </div>
                    <FieldError error={emailTouched ? emailError : undefined} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <label className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200">
                        Contraseña
                      </label>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full h-14 text-base sm:text-lg px-4 pl-12 pr-12 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#39A900]/20 focus:border-[#39A900] transition-all shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer p-1"
                        title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="flex justify-end mt-2.5">
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
                        className="text-base font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                      >
                        ¿Olvidaste tu contraseña? / Recuperar cuenta
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !formData.email.trim() || !formData.password || Boolean(emailError)}
                    className="w-full h-14 text-lg sm:text-xl font-bold rounded-2xl bg-[#39A900] hover:bg-[#329600] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Validando credenciales...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuar</span>
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-base sm:text-lg text-slate-600 dark:text-slate-400 pt-2">
                  ¿No tienes cuenta?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="text-base sm:text-lg font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline cursor-pointer"
                  >
                    Regístrate aquí
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── PASO 2: Código de Verificación OTP ── */}
            {step === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-[#39A900] rounded-2xl flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
                    <KeyRound className="w-8 h-8" />
                  </div>
                </div>

                <div className="text-center">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
                    Verificación de Seguridad
                  </h2>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 mt-2 mb-1 leading-relaxed">
                    Hemos enviado un código seguro de 6 dígitos a tu correo:
                  </p>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-base sm:text-lg">{otpEmail}</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-sm sm:text-base"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="leading-snug">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div>
                    <label className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 block text-center">
                      Código de 6 dígitos
                    </label>
                    <div className="flex justify-center gap-2 sm:gap-3">
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
                          className="w-12 sm:w-14 h-14 sm:h-16 text-center text-2xl font-bold font-mono border border-slate-300 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-[#39A900]/20 focus:border-[#39A900] transition-all shadow-xs"
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join("").length < 6}
                    className="w-full h-14 text-lg sm:text-xl font-bold rounded-2xl bg-[#39A900] hover:bg-[#329600] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Validando código...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Validar y Acceder</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <p className="text-base text-slate-600 dark:text-slate-400">¿No recibiste el código?</p>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="flex items-center gap-1.5 text-base font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${resendCooldown > 0 ? "animate-spin" : ""}`} />
                    <span>{resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : "Reenviar código"}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Columna Derecha: Fotografía y Marca (50% en pantallas grandes) ── */}
      <div className="hidden lg:flex lg:w-1/2 relative min-h-screen overflow-hidden bg-slate-900 flex-col justify-end p-8 xl:p-12 items-center text-center">
        <img
          src="/GenteSena.jpg"
          alt="Aprendices SENA"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Oscurecimiento suave para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-slate-950/25" />
        
        {/* Contenedor Inferior: Logo Transparente sobre Cristal y Cita Institucional */}
        <div className="absolute bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center text-center w-full max-w-md px-4">
          {/* Logo flotante libre sin círculo ni contenedor */}
          <div className="flex items-center justify-center p-0 m-0 bg-transparent mb-4">
            <img
              src="/assets/logo-worklex.png"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.src.includes('logo-worklex.png')) img.src = '/logo-worklex.png';
              }}
              alt="WorkLex"
              className="w-48 sm:w-56 h-auto object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.6)] brightness-110"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
            />
          </div>

          {/* Texto pegado y bien legible */}
          <p className="text-white text-base sm:text-lg font-medium leading-snug drop-shadow-md">
            "Formación profesional integral para el desarrollo tecnológico y lingüístico de Colombia."
          </p>
          <span className="text-emerald-300 text-sm font-semibold tracking-wide mt-1 drop-shadow">
            Servicio Nacional de Aprendizaje — SENA
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ALERT VIEW: SELECCIÓN DE FICHA ACTIVA PARA APRENDICES CON MULTIPROGRAMA
          ═══════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showFichaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Seleccionar Ficha de Formación Activa"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-[#39A900] rounded-xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <Layers className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Bienvenido a WorkLex
                </h3>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {multiPrograms.length === 2
                    ? "Tienes dos programas activos. ¿Con cuál ficha deseas ingresar en esta sesión?"
                    : `Tienes ${multiPrograms.length} programas activos. ¿Con cuál ficha deseas ingresar en esta sesión?`}
                </p>
              </div>

              {/* Tarjetas interactivas de cada Ficha */}
              <div className="space-y-3 mb-5 max-h-72 overflow-y-auto pr-1">
                {multiPrograms.map((prog, idx) => {
                  const fichaMatch = prog.match(/Ficha\s*(\d+)/i) || prog.match(/(\d{6,8})/);
                  const fichaNum = fichaMatch ? fichaMatch[1] : `Ficha #${idx + 1}`;
                  const cleanName = prog.replace(/\s*-\s*Ficha.*$/i, "").trim();

                  return (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => handleSelectFicha(prog)}
                      className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#39A900] bg-white dark:bg-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-3.5 group cursor-pointer"
                    >
                      <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0 group-hover:border-emerald-300">
                        {getProgramIcon(prog)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-slate-800 dark:text-white text-base group-hover:text-[#39A900] truncate">
                            {cleanName}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {fichaNum}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                          Habilitar panel y vocabulario técnico especializado
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#39A900] transition-colors flex-shrink-0" strokeWidth={1.8} />
                    </button>
                  );
                })}
              </div>

              {/* Botón de acceso por defecto */}
              <button
                type="button"
                onClick={() => handleSelectFicha(multiPrograms[0])}
                className="w-full py-3 px-4 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
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
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Vinculación Inicial de Ficha y Programa"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-emerald-50 text-[#39A900] rounded-xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                  <GraduationCap className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Bienvenido a WorkLex
                </h3>
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Para habilitar tu entorno de formación y los diccionarios técnicos, por favor ingresa los datos de tu ficha y programa:
                </p>
              </div>

              {manualEnrollError && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" strokeWidth={1.8} />
                  <span>{manualEnrollError}</span>
                </div>
              )}

              <form onSubmit={handleManualEnrollSubmit} className="space-y-4">
                <div>
                  <label className="text-base font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Número / Código de Ficha
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={manualFichaInput}
                    onChange={(e) => setManualFichaInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="Número de ficha (ej. 2670142)"
                    className="w-full h-12 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] text-base shadow-xs"
                  />
                </div>

                <div>
                  <label className="text-base font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    Programa de Formación
                  </label>
                  <select
                    value={manualProgramInput}
                    onChange={(e) => setManualProgramInput(e.target.value)}
                    className="w-full h-12 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] text-base shadow-xs"
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
                  className="w-full h-12 bg-[#39A900] hover:bg-[#2d8500] text-white font-semibold text-base rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer mt-3"
                >
                  {isManualEnrolling ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.8} />
                      <span>Vinculando formación...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" strokeWidth={1.8} />
                      <span>Vincular Ficha y Programa</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full py-2.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors text-center cursor-pointer"
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
