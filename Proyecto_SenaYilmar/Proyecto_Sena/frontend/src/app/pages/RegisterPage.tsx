import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Eye,
  EyeOff,
  ArrowLeft,
  User,
  Mail,
  Lock,
  MapPin,
  Check,
  CreditCard,
  Phone,
  AlertCircle,
  AlertTriangle,
  KeyRound,
  RefreshCw,
  Loader2,
  CheckCircle2,
  GraduationCap,
  Wrench,
  Database,
  Code,
  Layers,
  ChevronRight,
  Award,
  Mic,
  PenTool,
  Languages,
  BookOpen,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { useToast } from "../components/Toast";
import {
  validateName,
  sanitizeName,
  validateEmail,
  sanitizeEmail,
  validateDocumentNumber,
  sanitizeDocumentNumber,
  validatePhoneNumber,
  sanitizePhoneNumber,
  isNumericDocType,
  getFieldValidationClass,
} from "../utils/validation";
import { FieldError } from "../components/FieldError";

type Step = 1 | 2 | 3;

const documentTypes = [
  { value: "CC", label: "Cédula de Ciudadanía" },
  { value: "TI", label: "Tarjeta de Identidad" },
  { value: "CE", label: "Cédula de Extranjería" },
  { value: "PEP", label: "Permiso Especial de Permanencia" },
  { value: "PASAPORTE", label: "Pasaporte" },
];

const countries = [
  "Colombia",
  "Argentina",
  "Chile",
  "México",
  "Perú",
  "España",
  "Estados Unidos",
  "Ecuador",
  "Venezuela",
  "Panamá",
];

export const SENA_OFFICIAL_PROGRAMS = [
  "Análisis y Desarrollo de Software (ADSO)",
  "Programación para Analítica de Datos",
  "Mecánica Industrial",
  "Redes y Telecomunicaciones",
  "Producción Multimedia",
  "Seguridad Informática",
  "Automatización Industrial",
  "Gestión Empresarial",
  "Diseño Gráfico",
];

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

