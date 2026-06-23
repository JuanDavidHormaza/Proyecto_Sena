import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Eye, EyeOff, GraduationCap, Mail, Lock, ArrowLeft, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login({ email: formData.email, password: formData.password });

      const userRole = localStorage.getItem("userRole");

      if (userRole === "admin" || userRole === "superadmin") {
        navigate("/admin");
      } else if (userRole === "teacher") {
        navigate("/teacher");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.log("ERROR COMPLETO:", err);
      console.log("MENSAJE:", err?.message);
      setError(err?.message || "Credenciales incorrectas o cuenta inactiva.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
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

          <h2 className="text-3xl font-bold text-foreground mb-2">Bienvenido de nuevo</h2>
          <p className="text-muted-foreground mb-8">Ingresa tus credenciales para continuar</p>

          {/* Error Alert */}
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Correo Electronico
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
                  className="w-full pl-12 pr-4 py-3.5 bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 focus:border-sena-green transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Contrasena
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contrasena"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
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

            {/* Forgot Password */}
            <div className="flex items-center justify-end">
              <button type="button" className="text-sm text-sena-green hover:text-sena-green-dark transition-colors font-medium">
                Olvidaste tu contrasena?
              </button>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sena-green text-white py-4 rounded-xl font-semibold hover:bg-sena-green-dark transition-all shadow-lg shadow-sena-green/25 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileHover={{ scale: isLoading ? 1 : 1.01 }}
              whileTap={{ scale: isLoading ? 1 : 0.99 }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Ingresar"
              )}
            </motion.button>

            {/* Register Link */}
            <p className="text-center text-muted-foreground">
              No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-sena-green hover:text-sena-green-dark font-medium transition-colors"
              >
                Crear cuenta
              </button>
            </p>
          </form>

          {/* Demo Credentials */}

          
        </motion.div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-sena-green via-sena-green-dark to-sena-blue relative overflow-hidden">
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
              Evalua tu nivel de ingles con el SENA
            </h3>
            <p className="text-white/80 text-lg leading-relaxed">
              Accede a evaluaciones interactivas, recibe retroalimentacion personalizada y mejora tus competencias linguisticas.
            </p>
          </motion.div>

          <motion.div
            className="absolute top-20 left-20 w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-lg"
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-32 right-20 w-16 h-16 bg-white/10 rounded-xl backdrop-blur-lg"
            animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.div
            className="absolute top-1/2 right-32 w-12 h-12 bg-white/10 rounded-lg backdrop-blur-lg"
            animate={{ y: [0, 15, 0], rotate: [0, 10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>
      </div>
    </div>
  );
}