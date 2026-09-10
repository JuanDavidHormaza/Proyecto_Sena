// =======================================================================
// LoginPage.tsx
// Flujo MFA de 2 pasos: credenciales → código OTP por correo.
// Rediseño visual (radios grandes, sombras suaves, íconos circulares)
// — la lógica de autenticación no se modifica.
// =======================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, Mail, Lock, ArrowLeft, AlertCircle, KeyRound, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { BrandLogo } from "../components/BrandLogo";
import { IconBadge } from "../components/ui/icon-badge";
import * as api from "../services/api";

type Step = "credentials" | "otp";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Step 1 – credentials
  const [step, setStep] = useState<Step>("credentials");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  // Step 2 – OTP
  const [otpEmail, setOtpEmail] = useState(""); // email del paso 1
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Paso 1: enviar credenciales ──────────────────────────────────────
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      // POST /auth/login/
      //  - Estudiante  → { mfa_required: true, email }  → pide OTP
      //  - Docente/Admin/SuperAdmin → { mfa_required: false, access, ... } → entra directo
      const res = await api.requestLogin(formData.email, formData.password);
      if (res.mfa_required) {
        setOtpEmail(res.email || formData.email);
        setStep("otp");
      } else {
        // Login directo sin verificación por correo (roles privilegiados)
        await login({ prefetched: res });
        redirectByRole();
      }
    } catch (err: any) {
      setError(err?.message || "Credenciales incorrectas o cuenta inactiva.");
    } finally {
      setIsLoading(false);
    }
  };

  // Redirige al panel según el rol guardado tras iniciar sesión.
  const redirectByRole = () => {
    const userRole = localStorage.getItem("userRole");
    if (userRole === "admin" || userRole === "superadmin") {
      navigate("/admin");
    } else if (userRole === "teacher" || userRole === "instructor") {
      navigate("/teacher");
    } else {
      navigate("/dashboard");
    }
  };

  // ── Paso 2: verificar OTP ────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      // POST /auth/verify-otp/ → { access, refresh, user }
      await login({ otp_email: otpEmail, otp_code: otp, email: otpEmail });
      redirectByRole();
    } catch (err: any) {
      setError(err?.message || "Código incorrecto o expirado.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reenviar OTP ─────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.resendLoginOTP(otpEmail);

      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setError("No se pudo reenviar el código. Intenta de nuevo.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Formulario ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <button
            onClick={() => step === "otp" ? setStep("credentials") : navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === "otp" ? "Volver al inicio de sesión" : "Volver al inicio"}
          </button>

          <div className="mb-8">
            <BrandLogo height="h-20" />
          </div>

          <AnimatePresence mode="wait">
            {/* ── PASO 1: Credenciales ── */}
            {step === "credentials" && (
              <motion.div key="credentials" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <h2 className="text-3xl font-bold text-foreground mb-2">Bienvenido de nuevo</h2>
                <p className="text-muted-foreground mb-8">Ingresa tus credenciales para continuar</p>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl mb-6">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleCredentials} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Correo electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email" required value={formData.email} autoComplete="email"
                        onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                        placeholder="tu@correo.com"
                        className="w-full pl-11 pr-4 py-3.5 border border-input rounded-2xl bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/40 focus:border-sena-green transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"} required value={formData.password} autoComplete="current-password"
                        onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3.5 border border-input rounded-2xl bg-muted/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sena-green/40 focus:border-sena-green transition-all"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading}
                    className="w-full bg-sena-green text-white py-3.5 rounded-full font-semibold hover:bg-sena-green-dark transition-all shadow-brand disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? "Verificando..." : "Continuar"}
                  </button>
                </form>

                <p className="text-center text-sm text-muted-foreground mt-6">
                  ¿No tienes cuenta?{" "}
                  <button onClick={() => navigate("/register")} className="text-sena-green font-medium hover:underline">
                    Regístrate
                  </button>
                </p>
              </motion.div>
            )}

            {/* ── PASO 2: OTP ── */}
            {step === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex justify-center mb-6">
                  <IconBadge tone="blue-soft" size="xl">
                    <KeyRound size={28} />
                  </IconBadge>
                </div>

                <h2 className="text-3xl font-bold text-foreground mb-2 text-center">Verifica tu correo</h2>
                <p className="text-muted-foreground mb-2 text-center">
                  Enviamos un código de 6 dígitos a
                </p>
                <p className="text-center font-semibold text-foreground mb-8">{otpEmail}</p>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl mb-6">
                    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Código de verificación</label>
                    <input
                      type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                      required autoFocus value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full text-center text-3xl tracking-[0.5em] py-4 border border-input rounded-2xl bg-muted/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-sena-green/40 focus:border-sena-green transition-all font-mono"
                    />
                  </div>

                  <button type="submit" disabled={isLoading || otp.length < 6}
                    className="w-full bg-sena-green text-white py-3.5 rounded-full font-semibold hover:bg-sena-green-dark transition-all shadow-brand disabled:opacity-50 disabled:cursor-not-allowed">
                    {isLoading ? "Verificando..." : "Ingresar"}
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2 mt-6">
                  <p className="text-sm text-muted-foreground">¿No llegó el código?</p>
                  <button
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0}
                    className="flex items-center gap-1 text-sm text-sena-blue font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : "Reenviar código"}
                  </button>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-3">
                  El código expira en 10 minutos.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Panel lateral decorativo ── */}
      <div
        className="hidden lg:flex flex-1 relative items-center justify-center p-12 bg-cover bg-center"
        style={{ backgroundImage: "url('/GenteSena.jpg')" }}
      >
        <div className="absolute inset-0 gradient-brand-deep opacity-90" />
        <div className="absolute inset-0 bg-slate-950/30" />
        <div className="relative z-10 text-white text-center max-w-sm">
          <div className="flex justify-center mb-8">
            <BrandLogo height="h-24" boxed />
          </div>
          <h3 className="text-3xl font-bold mb-4">
            Aprende inglés técnico, <span className="text-worklex-yellow">consigue empleo</span>
          </h3>
          <p className="text-white/85 text-lg leading-relaxed">
            Tu plataforma de evaluación de inglés técnico. Mide tu nivel según el Marco Común Europeo de Referencia (MCER).
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-worklex-blue" />
            <span className="h-2.5 w-2.5 rounded-full bg-sena-green" />
            <span className="h-2.5 w-2.5 rounded-full bg-worklex-orange" />
          </div>
        </div>
      </div>
    </div>
  );
}
