import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, GraduationCap, ArrowLeft, User, Mail, Lock, MapPin, BookOpen, Check, CreditCard, Phone, AlertCircle } from "lucide-react";
import { senaPrograms } from "../data/users";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1); // Wizard de registro en 2 pasos
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    // Datos personales (PERSONS)
    firstName: "",
    lastName: "",
    email: "",
    docType: "",
    docNum: "",
    phoneNum: "",
    country: "",
    program: "",
    // Credenciales
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (formData.password !== formData.confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }
    if (!formData.acceptTerms) {
      setError("Debes aceptar los terminos y condiciones");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Intentar registro con API
      await register({
        email: formData.email,
        password: formData.password,
        doc_type: formData.docType,
        doc_num: formData.docNum,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_num: formData.phoneNum ? parseInt(formData.phoneNum.replace(/\D/g, '')) : undefined,
      });
      
      navigate("/dashboard");
    } catch (err: any) {
      console.log("API register failed:", err);
      setError(err?.message || "No se pudo crear la cuenta en la base de datos.");
    }
    
    setIsLoading(false);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    // Validar campos del paso 1
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.docType || !formData.docNum) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }
    setStep(2);
  };

  const countries = [
    "Colombia", "Mexico", "Argentina", "Chile", "Peru", 
    "Ecuador", "Venezuela", "Bolivia", "Paraguay", "Uruguay"
  ];

  const documentTypes = [
    { value: "CC", label: "Cedula de Ciudadania" },
    { value: "TI", label: "Tarjeta de Identidad" },
    { value: "CE", label: "Cedula de Extranjeria" },
    { value: "PP", label: "Pasaporte" },
    { value: "NIT", label: "NIT" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-sena-blue via-sena-blue-light to-sena-green relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOSAxLjc5MS00IDQtNHM0IDEuNzkxIDQgNC0xLjc5MSA0LTQgNC00LTEuNzkxLTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center max-w-md"
          >
            <div className="w-24 h-24 bg-white/10 backdrop-blur-lg rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
              <GraduationCap className="w-12 h-12" />
            </div>
            <h3 className="text-3xl font-bold mb-4 text-balance">
              Unete a la comunidad SENA
            </h3>
            <p className="text-white/80 text-lg leading-relaxed mb-8">
              Crea tu cuenta y comienza a evaluar tu nivel de ingles con herramientas interactivas y retroalimentacion personalizada.
            </p>
            
            {/* Features */}
            <div className="space-y-4 text-left">
              {[
                "Retroalimentacion de docentes",
                "Certificado de nivel oficial",
                "Seguimiento de progreso"
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <span className="text-white/90">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Floating Elements */}
          <motion.div
            className="absolute top-20 right-20 w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-lg"
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-32 left-20 w-16 h-16 bg-white/10 rounded-xl backdrop-blur-lg"
            animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md my-8"
        >
          {/* Back Button */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </button>

          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-sena-green rounded-xl flex items-center justify-center shadow-lg shadow-sena-green/25">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">English Level Test</h1>
              <p className="text-sm text-muted-foreground">Plataforma SENA</p>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-2">Crear cuenta</h2>
          <p className="text-muted-foreground mb-4">Registrate para comenzar tu evaluacion</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </motion.div>
          )}

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 1 ? 'bg-sena-green text-white' : 'bg-sena-green/10 text-sena-green'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
              Datos Personales
            </div>
            <div className="w-8 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === 2 ? 'bg-sena-green text-white' : 'bg-muted text-muted-foreground'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
              Credenciales
            </div>
          </div>

          {/* Step 1: Datos Personales */}
          {step === 1 && (
            <motion.form 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleNextStep} 
              className="space-y-4"
            >
              {/* First Name & Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-2">
                    Nombres *
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="firstName"
                      type="text"
                      placeholder="Juan David"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-2">
                    Apellidos *
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="lastName"
                      type="text"
                      placeholder="Perez Garcia"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Correo Electronico *
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                  />
                </div>
              </div>

              {/* Document Type & Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="docType" className="block text-sm font-medium text-foreground mb-2">
                    Tipo de Documento *
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <select
                      id="docType"
                      value={formData.docType}
                      onChange={(e) => setFormData({ ...formData, docType: e.target.value })}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Seleccionar</option>
                      {documentTypes.map((doc) => (
                        <option key={doc.value} value={doc.value}>{doc.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="docNum" className="block text-sm font-medium text-foreground mb-2">
                    Numero de Documento *
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      id="docNum"
                      type="text"
                      placeholder="1234567890"
                      value={formData.docNum}
                      onChange={(e) => setFormData({ ...formData, docNum: e.target.value })}
                      required
                      className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNum" className="block text-sm font-medium text-foreground mb-2">
                  Numero de Telefono
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="phoneNum"
                    type="tel"
                    placeholder="+57 300 123 4567"
                    value={formData.phoneNum}
                    onChange={(e) => setFormData({ ...formData, phoneNum: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                  />
                </div>
              </div>

              {/* Country & Program Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-foreground mb-2">
                    Pais
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <select
                      id="country"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Seleccionar</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="program" className="block text-sm font-medium text-foreground mb-2">
                    Programa SENA
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <select
                      id="program"
                      value={formData.program}
                      onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Seleccionar</option>
                      {senaPrograms.map((program) => (
                        <option key={program} value={program}>{program}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Next Button */}
              <motion.button
                type="submit"
                className="w-full bg-sena-green text-white py-4 rounded-xl font-semibold hover:bg-sena-green-dark transition-all shadow-lg shadow-sena-green/25 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                Continuar
              </motion.button>

              {/* Login Link */}
              <p className="text-center text-muted-foreground">
                Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-sena-green hover:text-sena-green-dark font-medium transition-colors"
                >
                  Iniciar sesion
                </button>
              </p>
            </motion.form>
          )}

          {/* Step 2: Credenciales */}
          {step === 2 && (
            <motion.form 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSubmit} 
              className="space-y-4"
            >
              {/* Summary Card */}
              <div className="bg-sena-green/5 border border-sena-green/20 rounded-xl p-4 mb-2">
                <p className="text-sm text-muted-foreground mb-1">Registrando como:</p>
                <p className="font-semibold text-foreground">{formData.firstName} {formData.lastName}</p>
                <p className="text-sm text-muted-foreground">{formData.email}</p>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Contrasena *
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimo 6 caracteres"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full pl-12 pr-12 py-3.5 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                  Confirmar Contrasena *
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Repite tu contrasena"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="w-full pl-12 pr-12 py-3.5 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3 py-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={formData.acceptTerms}
                  onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                  required
                  className="mt-1 w-5 h-5 rounded border-border text-sena-green focus:ring-sena-green/50 cursor-pointer"
                />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  Acepto los{" "}
                  <span className="text-sena-green hover:underline">terminos y condiciones</span>
                  {" "}y la{" "}
                  <span className="text-sena-green hover:underline">politica de privacidad</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-muted text-muted-foreground py-4 rounded-xl font-semibold hover:bg-muted/80 transition-all"
                >
                  Atras
                </button>
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 bg-sena-green text-white py-4 rounded-xl font-semibold hover:bg-sena-green-dark transition-all shadow-lg shadow-sena-green/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  whileHover={{ scale: isLoading ? 1 : 1.01 }}
                  whileTap={{ scale: isLoading ? 1 : 0.99 }}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Crear Cuenta"
                  )}
                </motion.button>
              </div>

              {/* Login Link */}
              <p className="text-center text-muted-foreground">
                Ya tienes cuenta?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-sena-green hover:text-sena-green-dark font-medium transition-colors"
                >
                  Iniciar sesion
                </button>
              </p>
            </motion.form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
