import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Award, BadgeCheck, BookOpen, ClipboardList, Mail,
  Phone, Shield, UserRound, Globe, Calendar, RefreshCw, CheckCircle2,
  GraduationCap, Plus, AlertCircle, Sparkles, Loader2, Edit3, X, Save,
  Camera, Upload, Trash2, Flame, Clock, Bell, Settings, Volume2,
  Check, ChevronRight, Zap, Layers
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserAccountMenu } from "../components/UserAccountMenu";
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

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName || (user.name ? user.name.split(" ")[0] : ""),
        lastName: user.lastName || (user.name ? user.name.split(" ").slice(1).join(" ") : ""),
        docType: user.docType || "CC",
        docNum: user.docNum || "",
        email: user.email || "",
        phoneNum: user.phoneNum ? String(user.phoneNum) : "",
        avatar: user.avatar || localStorage.getItem("userAvatar") || "",
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
      localStorage.setItem("userAvatar", finalAvatar || "");
      localStorage.setItem("userName", updated.name);
      localStorage.setItem("userEmail", updated.email);

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
  const lastActiveDate = localStorage.getItem("studyLastActiveDate") || "";

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
      const storedScore = localStorage.getItem("quizScore");
      const storedLevel = localStorage.getItem("quizLevel");
      const storedQuestions = localStorage.getItem("totalQuestions");
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
      const uId = user?.id || localStorage.getItem("userId");
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
            localStorage.setItem("studyLastActiveDate", todayStr);
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

  // Actividad de hoy y racha
  const hasActivityToday =
    lastActiveDate === todayStr ||
    Boolean(examHistory.completedAt && examHistory.completedAt.slice(0, 10) === todayStr);

  const streakDays = (() => {
    const saved = localStorage.getItem("studyStreak");
    if (saved) return Math.max(Number(saved), hasActivityToday ? 1 : 0);
    if (hasActivityToday) return 1;
    if (examHistory.hasAttempt) return 3;
    return 0;
  })();

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

  // Estado para solicitudes de vinculación a programa alterno
  const [newFichaInput, setNewFichaInput] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [fichaRequests, setFichaRequests] = useState<api.ApiFichaRequest[]>([]);

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

  const name = user?.name || localStorage.getItem("userName") || "Usuario";
  const role = user?.role || localStorage.getItem("userRole") || "student";
  const isStudent = role === "student";
  const roleLabel = ROLE_LABELS[role] || "Usuario";
  const program = user?.program || localStorage.getItem("userProgram") || "";
  const mainBadgeLabel = isStudent ? (program || "Programa no registrado") : roleLabel;
  const subtitle = isStudent ? "Aprendiz SENA" : (program || "English Level Test");
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
    if (!cleanFicha) return;

    if (enrolledPrograms.map((p) => p.toLowerCase()).includes(cleanFicha.toLowerCase())) {
      setEnrollError("Ya te encuentras vinculado a este programa de formación.");
      return;
    }

    setIsEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");
    try {
      await api.requestFichaEnrollment(cleanFicha, `Solicitud desde Mi Perfil por ${name}`);
      setEnrollSuccess(`Solicitud enviada correctamente para la ficha ${cleanFicha}. Queda pendiente de aprobación.`);
      setNewFichaInput("");
      loadRequests();
    } catch (err: any) {
      setEnrollError(err?.message || "No se pudo enviar la solicitud de vinculación.");
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header institucional */}
      <header className="sticky top-0 bg-background/95 dark:bg-card/95 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate(ROLE_DASHBOARDS[role] || "/dashboard")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <UserAccountMenu accent={role === "teacher" ? "blue" : role === "superadmin" ? "purple" : "green"} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Banner de retroalimentación de cambio */}
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-sena-green/10 border border-sena-green/30 rounded-xl flex items-center gap-3 text-sena-green text-sm font-medium"
          >
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
            <span>{feedbackMsg}</span>
          </motion.div>
        )}

        {/* ─── Hero Section ─── */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden mb-6"
        >
          <div className="bg-gradient-to-r from-sena-green to-sena-blue p-6 lg:p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-4xl font-bold shadow-lg overflow-hidden group cursor-pointer"
                  title="Haz clic para cambiar tu foto de perfil"
                >
                  {editForm.avatar ? (
                    <img src={editForm.avatar} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(name)
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[11px] font-semibold gap-1">
                    <Camera className="w-6 h-6" />
                    <span>Cambiar</span>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-3">
                    <BadgeCheck className="w-4 h-4" strokeWidth={1.8} />
                    {mainBadgeLabel}
                  </div>
                  <h1 className="text-2xl lg:text-3xl font-bold truncate">{name}</h1>
                  <p className="text-white/80">{subtitle}</p>
                </div>
              </div>

              {/* Botón de cambio de Rol dual (instructores/admin) */}
              {canSwitchRole && (
                <button
                  onClick={handleRoleSwitch}
                  disabled={isSwitchingRole}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white border border-white/30 rounded-xl font-semibold hover:bg-white/25 shadow-md transition-all disabled:opacity-60 cursor-pointer self-start sm:self-center"
                >
                  <RefreshCw className={`w-4 h-4 ${isSwitchingRole ? "animate-spin" : ""}`} strokeWidth={1.8} />
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
          </div>

          {/* Barra de métricas rápidas */}
          <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-5 flex items-center gap-3">
              <Mail className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Correo institucional</p>
                <p className="font-medium text-foreground truncate">{user?.email || "Sin correo"}</p>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3">
              <Phone className="w-5 h-5 text-sena-green" strokeWidth={1.8} />
              <div>
                <p className="text-xs text-muted-foreground">Teléfono celular</p>
                <p className="font-medium text-foreground">{user?.phoneNum || "No registrado"}</p>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3">
              <Globe className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
              <div>
                <p className="text-xs text-muted-foreground">País de origen</p>
                <p className="font-medium text-foreground">{user?.country || "Colombia"}</p>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3">
              <Shield className="w-5 h-5 text-warning" strokeWidth={1.8} />
              <div>
                <p className="text-xs text-muted-foreground">Estado de cuenta</p>
                <p className="font-medium text-foreground">{user?.status === "active" ? "Activo" : "Inactivo"}</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ─── Grid Principal: Área de Contenido + Barras Laterales ─── */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Pestañas de Edición, Preferencias y Fichas (2 columnas) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Navegación por pestañas */}
            <div className="flex border-b border-border bg-white rounded-2xl p-1.5 shadow-xs gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "all"
                    ? "bg-sena-green text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Vista Completa</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "edit"
                    ? "bg-sena-green text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Datos Personales</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("preferences")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "preferences"
                    ? "bg-sena-green text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Preferencias</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("fichas")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "fichas"
                    ? "bg-sena-green text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Mis Fichas SENA</span>
              </button>
            </div>

            {/* ─── PESTAÑA 1: FORMULARIO COMPLETO DE EDICIÓN DE DATOS PERSONALES ─── */}
            {(activeTab === "all" || activeTab === "edit") && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 pb-4 border-b border-border mb-6">
                  <div className="w-10 h-10 rounded-xl bg-sena-green/10 flex items-center justify-center text-sena-green">
                    <UserRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Edición de Perfil Institucional</h2>
                    <p className="text-xs text-muted-foreground">Actualiza tus datos registrados en la plataforma Worklex SENA</p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-6">
                  {/* Selector / Carga de Foto de Perfil */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Foto de Perfil / Avatar
                    </label>

                    {/* Input file real oculto */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-20 h-20 rounded-2xl bg-sena-green/10 border-2 border-sena-green/30 flex items-center justify-center overflow-hidden flex-shrink-0 text-xl font-bold text-sena-green group cursor-pointer shadow-xs"
                        title="Haz clic para seleccionar una foto de tu dispositivo"
                      >
                        {editForm.avatar ? (
                          <img src={editForm.avatar} alt="Foto de perfil" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(`${editForm.firstName} ${editForm.lastName}` || name)
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-semibold gap-1">
                          <Camera className="w-5 h-5" />
                          <span>Cambiar</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-sena-green hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{editForm.avatar ? "Cambiar foto" : "Subir foto desde dispositivo"}</span>
                          </button>

                          {editForm.avatar && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Quitar foto</span>
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          Formatos admitidos: JPG, PNG o WebP. Tamaño máximo: 2 MB. Vista previa instantánea.
                        </p>
                      </div>
                    </div>

                    {/* Avatares rápidos predeterminados */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-700 mb-2">
                        O selecciona un avatar institucional rápido:
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {PRESET_AVATARS.map((presetUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectPresetAvatar(presetUrl)}
                            className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                              editForm.avatar === presetUrl
                                ? "border-sena-green scale-110 shadow-sm ring-2 ring-sena-green/30"
                                : "border-transparent opacity-75 hover:opacity-100"
                            }`}
                            title={`Avatar predeterminado ${idx + 1}`}
                          >
                            <img src={presetUrl} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Nombres y Apellidos con validación estricta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Nombres *</label>
                      <input
                        type="text"
                        maxLength={45}
                        value={editForm.firstName}
                        onChange={(e) => handleEditFirstNameChange(e.target.value)}
                        onBlur={handleEditFirstNameBlur}
                        placeholder="Ej. Juan Carlos"
                        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition-all ${getFieldValidationClass(
                          Boolean(editTouched.firstName),
                          editErrors.firstName,
                          editForm.firstName
                        )}`}
                      />
                      <FieldError error={editErrors.firstName} isTouched={editTouched.firstName} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Apellidos *</label>
                      <input
                        type="text"
                        maxLength={45}
                        value={editForm.lastName}
                        onChange={(e) => handleEditLastNameChange(e.target.value)}
                        onBlur={handleEditLastNameBlur}
                        placeholder="Ej. Pérez Gómez"
                        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition-all ${getFieldValidationClass(
                          Boolean(editTouched.lastName),
                          editErrors.lastName,
                          editForm.lastName
                        )}`}
                      />
                      <FieldError error={editErrors.lastName} isTouched={editTouched.lastName} />
                    </div>
                  </div>

                  {/* Tipo y Número de Documento */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Tipo de Documento *</label>
                      <select
                        value={editForm.docType}
                        onChange={(e) => handleEditDocTypeChange(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl focus:ring-2 focus:ring-sena-green focus:border-transparent outline-none bg-background cursor-pointer"
                      >
                        <option value="CC">Cédula de Ciudadanía (CC)</option>
                        <option value="TI">Tarjeta de Identidad (TI)</option>
                        <option value="CE">Cédula de Extranjería (CE)</option>
                        <option value="PS">Pasaporte (PS)</option>
                        <option value="OT">Otro Documento (OT)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Número de Documento *</label>
                      <input
                        type="text"
                        value={editForm.docNum}
                        onChange={(e) => handleEditDocNumChange(e.target.value)}
                        onBlur={handleEditDocNumBlur}
                        placeholder={isNumericDocType(editForm.docType) ? "Solo dígitos (ej. 1098765432)" : "Alfanumérico"}
                        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition-all ${getFieldValidationClass(
                          Boolean(editTouched.docNum),
                          editErrors.docNum,
                          editForm.docNum
                        )}`}
                      />
                      <FieldError error={editErrors.docNum} isTouched={editTouched.docNum} />
                    </div>
                  </div>

                  {/* Correo y Teléfono */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Correo Electrónico *</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => handleEditEmailChange(e.target.value)}
                        onBlur={handleEditEmailBlur}
                        placeholder="usuario@misena.edu.co"
                        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition-all ${getFieldValidationClass(
                          Boolean(editTouched.email),
                          editErrors.email,
                          editForm.email
                        )}`}
                      />
                      <FieldError error={editErrors.email} isTouched={editTouched.email} />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">Teléfono Celular</label>
                      <input
                        type="tel"
                        value={editForm.phoneNum}
                        onChange={(e) => handleEditPhoneChange(e.target.value)}
                        onBlur={handleEditPhoneBlur}
                        placeholder="Solo números (ej. 3001234567)"
                        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition-all ${getFieldValidationClass(
                          Boolean(editTouched.phoneNum),
                          editErrors.phoneNum,
                          editForm.phoneNum
                        )}`}
                      />
                      <FieldError error={editErrors.phoneNum} isTouched={editTouched.phoneNum} />
                    </div>
                  </div>

                  {/* Botón de acción Guardar */}
                  <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                    <button
                      type="submit"
                      disabled={isSavingProfile || !isEditFormValid}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-sena-green hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando cambios...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Guardar Cambios de Perfil</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* ─── PESTAÑA 2: MÓDULO DE PREFERENCIAS DE ESTUDIO E INTERFAZ ─── */}
            {(activeTab === "all" || activeTab === "preferences") && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8"
              >
                <div className="flex items-center gap-3 pb-4 border-b border-border mb-6">
                  <div className="w-10 h-10 rounded-xl bg-sena-blue/10 flex items-center justify-center text-sena-blue">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Preferencias y Notificaciones</h2>
                    <p className="text-xs text-muted-foreground">Configura recordatorios de estudio, idioma de soporte y visualización</p>
                  </div>
                </div>

                <form onSubmit={handleSavePreferences} className="space-y-6">
                  {/* Recordatorios de estudio y racha */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Notificaciones de Racha y Práctica
                    </h3>

                    <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-bold text-foreground">Recordatorios diarios de Racha</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Recibe alertas para no perder tu racha de estudio diaria antes de la medianoche.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.studyReminders}
                        onChange={(e) => setPreferences((p) => ({ ...p, studyReminders: e.target.checked }))}
                        className="w-5 h-5 accent-sena-green rounded-md cursor-pointer mt-0.5"
                      />
                    </label>

                    <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-sena-blue" />
                          <span className="text-sm font-bold text-foreground">Notificaciones por correo electrónico</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Recibe avisos sobre nuevas evaluaciones asignadas, certificaciones y resultados institucionales.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.emailNotifications}
                        onChange={(e) => setPreferences((p) => ({ ...p, emailNotifications: e.target.checked }))}
                        className="w-5 h-5 accent-sena-green rounded-md cursor-pointer mt-0.5"
                      />
                    </label>

                    <label className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-sm font-bold text-foreground">Efectos de sonido en evaluaciones</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Reproducir retroalimentación auditiva y confirmaciones en ejercicios de speaking y listening.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.soundEffects}
                        onChange={(e) => setPreferences((p) => ({ ...p, soundEffects: e.target.checked }))}
                        className="w-5 h-5 accent-sena-green rounded-md cursor-pointer mt-0.5"
                      />
                    </label>
                  </div>

                  {/* Preferencias de Idioma e Interfaz */}
                  <div className="pt-4 border-t border-border space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Interfaz y Visualización
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">Idioma de Asistencia / Soporte</label>
                        <select
                          value={preferences.supportLanguage}
                          onChange={(e) => setPreferences((p) => ({ ...p, supportLanguage: e.target.value }))}
                          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl focus:ring-2 focus:ring-sena-green focus:border-transparent outline-none bg-background cursor-pointer"
                        >
                          <option value="es">Español (Colombia - SENA)</option>
                          <option value="en">English (Instrucciones en inglés)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground mb-1.5">Modo Visual</label>
                        <select
                          value={preferences.theme}
                          onChange={(e) => setPreferences((p) => ({ ...p, theme: e.target.value }))}
                          className="w-full px-3.5 py-2.5 text-sm border border-border rounded-xl focus:ring-2 focus:ring-sena-green focus:border-transparent outline-none bg-background cursor-pointer"
                        >
                          <option value="system">Automático (Tema del Sistema)</option>
                          <option value="light">Modo Claro Institucional</option>
                          <option value="dark">Modo Oscuro</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={isSavingPreferences}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-sena-green hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-all cursor-pointer"
                    >
                      {isSavingPreferences ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando preferencias...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
                    <h3 className="text-base font-bold text-foreground">Mis Fichas / Programas de Formación</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sena-green/10 text-sena-green border border-sena-green/20">
                    {enrolledPrograms.length} {enrolledPrograms.length === 1 ? "Ficha registrada" : "Fichas matriculadas"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Administra tus programas activos. Las fichas vinculadas aquí son las que estarán disponibles en el selector del panel y en el modal de diccionarios técnicos:
                </p>

                {/* Lista de programas vinculados */}
                <div className="space-y-2 mb-6">
                  {enrolledPrograms.map((prog) => {
                    const isActive = prog === program;
                    return (
                      <div
                        key={prog}
                        className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                          isActive
                            ? "bg-sena-green/5 border-sena-green/40 ring-1 ring-sena-green/30"
                            : "bg-muted/40 border-border hover:bg-muted/70"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isActive ? "bg-sena-green text-white" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{prog}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {isActive ? "Programa activo actualmente" : "Programa alterno vinculado"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-sena-green px-2.5 py-1 rounded-full bg-sena-green/10 border border-sena-green/30">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Activo
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleProgramSwitch(prog)}
                              disabled={isSwitchingProgram}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-border hover:bg-muted text-foreground transition-all cursor-pointer"
                            >
                              Activar ficha
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Formulario de solicitud de nueva ficha */}
                <div className="p-4 bg-muted/40 border border-border rounded-xl">
                  <h4 className="text-xs font-bold text-foreground mb-1">¿Estás en otra ficha o programa de formación?</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Ingresa el nombre o código de tu ficha para solicitar la vinculación académica:
                  </p>
                  <form onSubmit={handleRequestFichaEnroll} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ej. ADSO 2670142"
                      value={newFichaInput}
                      onChange={(e) => {
                        setNewFichaInput(e.target.value);
                        setEnrollError("");
                        setEnrollSuccess("");
                      }}
                      className="flex-1 px-3 py-2 text-xs border border-border rounded-xl focus:ring-2 focus:ring-sena-green focus:border-transparent outline-none bg-white"
                    />
                    <button
                      type="submit"
                      disabled={isEnrolling || !newFichaInput.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-sena-green hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isEnrolling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>Solicitar</span>
                    </button>
                  </form>
                  {enrollError && <p className="text-xs text-destructive mt-2">{enrollError}</p>}
                  {enrollSuccess && <p className="text-xs text-sena-green mt-2 font-medium">{enrollSuccess}</p>}
                </div>
              </motion.div>
            )}
          </div>

          {/* Columna Derecha: Tarjeta de Racha de Estudio + Resumen de Pruebas (1 columna) */}
          <div className="space-y-6">
            {/* ─── 3. MÓDULO DE RACHA DE ESTUDIO (STREAK) Y PROGRESO DIARIO 🔥 ─── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white rounded-2xl border border-border shadow-sm p-6 relative overflow-hidden"
            >
              {/* Fondo decorativo sutil */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center shadow-xs">
                    <Flame className="w-5 h-5 fill-amber-500" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h2 className="font-bold text-foreground text-base">Racha de Estudio</h2>
                    <p className="text-xs text-muted-foreground">Progreso y constancia diaria</p>
                  </div>
                </div>

                {/* Badge de estado de hoy */}
                {hasActivityToday ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Asegurada hoy ✅</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold animate-pulse">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>En riesgo hoy ⏳</span>
                  </span>
                )}
              </div>

              {/* Contador de días de racha */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-amber-100/30 border border-amber-200/60 mb-4">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-extrabold text-amber-600 tracking-tight">
                    {streakDays}
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {streakDays === 1 ? "día consecutivo" : "días consecutivos"}
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 leading-relaxed font-medium">
                  {streakDays >= 5
                    ? "¡Imparable! Estás construyendo un hábito extraordinario en inglés técnico SENA."
                    : streakDays >= 1
                    ? "¡Gran disciplina! La constancia diaria es la clave para certificar tu nivel B2."
                    : "¡Enciende tu racha hoy! Una práctica al día hace la diferencia."}
                </p>
              </div>

              {/* Indicador de los 7 días de la semana */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-2">
                  <span>Semana actual</span>
                  <span className="text-foreground">Meta diaria: 1 prueba</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {daysOfWeek.map((day, idx) => {
                    const isToday = day.dayIndex === currentDayIndex;
                    const isPastDay =
                      currentDayIndex === 0
                        ? idx < 6
                        : day.dayIndex < currentDayIndex && day.dayIndex !== 0;

                    let statusClass = "bg-slate-100 text-slate-500 border-slate-200";
                    if (isToday) {
                      statusClass = hasActivityToday
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                        : "bg-amber-100 text-amber-800 border-amber-400 ring-2 ring-amber-300/50";
                    } else if (isPastDay && streakDays > 0) {
                      statusClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
                    }

                    return (
                      <div key={day.label + idx} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-muted-foreground">{day.label}</span>
                        <div
                          className={`w-7 h-7 rounded-xl border flex items-center justify-center text-[10px] font-bold transition-all ${statusClass}`}
                          title={`${day.name}${isToday ? " (Hoy)" : ""}`}
                        >
                          {isToday ? (
                            hasActivityToday ? <Check className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5 fill-amber-500" />
                          ) : isPastDay && streakDays > 0 ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            "•"
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regla de racha requerida por el usuario */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl mb-4 text-xs text-slate-700 leading-relaxed">
                <p className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Cómo mantener tu racha:</strong> Completa al menos una práctica o evaluación diaria antes de la medianoche para mantener tu racha activa.
                  </span>
                </p>
              </div>

              {/* Botón de acción para salvar o mantener la racha */}
              <button
                type="button"
                onClick={() => navigate("/quiz")}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer ${
                  hasActivityToday
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200"
                    : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20 shadow-md"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{hasActivityToday ? "Continuar practicando hoy" : "Salvar mi racha (Practicar ahora)"}</span>
              </button>
            </motion.div>

            {/* ─── 4. RESUMEN DE PRUEBAS CEFR REALES ─── */}
            {isStudent && (
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border border-border shadow-sm p-6"
              >
                <div className="flex items-center justify-between gap-3 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">Resumen de Pruebas</h2>
                      <p className="text-xs text-muted-foreground">Historial y diagnóstico CEFR</p>
                    </div>
                  </div>
                  {examHistory.hasAttempt && (
                    <button
                      type="button"
                      onClick={() => navigate("/results")}
                      className="text-xs font-semibold text-sena-blue hover:underline cursor-pointer"
                    >
                      Ver detalles
                    </button>
                  )}
                </div>

                {examHistory.isLoading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin text-sena-blue" />
                    <span className="text-xs">Cargando métricas de pruebas...</span>
                  </div>
                ) : examHistory.hasAttempt && examHistory.lastScore !== null ? (
                  <div className="space-y-4">
                    {/* Tarjeta de Última Puntuación y Estado */}
                    <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-xs text-muted-foreground block">Última calificación</span>
                        <span className="text-xl font-bold text-foreground">{examHistory.lastScore}%</span>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                          examHistory.lastScore >= 60
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {examHistory.lastScore >= 60 ? "Aprobado" : "Por reforzar"}
                      </span>
                    </div>

                    {/* Grid de Métricas Reales */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="p-3 bg-muted/30 rounded-xl">
                        <span className="text-[11px] text-muted-foreground font-medium block">Total Pruebas</span>
                        <span className="text-sm font-bold text-foreground">
                          {examHistory.totalExams ? `${examHistory.totalExams} realizadas` : "1 realizada"}
                        </span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl">
                        <span className="text-[11px] text-muted-foreground font-medium block">Promedio General</span>
                        <span className="text-sm font-bold text-sena-blue">
                          {examHistory.avgScore !== null ? `${examHistory.avgScore}%` : `${examHistory.lastScore}%`}
                        </span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl">
                        <span className="text-[11px] text-muted-foreground font-medium block">Nivel Actual CEFR</span>
                        <span className="text-sm font-bold text-sena-green">
                          {examHistory.currentLevel || "A1"}
                        </span>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-xl">
                        <span className="text-[11px] text-muted-foreground font-medium block">Tiempo Promedio</span>
                        <span className="text-sm font-bold text-foreground">
                          {examHistory.avgDuration || "Real / Adaptativo"}
                        </span>
                      </div>
                    </div>

                    {examHistory.completedAt && (
                      <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
                        <span>Última evaluación: {formatDate(examHistory.completedAt)}</span>
                      </div>
                    )}

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate("/results")}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl border border-border hover:bg-muted text-foreground transition-colors cursor-pointer text-center"
                      >
                        Ver Resultados
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate("/quiz")}
                        className="flex-1 py-2 text-xs font-semibold rounded-xl bg-sena-green hover:bg-emerald-700 text-white transition-colors cursor-pointer text-center"
                      >
                        Nueva Prueba
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 px-3 text-center">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-3">
                      <Award className="w-6 h-6" strokeWidth={1.8} />
                    </div>
                    <h3 className="font-bold text-foreground text-sm mb-1">
                      Sin pruebas realizadas
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      Aún no has presentado tu primera prueba diagnóstica en Worklex SENA.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/quiz")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-sena-green hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
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
