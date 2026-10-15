import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Check,
  GraduationCap,
  Award,
  Mic,
  PenTool,
  Languages,
  BookOpen,
} from "lucide-react";
import * as api from "../services/api";
import { useToast } from "../components/Toast";
import { validateEmail } from "../utils/validation";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const getStoredEmail = (): string => {
    return (
      searchParams.get("email") ||
      sessionStorage.getItem("reset_email") ||
      sessionStorage.getItem("recover_email") ||
      sessionStorage.getItem("resetEmail") ||
      localStorage.getItem("reset_email") ||
      localStorage.getItem("recover_email") ||
      localStorage.getItem("resetEmail") ||
      ""
    ).trim().toLowerCase();
  };

  // Retención persistente de estado entre pasos y recargas
  const [step, setStep] = useState<"email" | "otp" | "success">(() => {
    const savedStep = sessionStorage.getItem("recover_step") || localStorage.getItem("recover_step");
    const savedEmail = getStoredEmail();
    if (savedStep === "otp" && savedEmail) {
      return "otp";
    }
    return "email";
  });

  const [email, setEmail] = useState<string>(() => getStoredEmail());
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sincronizar si cambia el parámetro en URL o si email no estaba cargado
  useEffect(() => {
    const stored = getStoredEmail();
    if (stored && !email) {
      setEmail(stored);
    }
  }, [searchParams]);

  // Validaciones en tiempo real para OTP y contraseña
  const otpCode = otp.join("").trim();
  const isOtpValid = otpCode.length === 6 && /^\d{6}$/.test(otpCode);
  const isPassLengthValid = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const isPassSecure = isPassLengthValid && hasLetter && hasNumber;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isConfirmTouched = confirmPassword.length > 0;
  const showMismatchError = isConfirmTouched && !passwordsMatch;

  const canSubmit = isOtpValid && isPassSecure && passwordsMatch && !isLoading;

  // ── Manejar envío de correo de recuperación (Paso 1) ──────────────────────
  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = (email || getStoredEmail()).trim().toLowerCase();
    const vEmail = validateEmail(cleanEmail);
    if (!vEmail.isValid) {
      setError(vEmail.error || "Por favor ingresa un correo electrónico válido.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Validar si el correo existe en la base de datos
      const checkRes = await api.checkEmail(cleanEmail);
      if (!checkRes.exists) {
        setError("Este correo no se encuentra registrado en Worklex SENA.");
        return;
      }

      // 2. Despachar OTP
      await api.resendLoginOTP(cleanEmail);
      toast.success("Código de recuperación enviado a tu correo.", "Correo enviado");

      // Persistir correo en memoria de sesión, local y URL param para garantizar retención absoluta
      sessionStorage.setItem("reset_email", cleanEmail);
      sessionStorage.setItem("recover_email", cleanEmail);
      sessionStorage.setItem("resetEmail", cleanEmail);
      sessionStorage.setItem("recover_step", "otp");
      localStorage.setItem("reset_email", cleanEmail);
      localStorage.setItem("recover_email", cleanEmail);
      localStorage.setItem("resetEmail", cleanEmail);
      localStorage.setItem("recover_step", "otp");
      setEmail(cleanEmail);
      setSearchParams({ email: cleanEmail }, { replace: true });
      setStep("otp");
      setResendCooldown(60);

      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.detail ||
        err?.error ||
        err?.message ||
        "No se pudo procesar la solicitud en este momento.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Regresar al paso de correo ───────────────────────────────────────────
  const handleBackToEmail = () => {
    setStep("email");
    sessionStorage.removeItem("recover_step");
    localStorage.removeItem("recover_step");
    setError("");
    setOtp(["", "", "", "", "", ""]);
    setNewPassword("");
    setConfirmPassword("");
  };

  // ── Manejar cambio en inputs OTP de 6 dígitos ────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    setError("");
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus secuencial
    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    setError("");
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const targetIdx = Math.min(pasted.length, 5);
    document.getElementById(`otp-input-${targetIdx}`)?.focus();
  };

  // ── Validar OTP y Actualizar Contraseña (Paso 2) ─────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Garantizar obtención del email desde estado o almacenamiento de sesión / local / URL
    const targetEmail = (email || getStoredEmail()).trim().toLowerCase();

    if (!targetEmail) {
      setError("No se identificó el correo electrónico para la recuperación. Por favor regresa al paso 1.");
      setStep("email");
      return;
    }

    const code = otp.join("").trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError("Por favor ingresa los 6 dígitos numéricos del código de seguridad.");
      return;
    }

    if (newPassword.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!hasLetter || !hasNumber) {
      setError("La nueva contraseña debe incluir al menos una letra y un número.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsLoading(true);
    try {
      await api.resetPassword({
        email: targetEmail,
        otp: code,
        code,
        new_password: newPassword,
        newPassword,
        confirm_password: confirmPassword,
        confirmPassword,
      });

      // Limpiar almacenamiento temporal tras éxito
      sessionStorage.removeItem("reset_email");
      sessionStorage.removeItem("recover_email");
      sessionStorage.removeItem("resetEmail");
      sessionStorage.removeItem("recover_step");
      localStorage.removeItem("reset_email");
      localStorage.removeItem("recover_email");
      localStorage.removeItem("resetEmail");
      localStorage.removeItem("recover_step");

      toast.success("¡Contraseña restablecida con éxito! Redirigiendo al inicio de sesión...", "Éxito");
      setStep("success");

      // Redirigir a /login tras 1.5 segundos
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.detail ||
        err?.error ||
        err?.message ||
        "No se pudo restablecer la contraseña. Verifica el código e intenta de nuevo.";
      setError(msg);
      toast.error(msg, "Error al restablecer contraseña");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reenviar OTP ────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");

    const targetEmail = (email || getStoredEmail()).trim().toLowerCase();

    if (!targetEmail) {
      setError("No se encontró el correo registrado. Regresa al paso 1.");
      setStep("email");
      return;
    }

    try {
      await api.resendLoginOTP(targetEmail);
      toast.success("Nuevo código enviado a tu correo.", "Código reenviado");
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.detail ||
        err?.error ||
        err?.message ||
        "Error al reenviar el código. Intenta de nuevo.";
      setError(msg);
    }
  };

  const activeEmail = email || getStoredEmail();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 grid lg:grid-cols-12 relative">
      {/* ── Panel Izquierdo (Formulario - 5 cols) ── */}
      <div className="lg:col-span-5 min-h-screen flex flex-col justify-center p-8 sm:p-12 lg:p-16 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800">
        <div className="w-full max-w-sm mx-auto space-y-6">
          {/* Botón Volver */}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
            <span>Volver al inicio de sesión</span>
          </button>

          {/* Logo y Encabezado */}
          <div className="flex items-center gap-3.5 logo-container">
            <img
              src="/logo-sena.png"
              alt="Logo SENA"
              className="h-10 w-auto object-contain"
            />
            <div className="h-7 w-[1px] bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <img
                src="/worklex.png"
                alt="WorkLex SENA"
                className="w-9 h-9 rounded-full object-contain border border-slate-200 dark:border-slate-700 shadow-2xs"
              />
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">WorkLex</span>
            </div>
          </div>

          {/* Banner de error centralizado y limpio */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl mb-5 text-rose-800 text-xs font-medium leading-relaxed"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
              <p className="leading-snug">{error}</p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ── PASO 1: Ingreso de correo ── */}
            {step === "email" && (
              <motion.div
                key="step-email"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
              >
                <div className="mb-5">
                  <h2 className="text-xl font-extrabold text-foreground tracking-tight mb-1">
                    ¿Olvidaste tu contraseña?
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Ingresa tu correo institucional registrado para enviarte un código de seguridad y verificar tu identidad.
                  </p>
                </div>

                <form onSubmit={handleSendRecovery} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Correo Electrónico Registrado *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        placeholder="tu@correo.com"
                        className="h-11 w-full pl-10 pr-3.5 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full h-11 bg-[#39A900] hover:bg-[#2e8600] text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-sm mt-2"
                  >
                    {isLoading ? (
                      <span>Validando correo...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" strokeWidth={1.8} />
                        <span>Continuar y Recibir Código</span>
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── PASO 2: Verificación OTP y Nueva Contraseña ── */}
            {step === "otp" && (
              <motion.div
                key="step-otp"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
              >
                <div className="mb-5 text-center">
                  <div className="w-12 h-12 bg-emerald-50 text-[#39A900] rounded-xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                    <KeyRound className="w-6 h-6" strokeWidth={1.8} />
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
                    Código de Seguridad y Nueva Contraseña
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Hemos enviado un código de 6 dígitos a{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{activeEmail}</span>.
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      className="ml-2 text-[#39A900] hover:underline font-semibold text-xs cursor-pointer inline-block"
                    >
                      Cambiar correo
                    </button>
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* OTP de 6 dígitos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 text-left">
                        Código OTP de 6 dígitos *
                      </label>
                      <span className="text-[11px] text-slate-400">
                        {otp.filter(Boolean).length}/6 dígitos
                      </span>
                    </div>
                    <div className="flex justify-between gap-1.5 sm:gap-2">
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-input-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className={`w-10 sm:w-11 h-12 sm:h-13 text-center text-lg sm:text-xl font-bold font-mono border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] transition-all ${
                            digit ? "border-[#39A900]" : "border-slate-300 dark:border-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Nueva Contraseña */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left">
                      Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setError("");
                        }}
                        placeholder="Mínimo 8 caracteres (letras y números)"
                        className="h-11 w-full pl-10 pr-10 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Requisitos visuales de contraseña */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                          isPassLengthValid ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Check className={`w-3 h-3 ${isPassLengthValid ? "opacity-100" : "opacity-40"}`} />
                        Mínimo 8 caracteres
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium transition-colors ${
                          hasLetter && hasNumber ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Check className={`w-3 h-3 ${hasLetter && hasNumber ? "opacity-100" : "opacity-40"}`} />
                        Letras y números
                      </span>
                    </div>
                  </div>

                  {/* Confirmar Nueva Contraseña */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-left">
                      Confirmar Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setError("");
                        }}
                        placeholder="Repite la nueva contraseña"
                        className={`h-11 w-full pl-10 pr-10 text-sm border rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] transition-all ${
                          showMismatchError
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                            : "border-slate-300 dark:border-slate-700"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Alerta de discrepancia de contraseñas */}
                    {showMismatchError && (
                      <p className="text-[11px] text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Las contraseñas no coinciden</span>
                      </p>
                    )}
                    {passwordsMatch && (
                      <p className="text-[11px] text-emerald-600 font-medium mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Las contraseñas coinciden correctamente</span>
                      </p>
                    )}
                  </div>

                  {/* Botón Restablecer Contraseña */}
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full h-11 bg-[#39A900] hover:bg-[#2e8600] text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-sm mt-3"
                  >
                    {isLoading ? (
                      <span>Restableciendo contraseña...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />
                        <span>Restablecer Contraseña e Iniciar Sesión</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2 mt-5 text-xs text-slate-500 dark:text-slate-400">
                  <span>¿No recibiste el código?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="text-[#39A900] font-semibold hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${resendCooldown > 0 ? "animate-spin" : ""}`} strokeWidth={1.8} />
                    <span>{resendCooldown > 0 ? `Reenviar en ${resendCooldown}s` : "Reenviar código"}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── PASO 3: Éxito ── */}
            {step === "success" && (
              <motion.div
                key="step-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4 space-y-4"
              >
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">¡Contraseña Actualizada!</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Tu contraseña institucional ha sido actualizada correctamente en el sistema. Ya puedes iniciar sesión con tus nuevas credenciales.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full h-11 bg-[#39A900] hover:bg-[#2e8600] text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow cursor-pointer text-sm"
                >
                  Iniciar Sesión Ahora
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Panel Derecho (Hero Institucional - 7 cols) ── */}
      <div className="hidden lg:block lg:col-span-7 relative bg-slate-900 overflow-hidden min-h-screen">
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
    </div>
  );
}

export default ResetPasswordPage;
