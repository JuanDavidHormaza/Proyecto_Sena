import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  ArrowLeft, Award, BadgeCheck, BookOpen, ClipboardList, Mail,
  Phone, Shield, UserRound, Globe, Calendar, RefreshCw, CheckCircle2,
  GraduationCap, Plus, AlertCircle, Sparkles, Loader2, Edit3, X, Save,
  Camera, Upload, Trash2
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

  // Estado para edición completa de perfil
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

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
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.warning("Formato no compatible. Por favor sube una imagen en formato JPG, PNG o WebP.", "Formato Inválido");
      return;
    }

    const MAX_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB
    if (file.size > MAX_SIZE_BYTES) {
      toast.warning("La imagen seleccionada supera el límite máximo de 3 MB.", "Archivo muy pesado");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setEditForm((prev) => ({ ...prev, avatar: dataUrl }));
        setSelectedAvatarFile(file);
        toast.success("Foto seleccionada. Recuerda guardar los cambios para aplicarla a tu perfil.", "Vista previa lista");
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

  const [editErrors, setEditErrors] = useState<{
    firstName?: string | null;
    lastName?: string | null;
    docNum?: string | null;
    email?: string | null;
  }>({});
  const [editTouched, setEditTouched] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    docNum?: boolean;
    email?: boolean;
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

  const isEditFormValid =
    Boolean(editForm.firstName.trim()) &&
    Boolean(editForm.lastName.trim()) &&
    Boolean(editForm.docNum.trim()) &&
    Boolean(editForm.email.trim()) &&
    !editErrors.firstName &&
    !editErrors.lastName &&
    !editErrors.docNum &&
    !editErrors.email;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const vFirstName = validateName(editForm.firstName, "Nombres");
    const vLastName = validateName(editForm.lastName, "Apellidos");
    const vDoc = validateDocumentNumber(editForm.docNum, editForm.docType);
    const vEmail = validateEmail(editForm.email);

    setEditErrors({
      firstName: vFirstName.error,
      lastName: vLastName.error,
      docNum: vDoc.error,
      email: vEmail.error,
    });
    setEditTouched({ firstName: true, lastName: true, docNum: true, email: true });

    if (!vFirstName.isValid || !vLastName.isValid || !vDoc.isValid || !vEmail.isValid) {
      toast.warning("Por favor corrige los campos con errores antes de guardar.", "Campos Inválidos");
      return;
    }

    setIsSavingProfile(true);
    try {
      let finalAvatar = editForm.avatar;

      // Si se seleccionó un archivo nuevo, intentar subirlo al almacenamiento de media
      if (selectedAvatarFile) {
        try {
          const uploadRes = await api.uploadMediaFile(selectedAvatarFile, "dictionary-images");
          if (uploadRes?.url || uploadRes?.proxy_url) {
            finalAvatar = uploadRes.url || uploadRes.proxy_url;
          }
        } catch (uploadErr) {
          console.warn("Subida a almacenamiento no completada, conservando Base64 para avatar:", uploadErr);
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
      toast.success("Perfil institucional actualizado con éxito en la plataforma.", "Cambios Guardados");
      setShowEditModal(false);
      setSelectedAvatarFile(null);
    } catch (err: any) {
      toast.error(err?.message || "No se pudo actualizar la información de perfil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Estado para solicitudes de vinculación a programa alterno
  const [newFichaInput, setNewFichaInput] = useState("");
  const [newProgramInput, setNewProgramInput] = useState("Análisis y Desarrollo de Software (ADSO)");
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
  // ─── Resumen de Pruebas: Conexión con historial y último intento ─────────────
  const [examHistory, setExamHistory] = useState<{
    lastScore: number | null;
    currentLevel: string | null;
    totalQuestions: number | null;
    correctAnswers: number | null;
    completedAt: string | null;
    hasAttempt: boolean;
    isLoading: boolean;
  }>(() => {
    try {
      const storedResult = localStorage.getItem("lastTestResult");
      const storedSummary = localStorage.getItem("lastTestSummary");
      const qScore = localStorage.getItem("quizScore");
      const qLevel = localStorage.getItem("quizLevel");
      const qTotal = localStorage.getItem("totalQuestions");

      if (storedResult) {
        const parsed = JSON.parse(storedResult);
        return {
          lastScore: typeof parsed.score === "number" ? parsed.score : null,
          currentLevel: parsed.level && parsed.level !== "Sin Nivel" ? parsed.level : null,
          totalQuestions: typeof parsed.totalQuestions === "number" ? parsed.totalQuestions : (typeof parsed.total_questions === "number" ? parsed.total_questions : null),
          correctAnswers: typeof parsed.correctAnswers === "number" ? parsed.correctAnswers : (typeof parsed.correct_answers === "number" ? parsed.correct_answers : null),
          completedAt: parsed.completedAt || null,
          hasAttempt: true,
          isLoading: true,
        };
      }
      if (storedSummary) {
        const parsed = JSON.parse(storedSummary);
        return {
          lastScore: typeof parsed.finalScore === "number" ? parsed.finalScore : null,
          currentLevel: parsed.finalLevel && parsed.finalLevel !== "Sin Nivel" ? parsed.finalLevel : null,
          totalQuestions: typeof parsed.totalQuestions === "number" ? parsed.totalQuestions : null,
          correctAnswers: typeof parsed.correctAnswers === "number" ? parsed.correctAnswers : null,
          completedAt: null,
          hasAttempt: true,
          isLoading: true,
        };
      }
      if (qScore !== null && qScore !== "") {
        return {
          lastScore: Number(qScore),
          currentLevel: qLevel && qLevel !== "Sin nivel" ? qLevel : null,
          totalQuestions: qTotal ? Number(qTotal) : null,
          correctAnswers: null,
          completedAt: null,
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
          setExamHistory({
            lastScore: typeof latest.score === "number" ? latest.score : null,
            currentLevel: latest.level && latest.level !== "Sin Nivel" ? latest.level : null,
            totalQuestions: typeof latest.totalQuestions === "number" ? latest.totalQuestions : null,
            correctAnswers: typeof latest.correctAnswers === "number" ? latest.correctAnswers : null,
            completedAt: latest.completedAt || null,
            hasAttempt: true,
            isLoading: false,
          });
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
  }, [user?.id]);

  const enrolledPrograms = user?.enrolledPrograms && user.enrolledPrograms.length > 0
    ? user.enrolledPrograms
    : program ? [program] : [];

  // Separación estricta de roles: El entorno del aprendiz NO contiene botones de cambio de rol
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
        const dest = ROLE_DASHBOARDS[updated.role] || "/dashboard";
        navigate(dest);
      }, 1000);
    } catch (err: any) {
      setFeedbackMsg(err?.message || "No fue posible alternar el rol.");
    } finally {
      setIsSwitchingRole(false);
    }
  };

  const handleProgramSwitch = async (targetProg: string) => {
    if (targetProg === program) return;
    setIsSwitchingProgram(true);
    setFeedbackMsg("");
    try {
      const updated = await api.switchProgram(targetProg);
      updateUser(updated);
      setFeedbackMsg(`Programa activo actualizado a: ${targetProg}`);
    } catch (err: any) {
      setFeedbackMsg(err?.message || "No se pudo cambiar el programa.");
    } finally {
      setIsSwitchingProgram(false);
    }
  };

  const handleRequestFicha = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newFichaInput.trim();
    if (!clean) return;
    setIsEnrolling(true);
    setEnrollError("");
    setEnrollSuccess("");
    try {
      if (enrolledPrograms.length === 0) {
        const updated = await api.enrollFicha({ ficha: clean, program: newProgramInput });
        updateUser(updated);
        const fullProg = updated.program || `${newProgramInput} - Ficha ${clean}`;
        localStorage.setItem("userProgram", fullProg);
        const msg = `Ficha ${clean} vinculada exitosamente al programa ${newProgramInput}.`;
        setEnrollSuccess(msg);
        toast.success(msg, "Ficha Vinculada");
        setNewFichaInput("");
      } else {
        const req = await api.createFichaRequest(clean, newProgramInput);
        const msg = "Solicitud enviada correctamente. El Administrador validará tu vinculación.";
        setEnrollSuccess(msg);
        toast.success(msg, "Solicitud Registrada");
        setNewFichaInput("");
        await loadRequests();
      }
    } catch (err: any) {
      const errMsg = err?.message || "No se pudo registrar la solicitud de ficha.";
      setEnrollError(errMsg);
      toast.error(errMsg, "Error de Solicitud");
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => navigate(ROLE_DASHBOARDS[role] || "/dashboard")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
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

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden mb-6"
        >
          <div className="bg-gradient-to-r from-sena-green to-sena-blue p-6 lg:p-8 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-4xl font-bold shadow-lg overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(name)
                  )}
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

              {/* Botones de acción en encabezado */}
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-sena-blue hover:bg-white/90 rounded-xl font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4 text-sena-green" strokeWidth={2} />
                  <span>Editar Perfil</span>
                </button>

                {/* Botón de cambio de Rol dual */}
                {canSwitchRole && (
                  <button
                    onClick={handleRoleSwitch}
                    disabled={isSwitchingRole}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 text-white border border-white/30 rounded-xl font-semibold hover:bg-white/25 shadow-md transition-all disabled:opacity-60 cursor-pointer"
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
          </div>

          <div className="grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-5 flex items-center gap-3">
              <Mail className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Correo</p>
                <p className="font-medium text-foreground truncate">{user?.email || "Sin correo"}</p>
              </div>
            </div>
            <div className="p-5 flex items-center gap-3">
              <Phone className="w-5 h-5 text-sena-green" strokeWidth={1.8} />
              <div>
                <p className="text-xs text-muted-foreground">Teléfono</p>
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
                <p className="text-xs text-muted-foreground">Estado</p>
                <p className="font-medium text-foreground">{user?.status === "active" ? "Activo" : "Inactivo"}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="grid lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${isStudent ? "lg:col-span-2" : "lg:col-span-3"} bg-white rounded-2xl border border-border shadow-sm p-6`}>
            <div className="flex items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sena-green/10 rounded-xl flex items-center justify-center">
                  <UserRound className="w-5 h-5 text-sena-green" strokeWidth={1.8} />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Información personal</h2>
                  <p className="text-sm text-muted-foreground">Datos registrados en el sistema SENA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sena-green/10 text-sena-green hover:bg-sena-green/20 border border-sena-green/20 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                ["Nombres", user?.firstName || name.split(" ")[0] || "No registrado"],
                ["Apellidos", user?.lastName || name.split(" ").slice(1).join(" ") || "No registrado"],
                ["Tipo de documento", user?.docType || "No registrado"],
                ["Número de documento", user?.docNum || "No registrado"],
                ["País", user?.country || "Colombia"],
                ["Rol en plataforma", roleLabel],
                ["Programa SENA activo", program || "No registrado"],
                ["Fecha de creación de la cuenta", formatDate(user?.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="p-4 bg-muted/50 rounded-xl">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>

            {/* ─── Apartado: Mis Fichas / Programas de Formación (Arquitectura Multiprograma SENA) ─── */}
            <div className="mt-6 pt-6 border-t border-border">
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

              {/* Lista de Fichas Matriculadas */}
              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                {enrolledPrograms.map((progItem) => {
                  const isActive = progItem === program;
                  return (
                    <div
                      key={progItem}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        isActive
                          ? "bg-sena-green/10 border-sena-green text-foreground shadow-xs"
                          : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate text-foreground">{progItem}</p>
                        <p className="text-xs text-muted-foreground">
                          {isActive ? "✓ Ficha activa seleccionada" : "Matriculado"}
                        </p>
                      </div>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => handleProgramSwitch(progItem)}
                          disabled={isSwitchingProgram}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sena-blue text-white hover:bg-sena-blue/90 transition-all flex-shrink-0 cursor-pointer"
                        >
                          Activar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Formulario de Vinculación de Ficha (Inicial o Multiprograma) */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-4">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-sena-green" strokeWidth={1.8} />
                  {enrolledPrograms.length === 0 ? "Vincular Ficha y Programa de Formación" : "Solicitar Vinculación a Programa Alterno"}
                </h4>
                <p className="text-xs text-slate-600 mb-3">
                  {enrolledPrograms.length === 0
                    ? "Ingresa el código numérico de tu ficha y selecciona el programa de formación para habilitar tu entorno:"
                    : "Ingresa el código numérico de la ficha que cursas adicionalmente para revisión y aprobación del Administrador:"}
                </p>

                {enrollSuccess && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" strokeWidth={1.8} />
                    <span>{enrollSuccess}</span>
                  </div>
                )}

                {enrollError && (
                  <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" strokeWidth={1.8} />
                    <span>{enrollError}</span>
                  </div>
                )}

                <form onSubmit={handleRequestFicha} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                        Número / Código de Ficha
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newFichaInput}
                        onChange={(e) => setNewFichaInput(e.target.value.replace(/\D/g, ""))}
                        placeholder="Ej: 3520681, 3411643..."
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/40 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase tracking-wider">
                        Programa de Formación
                      </label>
                      <select
                        value={newProgramInput}
                        onChange={(e) => setNewProgramInput(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/40 font-medium"
                      >
                        <option value="Análisis y Desarrollo de Software (ADSO)">Análisis y Desarrollo de Software (ADSO)</option>
                        <option value="Análisis de Datos">Análisis de Datos</option>
                        <option value="Mecánica Industrial">Mecánica Industrial</option>
                        <option value="Redes y Telecomunicaciones">Redes y Telecomunicaciones</option>
                        <option value="Producción Multimedia">Producción Multimedia</option>
                        <option value="Seguridad Informática">Seguridad Informática</option>
                        <option value="Automatización Industrial">Automatización Industrial</option>
                        <option value="Gestión Empresarial">Gestión Empresarial</option>
                        <option value="Diseño Gráfico">Diseño Gráfico</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isEnrolling || !newFichaInput.trim()}
                      className="px-4 py-2 bg-sena-green hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer"
                    >
                      {isEnrolling ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.8} />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" strokeWidth={1.8} />
                          <span>{enrolledPrograms.length === 0 ? "Vincular Ficha y Programa" : "Enviar Solicitud"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Sugerencias Rápidas de Fichas Oficiales */}
                <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Fichas sugeridas:</span>
                  {[
                    { label: "Mecánica (3520681)", val: "3520681", prog: "Mecánica Industrial" },
                    { label: "Análisis de Datos (3411643)", val: "3411643", prog: "Análisis de Datos" },
                    { label: "Desarrollo Software (2670142)", val: "2670142", prog: "Análisis y Desarrollo de Software (ADSO)" },
                  ].map((sug) => (
                    <button
                      key={sug.val}
                      type="button"
                      onClick={() => {
                        setNewFichaInput(sug.val);
                        setNewProgramInput(sug.prog);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 transition-colors text-[10px] font-semibold cursor-pointer"
                    >
                      + {sug.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lista de Solicitudes */}
              {fichaRequests.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estado de solicitudes:</h5>
                  <div className="space-y-2">
                    {fichaRequests.map((req) => (
                      <div
                        key={req.request_id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-foreground">Ficha {req.ficha_code}</span>
                            <span className="text-xs text-muted-foreground">• {req.program_name}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Fecha: {new Date(req.created_at).toLocaleDateString("es-CO")}
                            {req.admin_notes && ` — Nota: ${req.admin_notes}`}
                          </p>
                        </div>
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              req.status === "APROBADA"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : req.status === "RECHAZADA"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {req.status === "APROBADA"
                              ? "Aprobada"
                              : req.status === "RECHAZADA"
                              ? "Rechazada"
                              : "Pendiente"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {isStudent && (
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl border border-border shadow-sm p-6">
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
                  <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground block">Última puntuación</span>
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

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <span className="text-xs text-muted-foreground font-medium">Nivel actual</span>
                    <span className="text-sm font-bold text-sena-green px-2.5 py-0.5 rounded-lg bg-sena-green/10 border border-sena-green/20">
                      {examHistory.currentLevel || "A1"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <span className="text-xs text-muted-foreground font-medium">Preguntas registradas</span>
                    <span className="text-sm font-bold text-foreground">
                      {examHistory.totalQuestions !== null ? `${examHistory.totalQuestions} preguntas` : "12 preguntas"}
                      {examHistory.correctAnswers !== null && (
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          ({examHistory.correctAnswers} correctas)
                        </span>
                      )}
                    </span>
                  </div>

                  {examHistory.completedAt && (
                    <div className="pt-3 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.8} />
                      <span>Evaluación: {formatDate(examHistory.completedAt)}</span>
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

      </main>

      {/* ─── Modal de Edición de Perfil ─── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-border my-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sena-green/10 flex items-center justify-center text-sena-green">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Editar Perfil Institucional</h3>
                  <p className="text-xs text-muted-foreground">Actualiza tus datos registrados en la plataforma SENA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Selector / Previsualización de Avatar */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Avatar / Foto de Perfil
                </label>

                {/* Input de archivo real oculto */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="flex items-center gap-4 mb-4">
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
                        <Camera className="w-3.5 h-3.5" />
                        <span>{editForm.avatar ? "Cambiar foto" : "Subir foto"}</span>
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
                      Formatos compatibles: JPG, PNG o WebP. Tamaño máximo: 3 MB.
                    </p>
                  </div>
                </div>

                {/* Avatares rápidos predeterminados */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-700 mb-2">
                    O selecciona un avatar institucional predeterminado:
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

              {/* Nombres y Apellidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Nombres *</label>
                  <input
                    type="text"
                    required
                    value={editForm.firstName}
                    onChange={(e) => handleEditFirstNameChange(e.target.value)}
                    onBlur={handleEditFirstNameBlur}
                    className={`w-full px-3 py-2 text-sm border rounded-xl outline-none transition-all ${getFieldValidationClass(
                      !!editTouched.firstName,
                      editErrors.firstName,
                      editForm.firstName
                    )}`}
                    placeholder="Ej. Juan David"
                  />
                  <FieldError error={editTouched.firstName ? editErrors.firstName : undefined} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Apellidos *</label>
                  <input
                    type="text"
                    required
                    value={editForm.lastName}
                    onChange={(e) => handleEditLastNameChange(e.target.value)}
                    onBlur={handleEditLastNameBlur}
                    className={`w-full px-3 py-2 text-sm border rounded-xl outline-none transition-all ${getFieldValidationClass(
                      !!editTouched.lastName,
                      editErrors.lastName,
                      editForm.lastName
                    )}`}
                    placeholder="Ej. Hormaza"
                  />
                  <FieldError error={editTouched.lastName ? editErrors.lastName : undefined} />
                </div>
              </div>

              {/* Documento */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Tipo Documento</label>
                  <select
                    value={editForm.docType}
                    onChange={(e) => handleEditDocTypeChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:ring-2 focus:ring-sena-green focus:border-transparent outline-none bg-white cursor-pointer"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="TI">Tarjeta de Identidad (TI)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PEP">Permiso Especial (PEP)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1">Número de Documento *</label>
                  <input
                    type="text"
                    required
                    value={editForm.docNum}
                    onChange={(e) => handleEditDocNumChange(e.target.value)}
                    onBlur={handleEditDocNumBlur}
                    className={`w-full px-3 py-2 text-sm border rounded-xl outline-none transition-all ${getFieldValidationClass(
                      !!editTouched.docNum,
                      editErrors.docNum,
                      editForm.docNum
                    )}`}
                    placeholder="Ej. 1000123456"
                  />
                  <FieldError error={editTouched.docNum ? editErrors.docNum : undefined} />
                </div>
              </div>

              {/* Correo y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => handleEditEmailChange(e.target.value)}
                    onBlur={handleEditEmailBlur}
                    className={`w-full px-3 py-2 text-sm border rounded-xl outline-none transition-all ${getFieldValidationClass(
                      !!editTouched.email,
                      editErrors.email,
                      editForm.email
                    )}`}
                    placeholder="usuario@misena.edu.co"
                  />
                  <FieldError error={editTouched.email ? editErrors.email : undefined} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editForm.phoneNum}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phoneNum: e.target.value.replace(/\D/g, "").slice(0, 15) }))}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:ring-2 focus:ring-sena-green focus:border-transparent outline-none"
                    placeholder="Ej. 3101234567"
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSavingProfile}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile || !isEditFormValid}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-sena-green text-white hover:bg-sena-green/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
