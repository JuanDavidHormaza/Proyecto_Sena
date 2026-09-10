// =======================================================================
// RegisterPage.tsx
// Registro en 3 pasos: datos personales → contraseña/términos → OTP.
// Rediseño visual (radios grandes, sombras suaves, íconos circulares,
// indicador de pasos en pills) — la lógica de registro no se modifica.
// =======================================================================

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Eye, EyeOff, ArrowLeft, User, Mail, Lock,
  MapPin, BookOpen, Check, CreditCard, Phone, AlertCircle,
  KeyRound, RefreshCw,
} from "lucide-react";
import { senaPrograms } from "../data/users";
import { useAuth } from "../context/AuthContext";
import { BrandLogo } from "../components/BrandLogo";
import { IconBadge } from "../components/ui/icon-badge";
import * as api from "../services/api";

type Step = 1 | 2 | 3;

export function RegisterPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [showPassword, setShowPassword]             = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading]                   = useState(false);
  const [step, setStep]                             = useState<Step>(1);
  const [error, setError]                           = useState("");

  // Datos del formulario
  const [formData, setFormData] = useState({
    firstName:       "",
    lastName:        "",
    email:           "",
    docType:         "",
    docNum:          "",
    phoneNum:        "",
    country:         "",
    program:         "",
    password:        "",
    confirmPassword: "",
    acceptTerms:     false,
  });

  // Paso 3 – OTP
  const [otp, setOtp]                     = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Paso 1 → 2: solo validación local ────────────────────────────────
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.email ||
        !formData.docType   || !formData.docNum || !formData.program) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }
    setError("");
    setStep(2);
  };

  // ── Paso 2 → 3: enviar datos al backend, verificar dominio y enviar OTP ──
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (!formData.acceptTerms) {
      setError("Debes aceptar los términos y condiciones.");
      return;
    }

    setIsLoading(true);
    try {
      await api.registerSendOTP({
        email:      formData.email,
        password:   formData.password,
        doc_type:   formData.docType,
        doc_num:    formData.docNum,
        first_name: formData.firstName,
        last_name:  formData.lastName,
        program:    formData.program,
        phone_num:  formData.phoneNum
          ? parseInt(formData.phoneNum.replace(/\D/g, ""))
          : undefined
      });
      setStep(3);
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar el código. Verifica tu correo.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Paso 3: verificar OTP y crear cuenta ─────────────────────────────
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await api.registerVerifyOTP(formData.email, otp);
      localStorage.setItem("accessToken", response.access);
      localStorage.setItem("refreshToken", response.refresh);
      updateUser(response.user);
      navigate("/dashboard");


    } catch (err: any) {
      setError(err?.message || "Código incorrecto o expirado.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reenviar OTP ──────────────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.registerSendOTP({
        email:      formData.email,
        password:   formData.password,
        doc_type:   formData.docType,
        doc_num:    formData.docNum,
        first_name: formData.firstName,
        last_name:  formData.lastName,
        program:    formData.program,
        phone_num:  formData.phoneNum
          ? parseInt(formData.phoneNum.replace(/\D/g, ""))
          : undefined,
      });
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

  // Países con su indicativo telefónico internacional.
  const countries = [
    { name: "Colombia", dial: "+57", flag: "🇨🇴" },
    { name: "Mexico", dial: "+52", flag: "🇲🇽" },
    { name: "Argentina", dial: "+54", flag: "🇦🇷" },
    { name: "Chile", dial: "+56", flag: "🇨🇱" },
    { name: "Peru", dial: "+51", flag: "🇵🇪" },
    { name: "Ecuador", dial: "+593", flag: "🇪🇨" },
    { name: "Venezuela", dial: "+58", flag: "🇻🇪" },
    { name: "Bolivia", dial: "+591", flag: "🇧🇴" },
    { name: "Paraguay", dial: "+595", flag: "🇵🇾" },
    { name: "Uruguay", dial: "+598", flag: "🇺🇾" },
    { name: "Panama", dial: "+507", flag: "🇵🇦" },
    { name: "Costa Rica", dial: "+506", flag: "🇨🇷" },
    { name: "Estados Unidos", dial: "+1", flag: "🇺🇸" },
    { name: "España", dial: "+34", flag: "🇪🇸" },
    { name: "Brasil", dial: "+55", flag: "🇧🇷" },
  ];

  // Al elegir país, prellena el indicativo en el teléfono si está vacío.
  const handleCountryChange = (name: string) => {
    const selected = countries.find((c) => c.name === name);
    setFormData((prev) => {
      const onlyDial = /^\+\d{1,4}\s*$/.test(prev.phoneNum.trim());
      const shouldPrefill = !prev.phoneNum.trim() || onlyDial;
      return {
        ...prev,
        country: name,
        phoneNum: shouldPrefill && selected ? `${selected.dial} ` : prev.phoneNum,
      };
    });
  };

  const documentTypes = [
    { value: "CC",  label: "Cédula de Ciudadanía" },
    { value: "TI",  label: "Tarjeta de Identidad" },
    { value: "CE",  label: "Cédula de Extranjería" },
    { value: "PS",  label: "Pasaporte" },
    { value: "OT",  label: "Otro" },
  ];

  const inputClass =
    "w-full pl-12 pr-4 py-3 bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-green/40 focus:border-sena-green transition-all";

  return (
    <div className="min-h-screen bg-background flex">

      {/* ── Panel lateral decorativo ── */}
      <div
        className="hidden lg:flex flex-1 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/PersonaSena.png')" }}
      >
        <div className="absolute inset-0 bg-black/15" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative z-10 flex flex-col items-center justify-center w-full p-12"
        >
          <div className="flex justify-center mb-8">
            <BrandLogo height="h-24" boxed />
          </div>

          <h3 className="text-3xl font-bold mb-4 text-balance text-white mt-8">
            Unete a la comunidad SENA
          </h3>
          <p className="text-white/80 text-lg leading-relaxed mb-8 text-center max-w-md">
            Crea tu cuenta y comienza a evaluar tu nivel de ingles con herramientas interactivas y retroalimentacion personalizada.
          </p>
            <div className="space-y-4 text-left">
              {[
                "Retroalimentación de docentes",
                "Certificado de nivel oficial",
                "Seguimiento de progreso",
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-white/90">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

      {/* ── Formulario ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md my-8"
        >
          {/* Botón volver */}
          <button
            onClick={() =>
              step === 1 ? navigate("/") : step === 2 ? setStep(1) : setStep(2)
            }
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            {step === 1 ? "Volver al inicio" : "Atrás"}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <BrandLogo height="h-14" />
            <div>
              <h1 className="text-xl font-semibold text-foreground">English Level Test</h1>
              <p className="text-sm text-muted-foreground">Plataforma SENA</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-2">Crear cuenta</h2>
          <p className="text-muted-foreground mb-4">Regístrate para comenzar tu evaluación</p>

          {/* Error global */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          {/* ── Indicador de pasos ── */}
          <div className="flex items-center gap-2 mb-6">
            {[
              { n: 1, label: "Datos" },
              { n: 2, label: "Contraseña" },
              { n: 3, label: "Verificar" },
            ].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  step === n
                    ? "bg-sena-green text-white"
                    : step > n
                    ? "bg-sena-green/10 text-sena-green"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">
                    {step > n ? <Check className="w-3 h-3" /> : n}
                  </span>
                  {label}
                </div>
                {i < 2 && <div className="w-6 h-0.5 bg-border" />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ════════════════════════════════════════════════
                PASO 1 – Datos personales
            ════════════════════════════════════════════════ */}
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleNextStep}
                className="space-y-4"
              >
                {/* Nombre y apellido */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nombres *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input type="text" placeholder="Juan David" required value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Apellidos *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input type="text" placeholder="Pérez García" required value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className={inputClass} />
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Correo Electrónico *</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="email" placeholder="tu@correo.com" required value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={inputClass} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recibirás un código de verificación en este correo.
                  </p>
                </div>

                {/* Tipo y número de documento */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Tipo Documento *</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <select required value={formData.docType}
                        onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                        className={`${inputClass} appearance-none cursor-pointer`}>
                        <option value="">Seleccionar</option>
                        {documentTypes.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Número Documento *</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <input type="text" placeholder="1234567890" required value={formData.docNum}
                        onChange={(e) => setFormData({ ...formData, docNum: e.target.value })}
                        className={inputClass} />
                    </div>
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type="tel" placeholder="+57 300 123 4567" value={formData.phoneNum}
                      onChange={(e) => setFormData({ ...formData, phoneNum: e.target.value })}
                      className={inputClass} />
                  </div>
                </div>

                {/* País y programa */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">País</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <select value={formData.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className={`${inputClass} appearance-none cursor-pointer`}>
                        <option value="">Seleccionar</option>
                        {countries.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.flag} {c.name} ({c.dial})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Programa SENA *</label>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <select required value={formData.program}
                        onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                        className={`${inputClass} appearance-none cursor-pointer`}>
                        <option value="">Seleccionar</option>
                        {senaPrograms.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <button type="submit"
                  className="w-full bg-sena-green text-white py-4 rounded-full font-semibold hover:bg-sena-green-dark transition-all shadow-brand">
                  Continuar
                </button>

                <p className="text-center text-muted-foreground">
                  ¿Ya tienes cuenta?{" "}
                  <button type="button" onClick={() => navigate("/login")}
                    className="text-sena-green font-medium hover:underline">
                    Iniciar sesión
                  </button>
                </p>
              </motion.form>
            )}

            {/* ════════════════════════════════════════════════
                PASO 2 – Contraseña + aceptar términos
            ════════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleSendOTP}
                className="space-y-4"
              >
                {/* Resumen del usuario */}
                <div className="bg-sena-green/5 border border-sena-green/20 rounded-2xl p-4 mb-2">
                  <p className="text-sm text-muted-foreground mb-1">Registrando como:</p>
                  <p className="font-semibold text-foreground">{formData.firstName} {formData.lastName}</p>
                  <p className="text-sm text-muted-foreground">{formData.email}</p>
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type={showPassword ? "text" : "password"} required minLength={6}
                      placeholder="Mínimo 6 caracteres" value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-12 pr-12 py-3.5 bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-green/40 focus:border-sena-green transition-all" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Confirmar Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input type={showConfirmPassword ? "text" : "password"} required
                      placeholder="Repite tu contraseña" value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pl-12 pr-12 py-3.5 bg-muted/40 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-green/40 focus:border-sena-green transition-all" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Términos */}
                <div className="flex items-start gap-3 py-2">
                  <input id="terms" type="checkbox" required checked={formData.acceptTerms}
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-border text-sena-green focus:ring-sena-green/40 cursor-pointer" />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    Acepto los{" "}
                    <span className="text-sena-green hover:underline">términos y condiciones</span>
                    {" "}y la{" "}
                    <span className="text-sena-green hover:underline">política de privacidad</span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex-1 bg-muted text-muted-foreground py-4 rounded-full font-semibold hover:bg-muted/80 transition-all">
                    Atrás
                  </button>
                  <button type="submit" disabled={isLoading}
                    className="flex-1 bg-sena-green text-white py-4 rounded-full font-semibold hover:bg-sena-green-dark transition-all shadow-brand disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isLoading
                      ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : "Enviar código de verificación"
                    }
                  </button>
                </div>
              </motion.form>
            )}

            {/* ════════════════════════════════════════════════
                PASO 3 – Verificar correo con OTP
            ════════════════════════════════════════════════ */}
            {step === 3 && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOTP}
                className="space-y-4"
              >
                <div className="flex justify-center mb-4">
                  <IconBadge tone="blue-soft" size="xl">
                    <KeyRound size={28} />
                  </IconBadge>
                </div>

                <p className="text-center text-muted-foreground">
                  Enviamos un código de 6 dígitos a
                </p>
                <p className="text-center font-semibold text-foreground">{formData.email}</p>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2 text-center">
                    Código de verificación
                  </label>
                  <input
                    type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                    required autoFocus value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full text-center text-3xl tracking-[0.5em] py-4 border border-input rounded-2xl bg-muted/40 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-sena-green/40 focus:border-sena-green transition-all font-mono"
                  />
                </div>

                <button type="submit" disabled={isLoading || otp.length < 6}
                  className="w-full bg-sena-green text-white py-4 rounded-full font-semibold hover:bg-sena-green-dark transition-all shadow-brand disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isLoading
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : "Crear mi cuenta"
                  }
                </button>

                <div className="flex items-center justify-center gap-2 pt-2">
                  <p className="text-sm text-muted-foreground">¿No llegó el código?</p>
                  <button type="button" onClick={handleResendOTP} disabled={resendCooldown > 0}
                    className="flex items-center gap-1 text-sm text-sena-blue font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                    <RefreshCw className="w-3.5 h-3.5" />
                    {resendCooldown > 0 ? `Reenviar (${resendCooldown}s)` : "Reenviar código"}
                  </button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  El código expira en 10 minutos.
                </p>
              </motion.form>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
