import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import * as api from "../services/api";
import { useToast } from "../components/Toast";

export function RecoverAccountPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<"email" | "otp" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Manejar envío de correo de recuperación ──────────────────────────────
  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Por favor ingresa tu correo electrónico.");
      toast.warning("Debes ingresar un correo electrónico.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Validar si el correo existe en la base de datos
      const checkRes = await api.checkEmail(cleanEmail);
      if (!checkRes.exists) {
        setError("Este correo no se encuentra registrado en Worklex SENA.");
        toast.error("El correo institucional ingresado no existe en nuestro sistema.");
        return;
      }

      // 2. Despachar OTP
      await api.resendLoginOTP(cleanEmail);
      toast.success("Código de recuperación enviado a tu correo.", "Correo enviado");
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
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Manejar cambio en inputs OTP de 6 dígitos ────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
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

  // ── Validar OTP de recuperación ─────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length < 6) {
      setError("Por favor ingresa los 6 dígitos del código.");
      toast.warning("Debes completar los 6 dígitos del código de verificación.");
      return;
    }

    setIsLoading(true);
    try {
      await api.verifyLoginOTP({ email, code });
      toast.success("Identidad verificada exitosamente. Tu cuenta está segura.", "Verificación Exitosa");
      setStep("success");
    } catch (err: any) {
      const msg = err?.message || "Código incorrecto o expirado. Solicita un nuevo código.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reenviar OTP ────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.resendLoginOTP(email);
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
    } catch {
      toast.error("Error al reenviar el código. Intenta de nuevo.");
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

          {/* Banner de error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl mb-5 text-rose-800 text-xs font-medium"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" strokeWidth={1.8} />
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
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full pl-10 pr-4 py-3 text-sm border border-input rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
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

            {/* ── PASO 2: Verificación OTP ── */}
            {step === "otp" && (
              <motion.div
                key="step-otp"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
              >
                <div className="mb-5 text-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                    <KeyRound className="w-6 h-6" strokeWidth={1.8} />
                  </div>
                  <h2 className="text-xl font-extrabold text-foreground tracking-tight mb-1">
                    Verificación de Seguridad
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Hemos enviado un código seguro de 6 dígitos a <span className="font-bold text-foreground">{email}</span>. Ingrésalo a continuación:
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="flex justify-between gap-2 onPaste={handleOtpPaste}">
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
                        className="w-12 h-14 text-center text-xl font-bold font-mono border border-input rounded-xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || otp.join("").length < 6}
                    className="w-full bg-sena-green hover:bg-sena-green/90 text-white py-3.5 rounded-xl font-bold transition-all shadow-md shadow-sena-green/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-sm"
                  >
                    {isLoading ? (
                      <span>Verificando...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />
                        <span>Validar Código</span>
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
                <h3 className="text-xl font-extrabold text-foreground mb-2">¡Acceso Verificado!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                  Tu identidad como usuario de WorkLex SENA ha sido confirmada con éxito. Ya puedes ingresar a tu entorno institucional.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-bold transition-all shadow-md cursor-pointer text-sm"
                >
                  Ir al Inicio de Sesión
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