export function RegisterPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const toast = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");

  // Datos personales básicos (SIN solicitar ficha ni programa)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    docType: "CC",
    docNum: "",
    phoneNum: "",
    country: "Colombia",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [isExistingPerson, setIsExistingPerson] = useState(false);
  const [existingData, setExistingData] = useState<api.CheckDocumentResponse | null>(null);
  const [isDocDuplicate, setIsDocDuplicate] = useState(false);
  const [isEmailDuplicate, setIsEmailDuplicate] = useState(false);

  // ── Validaciones estrictas campo por campo ────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string | null;
    lastName?: string | null;
    docNum?: string | null;
    email?: string | null;
    phoneNum?: string | null;
  }>({});

  const [touched, setTouched] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    docNum?: boolean;
    email?: boolean;
    phoneNum?: boolean;
  }>({});

  // Función sincronizada para obtener el error visible.
  // Regla estricta: Si el campo tiene texto (value.trim().length > 0), NUNCA disparar error de "es obligatorio".
  // El error de "es obligatorio" solo se muestra si el usuario tocó el campo y lo dejó vacío (touched && !value).
  const getFieldError = (
    field: "firstName" | "lastName" | "docNum" | "email" | "phoneNum",
    value: string
  ): string | undefined => {
    const err = fieldErrors[field];
    if (!err) return undefined;

    const isRequiredError = err.toLowerCase().includes("obligatorio");

    // 1. Error de campo obligatorio:
    // Solo debe dispararse si el usuario tocó el campo y lo dejó vacío (touched && !value).
    if (isRequiredError) {
      if (touched[field] && value.trim().length === 0) {
        return err;
      }
      return undefined;
    }

    // 2. Error de sintaxis / formato / caracteres inválidos:
    return err;
  };

  const handleFirstNameChange = (val: string) => {
    const hasInvalidChars = !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(val);
    const sanitized = sanitizeName(val);
    setFormData((prev) => ({ ...prev, firstName: sanitized }));

    if (hasInvalidChars) {
      setFieldErrors((prev) => ({
        ...prev,
        firstName: "Solo se permiten letras y espacios. No se aceptan números ni caracteres especiales.",
      }));
    } else {
      const v = validateName(sanitized, "Nombres", false);
      setFieldErrors((prev) => ({
        ...prev,
        firstName: v.isValid ? null : (sanitized.trim().length > 0 ? v.error : null),
      }));
    }
  };

  const handleFirstNameBlur = () => {
    setTouched((prev) => ({ ...prev, firstName: true }));
    const v = validateName(formData.firstName, "Nombres", true);
    setFieldErrors((prev) => ({ ...prev, firstName: v.error }));
  };

  const handleLastNameChange = (val: string) => {
    const hasInvalidChars = !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(val);
    const sanitized = sanitizeName(val);
    setFormData((prev) => ({ ...prev, lastName: sanitized }));

    if (hasInvalidChars) {
      setFieldErrors((prev) => ({
        ...prev,
        lastName: "Solo se permiten letras y espacios. No se aceptan números ni caracteres especiales.",
      }));
    } else {
      const v = validateName(sanitized, "Apellidos", false);
      setFieldErrors((prev) => ({
        ...prev,
        lastName: v.isValid ? null : (sanitized.trim().length > 0 ? v.error : null),
      }));
    }
  };

  const handleLastNameBlur = () => {
    setTouched((prev) => ({ ...prev, lastName: true }));
    const v = validateName(formData.lastName, "Apellidos", true);
    setFieldErrors((prev) => ({ ...prev, lastName: v.error }));
  };

  const handleDocNumChange = (val: string) => {
    const isNum = isNumericDocType(formData.docType);
    const hasInvalidChars = isNum ? /\D/.test(val) : /[^a-zA-Z0-9]/.test(val);
    const sanitized = sanitizeDocumentNumber(val, formData.docType);
    setFormData((prev) => ({ ...prev, docNum: sanitized }));

    if (hasInvalidChars) {
      setFieldErrors((prev) => ({
        ...prev,
        docNum: isNum
          ? "El número de documento debe contener únicamente dígitos numéricos (entre 6 y 10 dígitos) sin puntos, comas ni espacios."
          : "El número de documento debe contener únicamente caracteres alfanuméricos (entre 6 y 15 caracteres) sin símbolos ni espacios.",
      }));
    } else {
      const v = validateDocumentNumber(sanitized, formData.docType, false);
      setFieldErrors((prev) => ({
        ...prev,
        docNum: v.isValid ? null : (sanitized.length >= 6 ? v.error : null),
      }));
    }
  };

  const handleDocNumBlur = () => {
    setTouched((prev) => ({ ...prev, docNum: true }));
    const v = validateDocumentNumber(formData.docNum, formData.docType, true);
    setFieldErrors((prev) => ({ ...prev, docNum: v.error }));
    if (v.isValid) {
      handleCheckDocument();
    }
  };

  const handleDocTypeChange = (newType: string) => {
    const sanitized = sanitizeDocumentNumber(formData.docNum, newType);
    setFormData((prev) => ({ ...prev, docType: newType, docNum: sanitized }));
    if (touched.docNum || sanitized) {
      const v = validateDocumentNumber(sanitized, newType, true);
      setFieldErrors((prev) => ({ ...prev, docNum: v.error }));
    }
    if (sanitized) handleCheckDocument(newType, sanitized);
  };

  const handleEmailChange = (val: string) => {
    const hasSpaces = /\s/.test(val);
    const sanitized = sanitizeEmail(val);
    setFormData((prev) => ({ ...prev, email: sanitized }));
    if (isEmailDuplicate) setIsEmailDuplicate(false);

    if (hasSpaces) {
      setFieldErrors((prev) => ({
        ...prev,
        email: "Ingresa un correo electrónico válido (ej. usuario@ejemplo.com). No se permiten espacios ni caracteres inválidos.",
      }));
    } else {
      // Al escribir no mostrar error de formato incompleto antes de que el usuario termine y desenfoque (blur)
      setFieldErrors((prev) => ({
        ...prev,
        email: null,
      }));
    }
  };

  const handleEmailBlur = () => {
    setTouched((prev) => ({ ...prev, email: true }));
    const v = validateEmail(formData.email, true);
    setFieldErrors((prev) => ({ ...prev, email: v.error }));
    if (v.isValid) {
      handleCheckEmail();
    }
  };

  const handlePhoneChange = (val: string) => {
    const isCol = (formData.country || "").toLowerCase() === "colombia";
    const expectedMsg = isCol
      ? "Ingresa un número de teléfono celular válido (solo dígitos numéricos, 10 dígitos)."
      : "Ingresa un número de teléfono celular válido (solo dígitos numéricos, entre 7 y 15 dígitos).";

    const hadNonDigits = /[^0-9]/.test(val);
    const maxDigits = isCol ? 10 : 15;
    const onlyDigits = val.replace(/[^0-9]/g, "").slice(0, maxDigits);
    setFormData((prev) => ({ ...prev, phoneNum: onlyDigits }));

    if (hadNonDigits) {
      setFieldErrors((prev) => ({
        ...prev,
        phoneNum: expectedMsg,
      }));
      return;
    }

    if (onlyDigits.length === 0) {
      setFieldErrors((prev) => ({ ...prev, phoneNum: null }));
      return;
    }

    if (isCol) {
      if (!onlyDigits.startsWith("3")) {
        setFieldErrors((prev) => ({
          ...prev,
          phoneNum: "El número de celular en Colombia debe iniciar por 3 y contener 10 dígitos.",
        }));
      } else {
        setFieldErrors((prev) => ({
          ...prev,
          phoneNum: touched.phoneNum && onlyDigits.length < 10 ? expectedMsg : null,
        }));
      }
    } else {
      setFieldErrors((prev) => ({
        ...prev,
        phoneNum: touched.phoneNum && onlyDigits.length < 7 ? expectedMsg : null,
      }));
    }
  };

  const handlePhoneBlur = () => {
    setTouched((prev) => ({ ...prev, phoneNum: true }));
    const v = validatePhoneNumber(formData.phoneNum, formData.country, true);
    setFieldErrors((prev) => ({ ...prev, phoneNum: v.error }));
  };

  const handleCountryChange = (newCountry: string) => {
    const sanitized = sanitizePhoneNumber(formData.phoneNum, newCountry);
    setFormData((prev) => ({ ...prev, country: newCountry, phoneNum: sanitized }));
    if (touched.phoneNum && sanitized) {
      const v = validatePhoneNumber(sanitized, newCountry, true);
      setFieldErrors((prev) => ({ ...prev, phoneNum: v.error }));
    }
  };

  const isStep1Valid =
    Boolean(formData.firstName.trim()) &&
    Boolean(formData.lastName.trim()) &&
    Boolean(formData.docNum.trim()) &&
    Boolean(formData.email.trim()) &&
    Boolean(formData.phoneNum.trim()) &&
    !getFieldError("firstName", formData.firstName) &&
    !getFieldError("lastName", formData.lastName) &&
    !getFieldError("docNum", formData.docNum) &&
    !getFieldError("email", formData.email) &&
    !getFieldError("phoneNum", formData.phoneNum) &&
    !isDocDuplicate &&
    !isEmailDuplicate &&
    validateName(formData.firstName, "Nombres", true).isValid &&
    validateName(formData.lastName, "Apellidos", true).isValid &&
    validateDocumentNumber(formData.docNum, formData.docType, true).isValid &&
    validateEmail(formData.email, true).isValid &&
    validatePhoneNumber(formData.phoneNum, formData.country, true).isValid;

  // ── Estado del Paso 3 (OTP) ───────────────────────────────────────────────
  const [otpEmail, setOtpEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Modales Post-Verificación de Fichas ────────────────────────────────────
  const [showFichaModal, setShowFichaModal] = useState(false);
  const [multiPrograms, setMultiPrograms] = useState<string[]>([]);
  const [authenticatedUser, setAuthenticatedUser] = useState<api.ApiUser | null>(null);

  const [showManualFichaModal, setShowManualFichaModal] = useState(false);
  const [manualFichaInput, setManualFichaInput] = useState("");
  const [manualProgramInput, setManualProgramInput] = useState("Análisis y Desarrollo de Software (ADSO)");
  const [isManualEnrolling, setIsManualEnrolling] = useState(false);
  const [manualEnrollError, setManualEnrollError] = useState("");

  // Cuenta regresiva para reenvío de OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // ── Validación en tiempo real de documento duplicado ─────────────────────
  const handleCheckDocument = async (overrideType?: string, overrideNum?: string) => {
    const dType = overrideType ?? formData.docType;
    const dNum = overrideNum ?? formData.docNum;
    if (!dType || !dNum || dNum.trim().length < 4) return;

    try {
      const res = await api.checkDocument(dType, dNum.trim());
      if (res.exists) {
        setIsDocDuplicate(true);
        setIsExistingPerson(true);
        setExistingData(res);
        setFormData((prev) => ({
          ...prev,
          firstName: res.firstName || prev.firstName,
          lastName: res.lastName || prev.lastName,
          email: res.email || prev.email,
          country: res.country || prev.country || "Colombia",
          phoneNum: res.phoneNum ? String(res.phoneNum) : prev.phoneNum,
        }));
        // Sincronizar inmediatamente y limpiar errores de campos que ahora tienen texto
        setFieldErrors((prev) => ({
          ...prev,
          firstName: res.firstName ? null : prev.firstName,
          lastName: res.lastName ? null : prev.lastName,
          email: res.email ? null : prev.email,
          phoneNum: res.phoneNum ? null : prev.phoneNum,
        }));
        toast.warning(
          "Ya existe un registro con este número de documento. Si buscas inscribirte a un segundo programa, inicia sesión para solicitarlo desde tu perfil.",
          "Documento Registrado",
          {
            label: "Ir al Login",
            onClick: () => navigate("/login"),
          }
        );
      } else {
        setIsDocDuplicate(false);
        setIsExistingPerson(false);
        setExistingData(null);
      }
    } catch {
      // Ignorar fallas silenciosas en verificación de documento
    }
  };

  // ── Validación en tiempo real de correo duplicado ────────────────────────
  const handleCheckEmail = async (overrideEmail?: string) => {
    const emailToTest = (overrideEmail ?? formData.email).trim().toLowerCase();
    if (!emailToTest || !emailToTest.includes("@") || emailToTest.length < 5) return;

    try {
      const res = await api.checkEmail(emailToTest);
      if (res.exists) {
        setIsEmailDuplicate(true);
        toast.warning(
          "Este correo ya se encuentra registrado en Worklex. ¿Deseas iniciar sesión o recuperar tu contraseña?",
          "Correo ya Registrado",
          {
            label: "Iniciar Sesión",
            onClick: () => navigate("/login"),
          }
        );
      } else {
        setIsEmailDuplicate(false);
      }
    } catch {
      // Ignorar fallas silenciosas
    }
  };

  // ── Paso 1 → 2: validación estricta de datos personales ───────────────────
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();

    const vFirstName = validateName(formData.firstName, "Nombres", true);
    const vLastName = validateName(formData.lastName, "Apellidos", true);
    const vDoc = validateDocumentNumber(formData.docNum, formData.docType, true);
    const vEmail = validateEmail(formData.email, true);
    const vPhone = validatePhoneNumber(formData.phoneNum, formData.country, true);

    const newErrors = {
      firstName: vFirstName.error,
      lastName: vLastName.error,
      docNum: vDoc.error,
      email: vEmail.error,
      phoneNum: vPhone.error,
    };
    setFieldErrors(newErrors);
    setTouched({
      firstName: true,
      lastName: true,
      docNum: true,
      email: true,
      phoneNum: true,
    });

    if (!vFirstName.isValid || !vLastName.isValid || !vDoc.isValid || !vEmail.isValid || !vPhone.isValid) {
      setError("Por favor completa y corrige los campos con caracteres inválidos o incompletos.");
      toast.warning("Por favor corrige los campos con errores antes de continuar.", "Campos Inválidos");
      return;
    }

    if (isDocDuplicate) {
      toast.warning("Este número de documento ya está registrado.", "Documento Duplicado");
      return;
    }

    if (isEmailDuplicate) {
      toast.warning(
        "Este correo ya se encuentra registrado en Worklex. ¿Deseas iniciar sesión?",
        "Correo Duplicado",
        { label: "Iniciar Sesión", onClick: () => navigate("/login") }
      );
      return;
    }

    setError("");
    setStep(2);
  };

  // ── Paso 2 → 3: envío de datos y solicitud de OTP ─────────────────────────
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      toast.warning("La contraseña debe tener al menos 6 caracteres.", "Contraseña Corta");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      toast.error("Las contraseñas no coinciden.", "Validación de Contraseña");
      return;
    }

    if (!formData.acceptTerms) {
      setError("Debes aceptar los términos y condiciones.");
      toast.warning("Debes aceptar los términos y condiciones para continuar.");
      return;
    }

    setIsLoading(true);

    try {
      const emailTrimmed = formData.email.trim().toLowerCase();
      const res = await api.registerSendOTP({
        email: emailTrimmed,
        password: formData.password,
        doc_type: formData.docType,
        doc_num: formData.docNum.trim(),
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        country: formData.country || "Colombia",
        phone_num: formData.phoneNum
          ? parseInt(formData.phoneNum.replace(/\D/g, ""), 10)
          : undefined,
        role_id: "APRENDIZ",
      });

      setOtpEmail(res?.email || emailTrimmed);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(60);
      setStep(3);
      toast.success(
        "Hemos enviado un código de seguridad de 6 dígitos a tu correo registrado.",
        "Código Enviado"
      );
    } catch (err: any) {
      console.error("Error al solicitar código de registro:", err);
      const msg = err?.message || "No se pudo iniciar el proceso de verificación. Verifica tus datos.";
      setError(msg);
      toast.error(msg, "Error de Registro");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Manejo de casillas de código OTP en Paso 3 ────────────────────────────
  const handleOtpDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    if (digit && index < 5) {
      const nextEl = document.getElementById(`register-otp-${index + 1}`);
      nextEl?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevEl = document.getElementById(`register-otp-${index - 1}`);
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
    document.getElementById(`register-otp-${targetIdx}`)?.focus();
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.resendLoginOTP(otpEmail);
      toast.success("Nuevo código enviado a tu correo institucional.", "Código Reenviado");
      setResendCooldown(60);
    } catch (err: any) {
      const msg = "No se pudo reenviar el código. Intenta nuevamente en unos momentos.";
      toast.error(msg, "Error al Reenviar");
    }
  };

  // ── Paso 3: Verificación definitiva de OTP y post-enrutamiento ─────────────
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
      const response = await api.registerVerifyOTP(otpEmail, code);

      // Purga total previa de tokens para evitar colisión de cuentas
      api.clearAllTokens();

      // Guardar tokens y sesión en el frontend
      localStorage.setItem("accessToken", response.access);
      localStorage.setItem("refreshToken", response.refresh);
      localStorage.setItem("userName", response.user.name);
      localStorage.setItem("userRole", response.user.role);
      localStorage.setItem("userId", response.user.id);
      localStorage.setItem("userEmail", response.user.email || otpEmail);
      if (response.user.permissions) {
        localStorage.setItem("userPermissions", JSON.stringify(response.user.permissions));
      }
      updateUser(response.user);

      toast.success("¡Cuenta verificada exitosamente! Bienvenido a Worklex SENA.", "Registro Exitoso");

      // ── Flujo de Fichas Post-Verificación ──
      const programs = (response.user.enrolledPrograms && response.user.enrolledPrograms.length > 0)
        ? response.user.enrolledPrograms
        : (response.user.program ? [response.user.program] : []);

      // CASO 1: SIN FICHAS (Aprendiz registrado limpio sin ficha asignada)
      if (programs.length === 0) {
        localStorage.removeItem("userProgram");
        setAuthenticatedUser(response.user);
        setShowManualFichaModal(true);
        return;
      }

      // CASO 2: EXACTAMENTE 1 FICHA -> Redirección directa al Dashboard
      if (programs.length === 1) {
        localStorage.setItem("userProgram", programs[0]);
        navigate("/dashboard");
        return;
      }

      // CASO 3: 2 O MÁS FICHAS -> Alert View de Selección de Ficha
      setMultiPrograms(programs);
      setAuthenticatedUser(response.user);
      setShowFichaModal(true);
    } catch (err: any) {
      console.error("Error al validar código de verificación:", err);
      const msg = err?.message || "Código de verificación incorrecto o expirado.";
      setError(msg);
      toast.error(msg, "Código Inválido");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Selección en Alert View Multiprograma ──────────────────────────────────
  const handleSelectFicha = (selectedProgram: string) => {
    localStorage.setItem("userProgram", selectedProgram);
    if (authenticatedUser) {
      updateUser({ ...authenticatedUser, program: selectedProgram });
    }
    setShowFichaModal(false);
    navigate("/dashboard");
  };

  // ── Vinculación inicial de ficha y programa ───────────────────────────────
  const handleManualEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFicha = manualFichaInput.trim();
    if (!cleanFicha) return;
    if (!/^\d{4,9}$/.test(cleanFicha)) {
      setManualEnrollError("El número de ficha debe contener entre 4 y 9 dígitos numéricos.");
      return;
    }
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

  const baseInputClass =
    "h-10 text-sm w-full bg-white dark:bg-slate-800 rounded-md pl-9 pr-3 py-2 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-all shadow-sm";
  const inputClass = `${baseInputClass} border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-[#39A900] focus:border-transparent`;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 grid lg:grid-cols-12 relative">
      {/* ── Formulario de Registro (5 cols) ── */}
      <div className="lg:col-span-5 min-h-screen flex flex-col justify-center items-center px-6 lg:px-16 bg-white dark:bg-slate-900 z-10 border-r border-slate-200 dark:border-slate-800 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-5"
        >
          <button
            type="button"
            onClick={() => {
              if (step === 3) setStep(2);
              else if (step === 2) setStep(1);
              else navigate("/");
            }}
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
            <span>
              {step === 3
                ? "Volver a contraseña"
                : step === 2
                ? "Volver a datos personales"
                : "Volver al inicio"}
            </span>
          </button>

          <div className="flex items-center gap-3 mb-6 logo-container">
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

          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Crea tu cuenta WorkLex
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ingresa tus datos personales para acceder a las evaluaciones diagnósticas
            </p>
          </div>

          {/* Indicador de progreso horizontal minimalista y sobrio */}
          <div className="w-full flex items-center justify-between select-none">
            {[
              { n: 1, title: "Datos" },
              { n: 2, title: "Acceso" },
              { n: 3, title: "Verificación" },
            ].map(({ n, title }, i) => {
              const isActive = step === n;
              const isCompleted = step > n;
              return (
                <div key={n} className="flex items-center flex-1 last:flex-initial">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors shrink-0 ${
                        isActive
                          ? "bg-[#39A900] text-white"
                          : isCompleted
                          ? "bg-[#39A900]/15 text-[#39A900]"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={2.2} /> : n}
                    </span>
                    <span
                      className={`text-xs font-medium transition-colors ${
                        isActive || isCompleted
                          ? "text-[#39A900] font-semibold"
                          : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {title}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`flex-1 h-[1px] mx-2 transition-colors ${
                        isCompleted ? "bg-[#39A900]/40" : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-md text-rose-700 dark:text-rose-300 text-xs"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
              <p className="leading-snug">{error}</p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* ════════════════════════════════════════════════
                PASO 1 – Datos personales básicos
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
                {/* Tipo y número de documento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Tipo Documento *</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                      <select
                        required
                        value={formData.docType}
                        onChange={(e) => handleDocTypeChange(e.target.value)}
                        className={`${inputClass} appearance-none cursor-pointer`}
                      >
                        {documentTypes.map((d) => (
                          <option key={d.value} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Número Documento *</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                      <input
                        type="text"
                        placeholder="1020304050"
                        required
                        value={formData.docNum}
                        onChange={(e) => handleDocNumChange(e.target.value)}
                        onBlur={handleDocNumBlur}
                        className={`${baseInputClass} ${getFieldValidationClass(
                          !!touched.docNum,
                          getFieldError("docNum", formData.docNum),
                          formData.docNum,
                          validateDocumentNumber(formData.docNum, formData.docType, true).isValid && !isDocDuplicate
                        )}`}
                      />
                    </div>
                    <FieldError error={getFieldError("docNum", formData.docNum)} />
                  </div>
                </div>

                {/* Banner de documento duplicado */}
                {isDocDuplicate && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-md text-left shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                      <div className="text-xs text-amber-950 space-y-1.5 flex-1">
                        <p className="font-bold">
                          Ya existe un registro con este número de documento.
                        </p>
                        <p className="text-amber-800 leading-relaxed">
                          Si buscas inscribirte a un segundo programa, inicia sesión para solicitarlo desde tu perfil.
                        </p>
                        <button
                          type="button"
                          onClick={() => navigate("/login")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-medium text-xs shadow-xs transition-colors cursor-pointer mt-1"
                        >
                          <span>Iniciar Sesión</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Banner de persona detectada en el SENA */}
                {!isDocDuplicate && isExistingPerson && existingData && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 bg-sena-blue/10 border border-sena-blue/30 rounded-md text-left"
                  >
                    <div className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-sena-blue flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                      <div className="text-xs text-foreground space-y-1">
                        <p className="font-bold text-sena-blue">
                          ¡Usuario identificado en la base SENA: {existingData.name}!
                        </p>
                        <p className="text-muted-foreground">
                          Completaremos tus datos automáticamente para agilizar tu acceso.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Nombres y Apellidos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Nombres *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                      <input
                        type="text"
                        placeholder="Juan David"
                        required
                        maxLength={45}
                        value={formData.firstName}
                        onChange={(e) => handleFirstNameChange(e.target.value)}
                        onBlur={handleFirstNameBlur}
                        className={`${baseInputClass} ${getFieldValidationClass(
                          !!touched.firstName,
                          getFieldError("firstName", formData.firstName),
                          formData.firstName,
                          validateName(formData.firstName, "Nombres", true).isValid
                        )}`}
                      />
                    </div>
                    <FieldError error={getFieldError("firstName", formData.firstName)} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Apellidos *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                      <input
                        type="text"
                        placeholder="Hormaza Miranda"
                        required
                        maxLength={45}
                        value={formData.lastName}
                        onChange={(e) => handleLastNameChange(e.target.value)}
                        onBlur={handleLastNameBlur}
                        className={`${baseInputClass} ${getFieldValidationClass(
                          !!touched.lastName,
                          getFieldError("lastName", formData.lastName),
                          formData.lastName,
                          validateName(formData.lastName, "Apellidos", true).isValid
                        )}`}
                      />
                    </div>
                    <FieldError error={getFieldError("lastName", formData.lastName)} />
                  </div>
                </div>

                {/* Correo Electrónico */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Correo Electrónico *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                    <input
                      type="email"
                      placeholder="tu@correo.com"
                      required
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      onBlur={handleEmailBlur}
                      className={`${baseInputClass} ${getFieldValidationClass(
                        !!touched.email,
                        getFieldError("email", formData.email),
                        formData.email,
                        validateEmail(formData.email, true).isValid && !isEmailDuplicate
                      )}`}
                    />
                  </div>
                  <FieldError error={getFieldError("email", formData.email)} />

                  {/* Banner de correo duplicado */}
                  {isEmailDuplicate && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-md text-left shadow-xs mt-2"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                        <div className="text-xs text-amber-950 space-y-1.5 flex-1">
                          <p className="font-bold">
                            Este correo ya se encuentra registrado en Worklex.
                          </p>
                          <p className="text-amber-800 leading-relaxed">
                            ¿Deseas iniciar sesión o recuperar tu contraseña?
                          </p>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => navigate("/login")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-medium text-xs shadow-xs transition-colors cursor-pointer"
                            >
                              <span>Iniciar Sesión</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate("/recuperar-cuenta")}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#39A900] hover:bg-[#2e8600] text-white rounded-md font-medium text-xs shadow-xs transition-colors cursor-pointer"
                            >
                              <span>Recuperar Contraseña</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Teléfono y País */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Teléfono Celular *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="300 123 4567"
                        required
                        value={formData.phoneNum}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onBlur={handlePhoneBlur}
                        className={`${baseInputClass} ${getFieldValidationClass(
                          !!touched.phoneNum,
                          getFieldError("phoneNum", formData.phoneNum),
                          formData.phoneNum,
                          validatePhoneNumber(formData.phoneNum, formData.country, true).isValid
                        )}`}
                      />
                    </div>
                    <FieldError error={getFieldError("phoneNum", formData.phoneNum)} />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">País</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                      <select
                        value={formData.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className={`${inputClass} appearance-none cursor-pointer`}
                      >
                        {countries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isStep1Valid || isDocDuplicate || isEmailDuplicate}
                  className="w-full h-10 bg-[#39A900] hover:bg-[#2e8600] text-white font-medium text-sm rounded-md shadow transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar a Contraseña y Acceso
                </button>

                <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                  ¿Ya tienes una cuenta registrada?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-[#39A900] hover:underline font-medium text-xs cursor-pointer"
                  >
                    Ingresar aquí
                  </button>
                </p>
              </motion.form>
            )}

            {/* ════════════════════════════════════════════════
                PASO 2 – Contraseña + Términos y Envío de Código
            ════════════════════════════════════════════════ */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleStep2Submit}
                className="space-y-4"
              >
                {/* Resumen del aprendiz */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-md p-3 mb-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-0.5">Creando cuenta para:</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {formData.firstName} {formData.lastName}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{formData.email}</p>
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className={`${inputClass} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                      title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.8} /> : <Eye className="w-4 h-4" strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Confirmar Contraseña *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" strokeWidth={1.8} />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Repite tu contraseña"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className={`${inputClass} pr-9`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                      title={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.8} /> : <Eye className="w-4 h-4" strokeWidth={1.8} />}
                    </button>
                  </div>
                </div>

                {/* Términos y condiciones */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="terms"
                    type="checkbox"
                    required
                    checked={formData.acceptTerms}
                    onChange={(e) => setFormData({ ...formData, acceptTerms: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#39A900] focus:ring-[#39A900]/30 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-400 leading-snug cursor-pointer">
                    Acepto los términos de servicio, políticas de privacidad y el reglamento del aprendiz SENA.
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium transition-colors cursor-pointer text-sm"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-10 bg-[#39A900] hover:bg-[#2e8600] text-white font-medium text-sm rounded-md shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Recibir Código</span>
                    )}
                  </button>
                </div>
              </motion.form>
            )}

            {/* ════════════════════════════════════════════════
                PASO 3 – Verificación de Código OTP (6 dígitos)
            ════════════════════════════════════════════════ */}
            {step === 3 && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyOtp}
                className="space-y-4"
              >
                <div className="text-center space-y-2 mb-2">
                  <div className="w-12 h-12 bg-emerald-50 text-[#39A900] rounded-xl flex items-center justify-center mx-auto border border-emerald-100">
                    <KeyRound className="w-6 h-6" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Verifica tu cuenta institucional
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Hemos enviado un código de seguridad de 6 dígitos a tu correo registrado{" "}
                    <span className="font-semibold text-slate-900 dark:text-white underline">{otpEmail}</span>. Ingrésalo a continuación para activar tu cuenta de Aprendiz en WorkLex SENA.
                  </p>
                </div>

                {/* 6 Casillas Numéricas Independientes */}
                <div className="flex justify-center gap-2 my-4">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      id={`register-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      autoFocus={index === 0}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      className="w-11 h-11 text-center text-lg font-bold font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-[#39A900] focus:border-transparent rounded-md text-slate-900 dark:text-white focus:outline-none transition-all shadow-sm"
                    />
                  ))}
                </div>

                {/* Botón de Reenvío con Cuenta Regresiva de 60s */}
                <div className="text-center pt-1">
                  {resendCooldown > 0 ? (
                    <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5 font-medium">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#39A900]" strokeWidth={1.8} />
                      ¿No recibiste el código? Reenviar en{" "}
                      <span className="font-bold text-slate-900 dark:text-white">{resendCooldown}s</span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-[#39A900] hover:underline font-medium text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.8} />
                      ¿No recibiste el código? Reenviar código
                    </button>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-medium transition-colors cursor-pointer text-sm"
                  >
                    Atrás
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || otpDigits.join("").length < 6}
                    className="flex-1 h-10 bg-[#39A900] hover:bg-[#2e8600] text-white font-medium text-sm rounded-md shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} />
                        <span>Verificando...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" strokeWidth={1.8} />
                        <span>Verificar Cuenta</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
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

      {/* ═══════════════════════════════════════════════════════════════════════
          ALERT VIEW: SELECCIÓN DE FICHA ACTIVA PARA APRENDICES MULTIPROGRAMA
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
                {/* Paso 1: Programa de Formación */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    1. Programa de Formación *
                  </label>
                  <select
                    value={manualProgramInput}
                    onChange={(e) => setManualProgramInput(e.target.value)}
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:border-transparent text-sm shadow-sm cursor-pointer"
                  >
                    {SENA_OFFICIAL_PROGRAMS.map((progName) => (
                      <option key={progName} value={progName}>
                        {progName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Paso 2: Número de Ficha */}
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">
                    2. Número de Ficha *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={manualFichaInput}
                    onChange={(e) => {
                      setManualFichaInput(e.target.value.replace(/\D/g, ""));
                      setManualEnrollError("");
                    }}
                    placeholder="Número de ficha (ej. 2670142)"
                    className="w-full h-10 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#39A900] focus:border-transparent text-sm shadow-sm"
                  />
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

export default RegisterPage;
