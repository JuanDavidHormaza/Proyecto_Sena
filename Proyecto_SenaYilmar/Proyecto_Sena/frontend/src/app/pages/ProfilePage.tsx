import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpen,
  ClipboardList,
  Mail,
  Phone,
  Shield,
  UserRound,
  Globe,
  Calendar,
  RefreshCw,
  CheckCircle2,
  GraduationCap,
  Plus,
  Sparkles,
  Loader2,
  Edit3,
  Save,
  Camera,
  Upload,
  Trash2,
  Flame,
  Clock,
  Bell,
  Settings,
  Volume2,
  Check,
  ChevronRight,
  Zap,
  Layers,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { HeaderActionTools } from "../components/HeaderActionTools";
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

const ROLE_LABELS: Record<string, string> = {
  superadmin: "SuperAdministrador",
  admin: "Administrador",
  teacher: "Instructor SENA",
  student: "Aprendiz SENA",
};

const ROLE_DASHBOARDS: Record<string, string> = {
  superadmin: "/admin",
  admin: "/admin",
  teacher: "/teacher",
  student: "/dashboard",
};

const PERMISSIONS: Array<{ key: string; label: string }> = [
  { key: "canManageUsers", label: "Gestionar usuarios" },
  { key: "canManageDocuments", label: "Gestionar documentos" },
  { key: "canViewStatistics", label: "Ver estadísticas" },
  { key: "canGiveFeedback", label: "Dar retroalimentación" },
  { key: "canTakeQuiz", label: "Realizar pruebas" },
  { key: "canViewResults", label: "Ver resultados" },
  { key: "canManageSubjects", label: "Gestionar asignaturas" },
  { key: "canConfigureLevels", label: "Configurar niveles" },
];

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function formatDate(dateString?: string): string {
  if (!dateString) return "No registrada";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

const SENA_OFFICIAL_PROGRAMS = [
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

export function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [isSwitchingProgram, setIsSwitchingProgram] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // Pestañas principales de gestión de perfil
  const [activeTab, setActiveTab] = useState<"all" | "edit" | "preferences" | "fichas">("all");

  // Estado para edición completa de datos personales
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    docType: "CC",
    docNum: "",
    email: "",
    phoneNum: "",
    avatar: "",
  });

  // Estado para solicitudes de vinculación a programa alterno (dos pasos)
  const [selectedProgramInput, setSelectedProgramInput] = useState<string>("Análisis y Desarrollo de Software (ADSO)");
  const [newFichaInput, setNewFichaInput] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [fichaRequests, setFichaRequests] = useState<api.ApiFichaRequest[]>([]);

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName || (user.name ? user.name.split(" ")[0] : ""),
        lastName: user.lastName || (user.name ? user.name.split(" ").slice(1).join(" ") : ""),
        docType: user.docType || "CC",
        docNum: user.docNum || "",
        email: user.email || "",
        phoneNum: user.phoneNum ? String(user.phoneNum) : "",
        avatar: user.avatar || sessionStorage.getItem("userAvatar") || "",
      });
    }
  }, [user]);

  // Manejo de archivo de imagen para avatar
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.warning("Formato no compatible. Por favor sube una imagen en formato JPG, PNG o WebP.", "Formato Inválido");
      return;
    }

    const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_SIZE_BYTES) {
      toast.warning("La imagen seleccionada supera el límite máximo de 2 MB.", "Archivo muy pesado");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setEditForm((prev) => ({ ...prev, avatar: dataUrl }));
        setSelectedAvatarFile(file);
        toast.success("Foto seleccionada. Guarda los cambios para actualizar tu perfil.", "Vista previa lista");
      }
    };
    reader.onerror = () => {
      toast.error("Ocurrió un error al procesar la imagen seleccionada.");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setEditForm((prev) => ({ ...prev, avatar: "" }));
    setSelectedAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.info("Foto removida. Guarda los cambios para actualizar tu perfil.");
  };

  const handleSelectPresetAvatar = (presetUrl: string) => {
    setEditForm((prev) => ({ ...prev, avatar: presetUrl }));
    setSelectedAvatarFile(null);
  };

  // Validaciones campo por campo
  const [editErrors, setEditErrors] = useState<{
    firstName?: string | null;
    lastName?: string | null;
    docNum?: string | null;
    email?: string | null;
    phoneNum?: string | null;
  }>({});

  const [editTouched, setEditTouched] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    docNum?: boolean;
    email?: boolean;
    phoneNum?: boolean;
  }>({});

  const handleEditFirstNameChange = (val: string) => {
    const hasInvalidChars = !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(val);
    const sanitized = sanitizeName(val);
    setEditForm((prev) => ({ ...prev, firstName: sanitized }));
    setEditTouched((prev) => ({ ...prev, firstName: true }));
    if (hasInvalidChars) {
      setEditErrors((prev) => ({
        ...prev,
        firstName: "Solo se permiten letras y espacios. No se aceptan números ni caracteres especiales.",
      }));
    } else {
      const v = validateName(sanitized, "Nombres");
      setEditErrors((prev) => ({ ...prev, firstName: v.error }));
    }
  };

  const handleEditFirstNameBlur = () => {
    setEditTouched((prev) => ({ ...prev, firstName: true }));
    const v = validateName(editForm.firstName, "Nombres");
    setEditErrors((prev) => ({ ...prev, firstName: v.error }));
  };

  const handleEditLastNameChange = (val: string) => {
    const hasInvalidChars = !/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]*$/.test(val);
    const sanitized = sanitizeName(val);
    setEditForm((prev) => ({ ...prev, lastName: sanitized }));
    setEditTouched((prev) => ({ ...prev, lastName: true }));
    if (hasInvalidChars) {
      setEditErrors((prev) => ({
        ...prev,
        lastName: "Solo se permiten letras y espacios. No se aceptan números ni caracteres especiales.",
      }));
    } else {
      const v = validateName(sanitized, "Apellidos");
      setEditErrors((prev) => ({ ...prev, lastName: v.error }));
    }
  };

  const handleEditLastNameBlur = () => {
    setEditTouched((prev) => ({ ...prev, lastName: true }));
    const v = validateName(editForm.lastName, "Apellidos");
    setEditErrors((prev) => ({ ...prev, lastName: v.error }));
  };

  const handleEditDocNumChange = (val: string) => {
    const isNum = isNumericDocType(editForm.docType);
    const hasInvalidChars = isNum ? /\D/.test(val) : /[^a-zA-Z0-9]/.test(val);
    const sanitized = sanitizeDocumentNumber(val, editForm.docType);
    setEditForm((prev) => ({ ...prev, docNum: sanitized }));
    setEditTouched((prev) => ({ ...prev, docNum: true }));

    if (hasInvalidChars) {
      setEditErrors((prev) => ({
        ...prev,
        docNum: isNum
          ? "El número de documento debe contener únicamente dígitos numéricos (entre 6 y 10 dígitos) sin puntos, comas ni espacios."
          : "El número de documento debe contener únicamente caracteres alfanuméricos (entre 6 y 15 caracteres) sin símbolos ni espacios.",
      }));
    } else {
      const v = validateDocumentNumber(sanitized, editForm.docType);
      setEditErrors((prev) => ({ ...prev, docNum: v.error }));
    }
  };

  const handleEditDocNumBlur = () => {
    setEditTouched((prev) => ({ ...prev, docNum: true }));
    const v = validateDocumentNumber(editForm.docNum, editForm.docType);
    setEditErrors((prev) => ({ ...prev, docNum: v.error }));
  };

  const handleEditDocTypeChange = (newType: string) => {
    const sanitized = sanitizeDocumentNumber(editForm.docNum, newType);
    setEditForm((prev) => ({ ...prev, docType: newType, docNum: sanitized }));
    if (editTouched.docNum || sanitized) {
      const v = validateDocumentNumber(sanitized, newType);
      setEditErrors((prev) => ({ ...prev, docNum: v.error }));
    }
  };

  const handleEditEmailChange = (val: string) => {
    const hasSpaces = /\s/.test(val);
    const sanitized = sanitizeEmail(val);
    setEditForm((prev) => ({ ...prev, email: sanitized }));
    setEditTouched((prev) => ({ ...prev, email: true }));

    if (hasSpaces) {
      setEditErrors((prev) => ({
        ...prev,
        email: "Ingresa un correo electrónico válido (ej. usuario@ejemplo.com). No se permiten espacios ni caracteres inválidos.",
      }));
    } else {
      const v = validateEmail(sanitized);
      setEditErrors((prev) => ({ ...prev, email: v.error }));
    }
  };

  const handleEditEmailBlur = () => {
    setEditTouched((prev) => ({ ...prev, email: true }));
    const v = validateEmail(editForm.email);
    setEditErrors((prev) => ({ ...prev, email: v.error }));
  };

  const handleEditPhoneChange = (val: string) => {
    const hasNonDigits = /\D/.test(val);
    const sanitized = sanitizePhoneNumber(val, "Colombia");
    setEditForm((prev) => ({ ...prev, phoneNum: sanitized }));
    setEditTouched((prev) => ({ ...prev, phoneNum: true }));

    if (hasNonDigits) {
      setEditErrors((prev) => ({
        ...prev,
        phoneNum: "Solo se permiten dígitos numéricos en el teléfono celular.",
      }));
    } else {
      const v = validatePhoneNumber(sanitized, "Colombia", false);
      setEditErrors((prev) => ({ ...prev, phoneNum: v.error }));
    }
  };

  const handleEditPhoneBlur = () => {
    setEditTouched((prev) => ({ ...prev, phoneNum: true }));
    const v = validatePhoneNumber(editForm.phoneNum, "Colombia", false);
    setEditErrors((prev) => ({ ...prev, phoneNum: v.error }));
  };

  const isEditFormValid =
    Boolean(editForm.firstName.trim()) &&
    Boolean(editForm.lastName.trim()) &&
    Boolean(editForm.docNum.trim()) &&
    Boolean(editForm.email.trim()) &&
    !editErrors.firstName &&
    !editErrors.lastName &&
    !editErrors.docNum &&
    !editErrors.email &&
    !editErrors.phoneNum;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const vFirstName = validateName(editForm.firstName, "Nombres");
    const vLastName = validateName(editForm.lastName, "Apellidos");
    const vDoc = validateDocumentNumber(editForm.docNum, editForm.docType);
    const vEmail = validateEmail(editForm.email);
    const vPhone = validatePhoneNumber(editForm.phoneNum, "Colombia", false);

    setEditErrors({
      firstName: vFirstName.error,
      lastName: vLastName.error,
      docNum: vDoc.error,
      email: vEmail.error,
      phoneNum: vPhone.error,
    });
    setEditTouched({ firstName: true, lastName: true, docNum: true, email: true, phoneNum: true });

    if (!vFirstName.isValid || !vLastName.isValid || !vDoc.isValid || !vEmail.isValid || !vPhone.isValid) {
      toast.warning("Por favor corrige los campos con errores antes de guardar.", "Campos Inválidos");
      return;
    }

    setIsSavingProfile(true);
    try {
      let finalAvatar = editForm.avatar;

      // Subida de imagen a MinIO si hay un archivo seleccionado
      if (selectedAvatarFile) {
        try {
          const uploadRes = await api.uploadMediaFile(selectedAvatarFile, "dictionary-images");
          if (uploadRes?.url || uploadRes?.proxy_url) {
            finalAvatar = uploadRes.url || uploadRes.proxy_url;
          }
        } catch (uploadErr) {
          console.warn("Subida a almacenamiento MinIO no completada, conservando Base64 para avatar:", uploadErr);
        }
      }

      const payload: Partial<api.ApiUser> = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        name: `${editForm.firstName.trim()} ${editForm.lastName.trim()}`.trim(),
        docType: editForm.docType,
        docNum: editForm.docNum.trim(),
        email: editForm.email.trim().toLowerCase(),
        phoneNum: editForm.phoneNum.trim(),
        avatar: finalAvatar,
      };

      const updated = await api.updateUser(user.id, payload);
      const userWithAvatar = { ...updated, avatar: finalAvatar };
      updateUser(userWithAvatar);
      sessionStorage.setItem("userAvatar", finalAvatar || "");
      sessionStorage.setItem("userName", updated.name);
      sessionStorage.setItem("userEmail", updated.email);

      // Sincronizar preferencias del usuario
      localStorage.setItem("pref_emailNotifications", String(preferences.emailNotifications));
      localStorage.setItem("pref_studyReminders", String(preferences.studyReminders));
      localStorage.setItem("pref_supportLanguage", preferences.supportLanguage);
      localStorage.setItem("pref_soundEffects", String(preferences.soundEffects));
      localStorage.setItem("pref_theme", preferences.theme);
      localStorage.setItem("pref_reminderTime", preferences.practiceReminderTime);

      toast.success("Perfil institucional actualizado con éxito en la plataforma.", "Cambios Guardados");
      setSelectedAvatarFile(null);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo actualizar la información de perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── 2. Módulo de Preferencias ──────────────────────────────────────────
  const [preferences, setPreferences] = useState(() => {
    return {
      emailNotifications: localStorage.getItem("pref_emailNotifications") !== "false",
      studyReminders: localStorage.getItem("pref_studyReminders") !== "false",
      supportLanguage: localStorage.getItem("pref_supportLanguage") || "es",
      soundEffects: localStorage.getItem("pref_soundEffects") !== "false",
      theme: localStorage.getItem("pref_theme") || "system",
      practiceReminderTime: localStorage.getItem("pref_reminderTime") || "18:00",
    };
  });
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPreferences(true);
    try {
      localStorage.setItem("pref_emailNotifications", String(preferences.emailNotifications));
      localStorage.setItem("pref_studyReminders", String(preferences.studyReminders));
      localStorage.setItem("pref_supportLanguage", preferences.supportLanguage);
      localStorage.setItem("pref_soundEffects", String(preferences.soundEffects));
      localStorage.setItem("pref_theme", preferences.theme);
      localStorage.setItem("pref_reminderTime", preferences.practiceReminderTime);

      if (user?.id) {
        try {
          await api.updateUser(user.id, {
            // sincronizar preferencias si el backend las almacena
          });
        } catch {}
      }

      toast.success("Preferencias guardadas exitosamente en tu perfil.", "Preferencias Actualizadas");
    } catch {
      toast.error("No se pudieron guardar las preferencias.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // ─── 3. Módulo de Racha de Estudio (Streak) y Progreso Diario ────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastActiveDate = sessionStorage.getItem("studyLastActiveDate") || "";

  // Estado dinámico de historial de pruebas
  const [examHistory, setExamHistory] = useState<{
    lastScore: number | null;
    currentLevel: string | null;
    totalQuestions: number | null;
    correctAnswers: number | null;
    completedAt: string | null;
    totalExams: number | null;
    avgScore: number | null;
    avgDuration: string | null;
    hasAttempt: boolean;
    isLoading: boolean;
  }>(() => {
    try {
      const storedScore = sessionStorage.getItem("quizScore");
      const storedLevel = sessionStorage.getItem("quizLevel");
      const storedQuestions = sessionStorage.getItem("totalQuestions");
      if (storedScore !== null && storedLevel) {
        return {
          lastScore: Number(storedScore),
          currentLevel: storedLevel,
          totalQuestions: storedQuestions ? Number(storedQuestions) : 12,
          correctAnswers: null,
          completedAt: null,
          totalExams: 1,
          avgScore: Number(storedScore),
          avgDuration: null,
          hasAttempt: true,
          isLoading: true,
        };
      }
    } catch {}

    return {
      lastScore: null,
      currentLevel: null,
      totalQuestions: null,
      correctAnswers: null,
      completedAt: null,
      totalExams: null,
      avgScore: null,
      avgDuration: null,
      hasAttempt: false,
      isLoading: true,
    };
  });

  useEffect(() => {
    let isCancelled = false;
    const fetchHistory = async () => {
      const uId = user?.id || sessionStorage.getItem("userId");
      try {
        const results = await api.getExamHistory(uId ? String(uId) : undefined);
        if (isCancelled) return;
        if (Array.isArray(results) && results.length > 0) {
          const filtered = uId
            ? results.filter((r) => String(r.userId) === String(uId))
            : results;
          const candidateList = filtered.length > 0 ? filtered : results;

          const sorted = [...candidateList].sort((a, b) => {
            const timeA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
            const timeB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
            return timeB - timeA;
          });

          const latest = sorted[0];

          const totalExams = candidateList.length;
          const validScores = candidateList
            .map((r) => (typeof r.score === "number" ? r.score : null))
            .filter((s): s is number => s !== null);
          const avgScore =
            validScores.length > 0
              ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
              : null;

          const parseDurSec = (d?: string) => {
            if (!d) return 0;
            if (d.includes(":")) {
              const parts = d.split(":").map(Number);
              if (parts.length === 2) return (parts[0] || 0) * 60 + (parts[1] || 0);
            }
            const n = parseInt(d.replace(/\D/g, ""));
            return isNaN(n) ? 0 : n;
          };

          const durations = candidateList.map((r) => parseDurSec(r.duration)).filter((s) => s > 0);
          const avgSec =
            durations.length > 0
              ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
              : 0;
          const avgDuration =
            avgSec > 0
              ? `${Math.ceil(avgSec / 60)} min`
              : latest.duration || null;

          setExamHistory({
            lastScore: typeof latest.score === "number" ? latest.score : null,
            currentLevel: latest.level && latest.level !== "Sin Nivel" ? latest.level : null,
            totalQuestions: typeof latest.totalQuestions === "number" ? latest.totalQuestions : null,
            correctAnswers: typeof latest.correctAnswers === "number" ? latest.correctAnswers : null,
            completedAt: latest.completedAt || null,
            totalExams,
            avgScore,
            avgDuration,
            hasAttempt: true,
            isLoading: false,
          });

          // Si el examen fue completado hoy, registrar actividad hoy
          if (latest.completedAt && latest.completedAt.slice(0, 10) === todayStr) {
            sessionStorage.setItem("studyLastActiveDate", todayStr);
          }
        } else {
          setExamHistory((prev) => ({
            ...prev,
            isLoading: false,
          }));
        }
      } catch (err) {
        console.warn("No se pudo obtener el historial de exámenes:", err);
        if (!isCancelled) {
          setExamHistory((prev) => ({
            ...prev,
            isLoading: false,
          }));
        }
      }
    };

    fetchHistory();
    return () => {
      isCancelled = true;
    };
  }, [user?.id, todayStr]);

  // ── Motor Dinámico de Racha de Estudio (Study Streak Engine) ────────────
  const [streakData, setStreakData] = useState<api.StudyStreak | null>(null);

  const fetchStreak = async () => {
    try {
      const res = await api.getStudyStreak();
      if (res) {
        setStreakData(res);
      }
    } catch (err) {
      console.warn("No se pudo obtener la racha del servidor:", err);
    }
  };

  useEffect(() => {
    fetchStreak();
  }, [user?.id]);

  const hasActivityToday =
    Boolean(streakData?.practiced_today || streakData?.has_activity_today) ||
    lastActiveDate === todayStr ||
    Boolean(examHistory.completedAt && examHistory.completedAt.slice(0, 10) === todayStr);

  const streakDays = streakData?.current_streak ?? (hasActivityToday ? 1 : 0);
  const isAtRisk = Boolean(streakData?.is_at_risk) || (!hasActivityToday && streakDays > 0);

  // Días de la semana para el tracker (Lunes a Domingo)
  const daysOfWeek = [
    { label: "L", name: "Lunes", dayIndex: 1 },
    { label: "M", name: "Martes", dayIndex: 2 },
    { label: "M", name: "Miércoles", dayIndex: 3 },
    { label: "J", name: "Jueves", dayIndex: 4 },
    { label: "V", name: "Viernes", dayIndex: 5 },
    { label: "S", name: "Sábado", dayIndex: 6 },
    { label: "D", name: "Domingo", dayIndex: 0 },
  ];
  const currentDayIndex = new Date().getDay(); // 0 is Sunday

  const loadRequests = async () => {
    try {
      const res = await api.getFichaRequests();
      if (Array.isArray(res)) setFichaRequests(res);
    } catch (e) {
      console.warn("No se pudieron cargar solicitudes:", e);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const name = user?.name || sessionStorage.getItem("userName") || "Usuario";
  const role = user?.role || sessionStorage.getItem("userRole") || "student";
  const isStudent = role === "student";
  const roleLabel = ROLE_LABELS[role] || "Usuario";
  const program = user?.program || sessionStorage.getItem("userProgram") || "";
  const mainBadgeLabel = isStudent ? (program || "Programa no registrado") : roleLabel;
  const subtitle = isStudent ? "Aprendiz SENA" : (program || "Instructor SENA");
  const activePermissions = PERMISSIONS.filter((permission) => Boolean(user?.permissions?.[permission.key as keyof typeof user.permissions]));

  const enrolledPrograms = user?.enrolledPrograms && user.enrolledPrograms.length > 0
    ? user.enrolledPrograms
    : program ? [program] : [];

  const canSwitchRole = !isStudent && Boolean(
    user?.isDualRole ||
    (user?.availableRoles && user.availableRoles.length > 1) ||
    role === "teacher"
  );

  const handleRoleSwitch = async () => {
    if (isStudent) return;
    setIsSwitchingRole(true);
    setFeedbackMsg("");
    try {
      const nextRole = "APRENDIZ";
      const updated = await api.switchRole(nextRole);
      updateUser(updated);
      setFeedbackMsg(`Rol cambiado con éxito a ${ROLE_LABELS[updated.role] || updated.role}`);
      setTimeout(() => {
        navigate(ROLE_DASHBOARDS[updated.role] || "/dashboard");
      }, 1000);
    } catch {
      setFeedbackMsg("No fue posible cambiar de rol en este momento.");
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleProgramSwitch = async (newProgram: string) => {
    setIsSwitchingProgram(true);
    setFeedbackMsg("");
    try {
      const updated = await api.switchProgram(newProgram);
      updateUser(updated);
      setFeedbackMsg(`Programa activo cambiado exitosamente a: ${newProgram}`);
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch {
      setFeedbackMsg("No fue posible cambiar el programa activo.");
    } finally {
      setIsSwitchingProgram(false);
    }
  };

  const handleRequestFichaEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFicha = newFichaInput.trim();
    if (!cleanFicha) {
      setEnrollError("El número de ficha es obligatorio.");
      return;
    }
    if (!/^\d{4,9}$/.test(cleanFicha)) {
      setEnrollError("El número de ficha debe contener entre 4 y 9 dígitos numéricos.");
      return;
    }

    setIsEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");
    try {
      await api.createFichaRequest(cleanFicha, selectedProgramInput);
      setEnrollSuccess(`Solicitud enviada para ${selectedProgramInput} - Ficha ${cleanFicha}. Queda pendiente de aprobación por el instructor asignado.`);
      setNewFichaInput("");
      loadRequests();
    } catch (err: any) {
      setEnrollError(err?.message || "No se pudo enviar la solicitud de vinculación.");
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-[#39A900]/20 selection:text-[#39A900]">
      {/* ─── Top Header Institucional ─── */}
      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(ROLE_DASHBOARDS[role] || "/dashboard")}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700"
              title="Regresar al panel principal"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">Regresar al panel</span>
            </button>
            <span className="hidden sm:inline-block h-4 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>Worklex SENA</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-800 dark:text-slate-200 font-semibold">Perfil de Usuario</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HeaderActionTools />
            <UserAccountMenu accent={role === "teacher" ? "blue" : role === "superadmin" ? "purple" : "green"} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Banner de retroalimentación dinámico */}
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-sm font-medium shadow-xs"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" strokeWidth={1.75} />
            <span>{feedbackMsg}</span>
          </motion.div>
        )}

        {/* ─── Hero Institucional del Perfil (Standard SaaS Card) ─── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-8"
        >
          {/* Banda decorativa superior con degradado institucional SENA */}
          <div className="h-28 sm:h-32 bg-gradient-to-r from-[#00324D] via-[#004e79] to-[#39A900] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>

          {/* Área principal de Avatar e Información del Usuario */}
          <div className="px-6 sm:px-8 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-12 sm:-mt-14 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                {/* Avatar interactivo */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-900 p-1 shadow-md border-2 border-slate-200/80 dark:border-slate-700 overflow-hidden group cursor-pointer flex-shrink-0 transition-transform hover:scale-[1.02]"
                  title="Haz clic para subir o actualizar tu foto de perfil"
                >
                  <div className="w-full h-full rounded-xl overflow-hidden bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-3xl font-extrabold text-[#39A900]">
                    {editForm.avatar ? (
                      <img src={editForm.avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(name)
                    )}
                  </div>
                  <div className="absolute inset-0 bg-slate-900/60 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold gap-1">
                    <Camera className="w-5 h-5" strokeWidth={1.75} />
                    <span>Cambiar</span>
                  </div>
                </div>

                {/* Títulos y Metadatos */}
                <div className="min-w-0 pt-2 sm:pt-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 rounded-full text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                    <BadgeCheck className="w-3.5 h-3.5 text-[#39A900] flex-shrink-0" strokeWidth={1.75} />
                    <span className="truncate max-w-xs">{mainBadgeLabel}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight truncate">
                    {name}
                  </h1>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {subtitle}
                  </p>
                </div>
              </div>

              {/* Botón de cambio de rol para docentes/admin */}
              {canSwitchRole && (
                <button
                  onClick={handleRoleSwitch}
                  disabled={isSwitchingRole}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-60 cursor-pointer self-start sm:self-end"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSwitchingRole ? "animate-spin" : ""}`} strokeWidth={1.75} />
                  <span>
                    {isSwitchingRole
                      ? "Cambiando rol..."
                      : role === "student"
                      ? "Cambiar a Instructor"
                      : "Cambiar a Aprendiz"}
                  </span>
                </button>
              )}
            </div>

            {/* Fila de métricas rápidas con diseño sobrio y limpio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-5 gap-4 sm:gap-0">
              <div className="flex items-center gap-3 sm:px-4 first:sm:pl-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Mail className="w-4 h-4 text-slate-600 dark:text-slate-300" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Correo institucional</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">{user?.email || "Sin correo registrado"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:px-4">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Phone className="w-4 h-4 text-slate-600 dark:text-slate-300" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Teléfono celular</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">{user?.phoneNum || "No registrado"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:px-4">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <Globe className="w-4 h-4 text-slate-600 dark:text-slate-300" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">País de origen</p>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">{user?.country || "Colombia"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:px-4 last:sm:pr-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-[#39A900] flex-shrink-0">
                  <Shield className="w-4 h-4" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Estado de cuenta</p>
                  <div className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#39A900]" />
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                      {user?.status === "active" ? "Activo" : "Inactivo"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ─── Grid Principal: Formularios a la Izquierda + Métricas a la Derecha ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Columna Principal: Navegación de Pestañas + Formularios (2 Columnas) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Barra de Pestañas Estilo SaaS Segmentado */}
            <div className="flex items-center gap-1 p-1.5 bg-slate-100/90 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-xs overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-900/60"
                }`}
              >
                <Layers className="w-4 h-4" strokeWidth={1.75} />
                <span>Vista Completa</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "edit"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-900/60"
                }`}
              >
                <Edit3 className="w-4 h-4" strokeWidth={1.75} />
                <span>Datos Personales</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("preferences")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "preferences"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-900/60"
                }`}
              >
                <Settings className="w-4 h-4" strokeWidth={1.75} />
                <span>Preferencias</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("fichas")}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "fichas"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-900/60"
                }`}
              >
                <GraduationCap className="w-4 h-4" strokeWidth={1.75} />
                <span>Mis Fichas SENA</span>
              </button>
            </div>

            {/* ─── PESTAÑA 1: FORMULARIO DE DATOS PERSONALES ─── */}
            {(activeTab === "all" || activeTab === "edit") && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-[#39A900]">
                    <UserRound className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Edición de Perfil Institucional</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Actualiza tus nombres, documento de identidad e información de contacto</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Selector / Subida de Foto de Perfil */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Foto de Perfil / Avatar Institucional
                    </label>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200/80 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 text-xl font-bold text-[#39A900] group cursor-pointer shadow-xs"
                        title="Haz clic para seleccionar una foto de tu dispositivo"
                      >
                        {editForm.avatar ? (
                          <img src={editForm.avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(`${editForm.firstName} ${editForm.lastName}` || name)
                        )}
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1">
                          <Camera className="w-4 h-4" strokeWidth={1.75} />
                          <span>Cambiar</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 h-9 px-3.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>{editForm.avatar ? "Cambiar foto" : "Subir foto desde dispositivo"}</span>
                          </button>

                          {editForm.avatar && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                              <span>Quitar foto</span>
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Formatos admitidos: JPG, PNG o WebP. Tamaño máximo: 2 MB. La previsualización se aplica de inmediato.
                        </p>
                      </div>
                    </div>

                    {/* Avatares rápidos predeterminados */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
                        O selecciona un avatar institucional rápido:
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5">
                        {PRESET_AVATARS.map((presetUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPresetAvatar(presetUrl)}
                            className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                              editForm.avatar === presetUrl
                                ? "border-[#39A900] scale-105 shadow-xs ring-2 ring-[#39A900]/30"
                                : "border-slate-200/80 dark:border-slate-700 opacity-75 hover:opacity-100 hover:border-slate-300"
                            }`}
                            title={`Avatar predeterminado ${idx + 1}`}
                          >
                            <img src={presetUrl} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Nombres y Apellidos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Nombres <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={45}
                        value={editForm.firstName}
                        onChange={(e) => handleEditFirstNameChange(e.target.value)}
                        onBlur={handleEditFirstNameBlur}
                        placeholder="Ej. Juan Carlos"
                        className={`h-11 w-full px-3.5 text-sm bg-white dark:bg-slate-800 border rounded-xl outline-none transition-all placeholder:text-slate-400 ${getFieldValidationClass(
                          Boolean(editTouched.firstName),
                          editErrors.firstName,
                          editForm.firstName
                        )} focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900]`}
                      />
                      <FieldError error={editErrors.firstName} isTouched={editTouched.firstName} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Apellidos <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={45}
                        value={editForm.lastName}
                        onChange={(e) => handleEditLastNameChange(e.target.value)}
                        onBlur={handleEditLastNameBlur}
                        placeholder="Ej. Pérez Gómez"
                        className={`h-11 w-full px-3.5 text-sm bg-white dark:bg-slate-800 border rounded-xl outline-none transition-all placeholder:text-slate-400 ${getFieldValidationClass(
                          Boolean(editTouched.lastName),
                          editErrors.lastName,
                          editForm.lastName
                        )} focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900]`}
                      />
                      <FieldError error={editErrors.lastName} isTouched={editTouched.lastName} />
                    </div>
                  </div>

                  {/* Tipo y Número de Documento */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Tipo de Documento <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={editForm.docType}
                        onChange={(e) => handleEditDocTypeChange(e.target.value)}
                        className="h-11 w-full px-3.5 text-sm bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] outline-none text-slate-800 dark:text-slate-200 cursor-pointer transition-all"
                      >
                        <option value="CC">Cédula de Ciudadanía (CC)</option>
                        <option value="TI">Tarjeta de Identidad (TI)</option>
                        <option value="CE">Cédula de Extranjería (CE)</option>
                        <option value="PS">Pasaporte (PS)</option>
                        <option value="OT">Otro Documento (OT)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Número de Documento <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.docNum}
                        onChange={(e) => handleEditDocNumChange(e.target.value)}
                        onBlur={handleEditDocNumBlur}
                        placeholder={isNumericDocType(editForm.docType) ? "Solo dígitos (ej. 1098765432)" : "Alfanumérico"}
                        className={`h-11 w-full px-3.5 text-sm bg-white dark:bg-slate-800 border rounded-xl outline-none transition-all placeholder:text-slate-400 ${getFieldValidationClass(
                          Boolean(editTouched.docNum),
                          editErrors.docNum,
                          editForm.docNum
                        )} focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900]`}
                      />
                      <FieldError error={editErrors.docNum} isTouched={editTouched.docNum} />
                    </div>
                  </div>

                  {/* Correo y Teléfono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Correo Electrónico <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => handleEditEmailChange(e.target.value)}
                        onBlur={handleEditEmailBlur}
                        placeholder="usuario@misena.edu.co"
                        className={`h-11 w-full px-3.5 text-sm bg-white dark:bg-slate-800 border rounded-xl outline-none transition-all placeholder:text-slate-400 ${getFieldValidationClass(
                          Boolean(editTouched.email),
                          editErrors.email,
                          editForm.email
                        )} focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900]`}
                      />
                      <FieldError error={editErrors.email} isTouched={editTouched.email} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Teléfono Celular
                      </label>
                      <input
                        type="tel"
                        value={editForm.phoneNum}
                        onChange={(e) => handleEditPhoneChange(e.target.value)}
                        onBlur={handleEditPhoneBlur}
                        placeholder="Solo números (ej. 3001234567)"
                        className={`h-11 w-full px-3.5 text-sm bg-white dark:bg-slate-800 border rounded-xl outline-none transition-all placeholder:text-slate-400 ${getFieldValidationClass(
                          Boolean(editTouched.phoneNum),
                          editErrors.phoneNum,
                          editForm.phoneNum
                        )} focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900]`}
                      />
                      <FieldError error={editErrors.phoneNum} isTouched={editTouched.phoneNum} />
                    </div>
                  </div>

                  {/* Botón de acción Guardar */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile || !isEditFormValid}
                      className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-[#39A900] hover:bg-[#2e8600] active:scale-[0.99] text-white rounded-xl text-sm font-semibold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando cambios...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" strokeWidth={1.75} />
                          <span>Guardar Cambios de Perfil</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ─── PESTAÑA 2: PREFERENCIAS Y NOTIFICACIONES ─── */}
            {(activeTab === "all" || activeTab === "preferences") && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <Settings className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Preferencias y Notificaciones</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Configura recordatorios de racha, idioma de asistencia y modo visual</p>
                  </div>
                </div>

                <form onSubmit={handleSavePreferences} className="space-y-6">
                  {/* Recordatorios de racha y práctica */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Notificaciones de Racha y Práctica
                    </h3>

                    <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Recordatorios diarios de Racha</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Recibe alertas en la plataforma para no perder tu racha de estudio diaria antes de la medianoche.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.studyReminders}
                        onChange={(e) => setPreferences((p) => ({ ...p, studyReminders: e.target.checked }))}
                        className="w-5 h-5 accent-[#39A900] rounded-md cursor-pointer mt-0.5"
                      />
                    </label>

                    <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-[#00324D] dark:text-sky-400" strokeWidth={1.75} />
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notificaciones por correo electrónico</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Recibe avisos sobre nuevas evaluaciones asignadas, certificaciones y resultados institucionales.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications}
                        onChange={(e) => setPreferences((p) => ({ ...p, emailNotifications: e.target.checked }))}
                        className="w-5 h-5 accent-[#39A900] rounded-md cursor-pointer mt-0.5"
                      />
                    </label>

                    <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Efectos de sonido en evaluaciones</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Reproducir retroalimentación auditiva y confirmaciones en ejercicios de speaking y listening.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.soundEffects}
                        onChange={(e) => setPreferences((p) => ({ ...p, soundEffects: e.target.checked }))}
                        className="w-5 h-5 accent-[#39A900] rounded-md cursor-pointer mt-0.5"
                      />
                    </label>
                  </div>

                  {/* Preferencias de Idioma e Interfaz */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Interfaz y Visualización
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Idioma de Asistencia / Soporte
                        </label>
                        <select
                          value={preferences.supportLanguage}
                          onChange={(e) => setPreferences((p) => ({ ...p, supportLanguage: e.target.value }))}
                          className="h-11 w-full px-3.5 text-sm bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] outline-none text-slate-800 dark:text-slate-200 cursor-pointer transition-all"
                        >
                          <option value="es">Español (Colombia - SENA)</option>
                          <option value="en">English (Instrucciones en inglés)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Modo Visual
                        </label>
                        <select
                          value={preferences.theme}
                          onChange={(e) => setPreferences((p) => ({ ...p, theme: e.target.value }))}
                          className="h-11 w-full px-3.5 text-sm bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] outline-none text-slate-800 dark:text-slate-200 cursor-pointer transition-all"
                        >
                          <option value="system">Automático (Tema del Sistema)</option>
                          <option value="light">Modo Claro Institucional</option>
                          <option value="dark">Modo Oscuro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSavingPreferences}
                      className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-[#39A900] hover:bg-[#2e8600] active:scale-[0.99] text-white rounded-xl text-sm font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      {isSavingPreferences ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando preferencias...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" strokeWidth={1.75} />
                          <span>Guardar Preferencias</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ─── PESTAÑA 3: MIS FICHAS / PROGRAMAS DE FORMACIÓN ─── */}
            {(activeTab === "all" || activeTab === "fichas") && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-[#39A900]">
                      <GraduationCap className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Mis Fichas / Programas de Formación</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Fichas vinculadas para evaluaciones y diccionarios técnicos</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                    {enrolledPrograms.length} {enrolledPrograms.length === 1 ? "Ficha registrada" : "Fichas registradas"}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  Las fichas activadas aquí son las que estarán seleccionadas en tu panel principal y en los diccionarios técnicos especializados.
                </p>

                {/* Lista de programas vinculados */}
                <div className="space-y-2.5 mb-6">
                  {enrolledPrograms.map((prog) => {
                    const isActive = prog === program;
                    return (
                      <div
                        key={prog}
                        className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all ${
                          isActive
                            ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 ring-1 ring-emerald-300/40 dark:ring-emerald-800/40"
                            : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold ${
                              isActive ? "bg-[#39A900] text-white shadow-xs" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                            }`}
                          >
                            <GraduationCap className="w-4 h-4" strokeWidth={1.75} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{prog}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {isActive ? "Programa activo actualmente" : "Programa alterno vinculado"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#39A900]" strokeWidth={1.75} />
                              Activo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleProgramSwitch(prog)}
                              disabled={isSwitchingProgram}
                              className="h-9 px-3.5 text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-xs"
                            >
                              Activar ficha
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Formulario de solicitud en dos pasos */}
                <div className="p-5 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl">
                  <div className="flex items-center gap-2 mb-1.5">
                    <GraduationCap className="w-4 h-4 text-[#39A900]" strokeWidth={1.75} />
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Solicitud de Vinculación a Nueva Ficha SENA
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    Selecciona tu programa de formación e ingresa el código numérico de tu ficha para remitir la solicitud al docente responsable:
                  </p>

                  <form onSubmit={handleRequestFichaEnroll} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                          1. Programa de Formación
                        </label>
                        <select
                          value={selectedProgramInput}
                          onChange={(e) => setSelectedProgramInput(e.target.value)}
                          className="h-11 w-full px-3.5 text-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] outline-none text-slate-900 dark:text-slate-100 font-medium cursor-pointer transition-all"
                        >
                          {SENA_OFFICIAL_PROGRAMS.map((progName) => (
                            <option key={progName} value={progName}>
                              {progName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                          2. Número de Ficha
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          required
                          placeholder="Código numérico (ej. 2670142)"
                          value={newFichaInput}
                          onChange={(e) => {
                            setNewFichaInput(e.target.value.replace(/\D/g, ""));
                            setEnrollError("");
                            setEnrollSuccess("");
                          }}
                          className="h-11 w-full px-3.5 text-xs bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] outline-none text-slate-900 dark:text-slate-100 font-medium transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={isEnrolling || !newFichaInput.trim()}
                        className="inline-flex items-center gap-1.5 h-10 px-4 bg-[#39A900] hover:bg-[#2e8600] text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {isEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />}
                        <span>Enviar Solicitud al Docente</span>
                      </button>
                    </div>
                  </form>

                  {enrollError && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 mt-2.5 font-medium flex items-center gap-1">
                      <span>•</span> {enrollError}
                    </p>
                  )}
                  {enrollSuccess && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2.5 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#39A900]" />
                      <span>{enrollSuccess}</span>
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Columna Derecha: Tarjeta de Racha de Estudio + Resumen de Pruebas CEFR (1 Columna) */}
          <div className="space-y-6">
            {/* ─── MÓDULO DE RACHA DE ESTUDIO (STREAK ENGINE) 🔥 ─── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden"
            >
              {/* Resplandor decorativo sutil en esquina */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0">
                    <Flame className="w-5 h-5 fill-amber-500 text-amber-500" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">Racha de Estudio</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Progreso y constancia diaria</p>
                  </div>
                </div>

                {/* Badge de estado de racha */}
                {hasActivityToday ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-[#39A900]" />
                    <span>Asegurada hoy</span>
                  </span>
                ) : isAtRisk ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold animate-pulse">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>En riesgo hoy</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Inactiva hoy</span>
                  </span>
                )}
              </div>

              {/* Contador de días de racha */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/30 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-900/10 border border-amber-200/70 dark:border-amber-800/60 mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
                    {streakDays}
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {streakDays === 1 ? "día consecutivo" : "días consecutivos"}
                  </span>
                </div>
                <p className="text-xs text-amber-950/80 dark:text-amber-200/80 leading-relaxed font-medium">
                  {streakDays >= 5
                    ? "¡Imparable! Estás construyendo un hábito extraordinario en inglés técnico SENA."
                    : streakDays >= 1
                    ? "¡Gran disciplina! La constancia diaria es la clave para certificar tu nivel B2."
                    : "¡Enciende tu racha hoy! Una práctica al día marca la diferencia."}
                </p>
              </div>

              {/* Indicador de los 7 días de la semana */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2.5">
                  <span>Semana actual</span>
                  <span className="text-slate-700 dark:text-slate-300">Meta: 1 práctica diaria</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {(streakData?.weekly_activity && streakData.weekly_activity.length === 7
                    ? streakData.weekly_activity
                    : daysOfWeek.map((day, idx) => ({
                        day: day.label,
                        day_name: day.name,
                        date: "",
                        active: hasActivityToday && day.dayIndex === currentDayIndex,
                        is_today: day.dayIndex === currentDayIndex,
                        is_past: currentDayIndex === 0 ? idx < 6 : day.dayIndex < currentDayIndex && day.dayIndex !== 0,
                      }))
                  ).map((item, idx) => {
                    const isToday = item.is_today;
                    const isActive = item.active;

                    let statusClass = "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700";
                    if (isToday) {
                      statusClass = hasActivityToday || isActive
                        ? "bg-[#39A900] text-white border-[#39A900] shadow-xs"
                        : "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-400 ring-2 ring-amber-300/50";
                    } else if (isActive) {
                      statusClass = "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700";
                    }

                    return (
                      <div key={item.day + idx} className="flex flex-col items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.day}</span>
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl border flex items-center justify-center text-[10px] font-bold transition-all ${statusClass}`}
                          title={`${item.day_name}${item.date ? ` (${item.date})` : ""}${isToday ? " (Hoy)" : ""}: ${isActive || (isToday && hasActivityToday) ? "Práctica completada" : (isToday ? "Pendiente hoy" : "Sin actividad")}`}
                        >
                          {isToday ? (
                            hasActivityToday || isActive ? (
                              <Check className="w-3.5 h-3.5 stroke-2" />
                            ) : (
                              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            )
                          ) : isActive ? (
                            <Check className="w-3.5 h-3.5 stroke-2" />
                          ) : (
                            "•"
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Caja informativa de regla de racha */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl mb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                <p className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <span>
                    <strong className="text-slate-900 dark:text-slate-200">Cómo mantener tu racha:</strong> Completa al menos una práctica o quiz antes de la medianoche.
                  </span>
                </p>
              </div>

              {/* Botón de acción para salvar o continuar la racha */}
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.recordStreakActivity("ACCESO_PRACTICA");
                  } catch {}
                  navigate("/quiz");
                }}
                className={`w-full h-11 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                  hasActivityToday
                    ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20 shadow-md"
                }`}
              >
                <Zap className="w-3.5 h-3.5" strokeWidth={1.75} />
                <span>{hasActivityToday ? "Continuar practicando hoy" : "Salvar mi racha (Practicar ahora)"}</span>
              </button>
            </motion.div>

            {/* ─── RESUMEN DE PRUEBAS CEFR REALES ─── */}
            {isStudent && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6"
              >
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#00324D]/10 dark:bg-sky-950/60 border border-[#00324D]/15 dark:border-sky-800/60 rounded-xl flex items-center justify-center text-[#00324D] dark:text-sky-400 flex-shrink-0">
                      <ClipboardList className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">Resumen de Pruebas</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Diagnóstico CEFR y métricas</p>
                    </div>
                  </div>
                  {examHistory.hasAttempt && (
                    <button
                      type="button"
                      onClick={() => navigate("/results")}
                      className="text-xs font-semibold text-[#00324D] dark:text-sky-400 hover:underline cursor-pointer"
                    >
                      Ver detalles
                    </button>
                  )}
                </div>

                {examHistory.isLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-[#00324D] dark:text-sky-400" />
                    <span className="text-xs">Cargando métricas de pruebas...</span>
                  </div>
                ) : examHistory.hasAttempt && examHistory.lastScore !== null ? (
                  <div className="space-y-4">
                    {/* Tarjeta de Última Calificación */}
                    <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Última calificación</span>
                        <span className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{examHistory.lastScore}%</span>
                      </div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          examHistory.lastScore >= 60
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        {examHistory.lastScore >= 60 ? "Aprobado" : "Por reforzar"}
                      </span>
                    </div>

                    {/* Grid de 4 Métricas Reales */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Total Pruebas</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {examHistory.totalExams ? `${examHistory.totalExams} realizadas` : "1 realizada"}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Promedio General</span>
                        <span className="text-sm font-bold text-[#00324D] dark:text-sky-400">
                          {examHistory.avgScore !== null ? `${examHistory.avgScore}%` : `${examHistory.lastScore}%`}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Nivel Actual CEFR</span>
                        <span className="text-sm font-bold text-[#39A900]">
                          {examHistory.currentLevel || "A1"}
                        </span>
                      </div>
                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">Tiempo Promedio</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {examHistory.avgDuration || "Adaptativo"}
                        </span>
                      </div>
                    </div>

                    {examHistory.completedAt && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                        <span>Última evaluación: {formatDate(examHistory.completedAt)}</span>
                      </div>
                    )}

                    <div className="pt-2 flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => navigate("/results")}
                        className="flex-1 h-10 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer text-center"
                      >
                        Ver Resultados
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/quiz")}
                        className="flex-1 h-10 text-xs font-semibold rounded-xl bg-[#39A900] hover:bg-[#2e8600] text-white transition-colors cursor-pointer text-center shadow-xs"
                      >
                        Nueva Prueba
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 px-3 text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                      <Award className="w-6 h-6" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">
                      Sin pruebas realizadas
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                      Aún no has presentado tu primera prueba diagnóstica en Worklex SENA.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/quiz")}
                      className="inline-flex items-center gap-2 h-10 px-4 bg-[#39A900] hover:bg-[#2e8600] text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Comenzar Examen</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProfilePage;
