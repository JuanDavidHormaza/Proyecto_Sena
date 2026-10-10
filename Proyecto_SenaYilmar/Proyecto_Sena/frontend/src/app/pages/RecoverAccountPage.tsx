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
} from "lucide-react";
import * as api from "../services/api";
import { useToast } from "../components/Toast";
import { validateEmail } from "../utils/validation";

export function RecoverAccountPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  // Retención persistente de estado entre pasos y recargas
  const [step, setStep] = useState<"email" | "otp" | "success">(() => {
    const savedStep = sessionStorage.getItem("recover_step") || localStorage.getItem("recover_step");
    const savedEmail =
      sessionStorage.getItem("recover_email") ||
      sessionStorage.getItem("resetEmail") ||
      localStorage.getItem("recover_email") ||
      localStorage.getItem("resetEmail");
    if (savedStep === "otp" && savedEmail) {
      return "otp";
    }
    return "email";
  });

  const [email, setEmail] = useState<string>(() => {
    return (
      searchParams.get("email") ||
      sessionStorage.getItem("recover_email") ||
      sessionStorage.getItem("resetEmail") ||
      localStorage.getItem("recover_email") ||
      localStorage.getItem("resetEmail") ||
      ""
    );
  });

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Sincronizar si cambia el parámetro en URL
  useEffect(() => {
    const urlEmail = searchParams.get("email");
    if (urlEmail && !email) {
      const clean = urlEmail.trim().toLowerCase();
      setEmail(clean);
      sessionStorage.setItem("recover_email", clean);
      sessionStorage.setItem("resetEmail", clean);
      localStorage.setItem("recover_email", clean);
      localStorage.setItem("resetEmail", clean);
    }
  }, [searchParams]);

  // Validaciones en tiempo real para contraseña
  const isOtpComplete = otp.every((digit) => digit.trim().length === 1);
  const isPassLengthValid = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const isPassSecure = isPassLengthValid && hasLetter && hasNumber;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isConfirmTouched = confirmPassword.length > 0;
  const showMismatchError = isConfirmTouched && !passwordsMatch;

  const canSubmit = isOtpComplete && isPassSecure && passwordsMatch && !isLoading;

  // ── Manejar envío de correo de recuperación (Paso 1) ──────────────────────
  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
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

      // Persistir correo en memoria de sesión y almacenamiento local para garantizar retención
      sessionStorage.setItem("recover_email", cleanEmail);
      sessionStorage.setItem("resetEmail", cleanEmail);
      sessionStorage.setItem("recover_step", "otp");
      localStorage.setItem("recover_email", cleanEmail);
      localStorage.setItem("resetEmail", cleanEmail);
      localStorage.setItem("recover_step", "otp");
      setEmail(cleanEmail);
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
      const msg = err?.message || "No se pudo procesar la solicitud en este momento.";
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

    // Garantizar obtención del email desde estado o almacenamiento de sesión / local
    const targetEmail = (
      email ||
      sessionStorage.getItem("recover_email") ||
      sessionStorage.getItem("resetEmail") ||
      localStorage.getItem("recover_email") ||
      localStorage.getItem("resetEmail") ||
      searchParams.get("email") ||
      ""
    ).trim().toLowerCase();

    if (!targetEmail) {
      setError("No se identificó el correo electrónico para la recuperación. Por favor regresa al paso 1.");
      setStep("email");
      return;
    }

    const code = otp.join("").trim();
    if (code.length < 6) {
      setError("Por favor ingresa los 6 dígitos del código de seguridad.");
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
        code,
        new_password: newPassword,
        newPassword: newPassword,
        confirm_password: confirmPassword,
        confirmPassword: confirmPassword,
      });

      toast.success("Tu contraseña ha sido actualizada con éxito.", "Contraseña Restablecida");
      sessionStorage.removeItem("recover_email");
      sessionStorage.removeItem("resetEmail");
      sessionStorage.removeItem("recover_step");
      localStorage.removeItem("recover_email");
      localStorage.removeItem("resetEmail");
      localStorage.removeItem("recover_step");
      setStep("success");
    } catch (err: any) {
      const msg = err?.message || "No se pudo actualizar la contraseña. Verifica el código e intenta de nuevo.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reenviar OTP ────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");

    const targetEmail = (
      email ||
      sessionStorage.getItem("recover_email") ||
      sessionStorage.getItem("resetEmail") ||
      searchParams.get("email") ||
      ""
    ).trim().toLowerCase();

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
      const msg = err?.message || "Error al reenviar el código. Intenta de nuevo.";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 sm:p-6 relative">
      <div className="w-full max-w-md">
        {/* Botón Volver */}
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
          <span>Volver al inicio de sesión</span>
        </button>

        {/* Card Principal */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-border shadow-xl text-left"
        >
          {/* Logo y Encabezado */}
          <div className="flex items-center gap-3.5 mb-6">
            <img
              src="/worklex.png"
              alt="WorkLex SENA"
              className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500/30 shadow-md flex-shrink-0"
            />
            <div>
              <h1 className="text-lg font-bold text-foreground">Recuperar Cuenta</h1>
              <p className="text-xs text-muted-foreground font-medium">WorkLex SENA</p>
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
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Correo Electrónico Registrado *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
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
                        className="w-full pl-10 pr-4 py-3 text-sm border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full bg-sena-green hover:bg-sena-green/90 text-white py-3.5 rounded-xl font-bold transition-all shadow-md shadow-sena-green/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-sm mt-2"
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
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100 shadow-xs">
                    <KeyRound className="w-6 h-6" strokeWidth={1.8} />
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground tracking-tight mb-1">
                    Código de Seguridad y Nueva Contraseña
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Hemos enviado un código de 6 dígitos a{" "}
                    <span className="font-bold text-foreground">{email}</span>.
                    <button
                      type="button"
                      onClick={handleBackToEmail}
                      className="ml-2 text-emerald-700 hover:text-emerald-800 font-semibold underline text-xs cursor-pointer inline-block"
                    >
                      Cambiar correo
                    </button>
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  {/* OTP de 6 dígitos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-foreground text-left">
                        Código OTP de 6 dígitos *
                      </label>
                      <span className="text-[11px] text-muted-foreground">
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
                          className={`w-10 sm:w-12 h-12 sm:h-14 text-center text-lg sm:text-xl font-bold font-mono border rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all ${
                            digit ? "border-emerald-500 bg-emerald-50/20" : "border-input"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Nueva Contraseña */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5 text-left">
                      Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
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
                        className={`w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all ${
                          isPassSecure ? "border-emerald-500/80" : "border-input"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
                    <label className="block text-xs font-semibold text-foreground mb-1.5 text-left">
                      Confirmar Nueva Contraseña *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
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
                        className={`w-full pl-10 pr-10 py-2.5 sm:py-3 text-sm border rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all ${
                          showMismatchError
                            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-200"
                            : passwordsMatch
                            ? "border-emerald-500/80"
                            : "border-input"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
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
                    className="w-full bg-sena-green hover:bg-sena-green/90 text-white py-3.5 rounded-xl font-bold transition-all shadow-md shadow-sena-green/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-sm mt-3"
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

                <div className="flex items-center justify-center gap-2 mt-5 text-xs text-muted-foreground">
                  <span>¿No recibiste el código?</span>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0}
                    className="text-emerald-700 font-bold hover:underline disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
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
                className="text-center py-4"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-9 h-9" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-extrabold text-foreground mb-2">¡Contraseña Actualizada!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                  Tu contraseña institucional ha sido actualizada correctamente en el sistema. Ya puedes iniciar sesión con tus nuevas credenciales.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full bg-sena-green hover:bg-sena-green/90 text-white py-3.5 rounded-xl font-bold transition-all shadow-md cursor-pointer text-sm"
                >
                  Iniciar Sesión Ahora
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default RecoverAccountPage;
