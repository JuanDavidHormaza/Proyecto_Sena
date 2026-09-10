// frontend/src/pages/AdminDashboard.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Users, Upload, FileText, Trash2, Plus, Search,
  BarChart3, BookOpen, Settings, X,
  Check, Filter, Eye, ToggleLeft, ToggleRight,
  Download, Music, Video,
  Film, TrendingUp, PieChart, Activity, Calendar,
  Award, Target, Zap, ChevronUp, ChevronDown, RefreshCw,
  Shield, LogOut,
  Edit,
  Image as ImageIcon,
} from "lucide-react";
import {
  User, UserPermissions, getDefaultPermissions,
  Document, Subject, senaPrograms,
} from "../data/users";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { UserAccountMenu } from "../components/UserAccountMenu";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { uploadMedia } from "../services/mediaService";
import MediaHierarchyExplorer from "../components/MediaHierarchyExplorer";
import DictionaryFolderCard from "../components/DictionaryFolderCard";
import DictionaryExplorer from "../components/DictionaryExplorer";
import {
  getDictionaryGroups,
} from "../services/dictionaryService";
import { BrandLogo } from "../components/BrandLogo";
import { IconBadge } from "../components/ui/icon-badge";
import { StatCard } from "../components/ui/stat-card";
import { DictionaryGroup } from "../../types/dictionary";

// ─── Tipos de archivo ─────────────────────────────────────────────────────────
type FileCategory = "document" | "image" | "audio" | "video";

type TabType = "overview" | "users" | "groups" | "documents" | "subjects" | "analytics";

type ExtendedDocument = Document & { objectUrl?: string; category?: FileCategory; definition?: string; synonyms?: string; level?: string; };

function getFileCategory(filename: string): FileCategory {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif", "bmp"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a", "webm"].includes(ext)) return "audio";
  if (["mp4", "mov", "avi", "mkv", "ogv", "3gp"].includes(ext)) return "video";
  return "document";
}

const ACCEPT_ALL = ".pdf,.doc,.docx,.txt,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.svg,.avif,.mp3,.wav,.ogg,.flac,.aac,.m4a,.mp4,.mov,.avi,.mkv,.webm";

// ─── Etiquetas de rol para mostrar ───────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  superadmin: "SuperAdmin",
  admin: "Administrador",
  teacher: "Docente",
  student: "Estudiante",
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-worklex-blue/10 text-worklex-blue-dark",
  admin: "bg-destructive/10 text-destructive",
  teacher: "bg-sena-blue/10 text-sena-blue",
  student: "bg-sena-green/10 text-sena-green",
};

const ROLE_TO_BACKEND: Record<string, "ADMIN" | "APRENDIZ" | "INSTRUCTOR"> = {
  admin: "ADMIN",
  teacher: "INSTRUCTOR",
  student: "APRENDIZ",
};

const PASS_THRESHOLD: Record<string, number> = {
  A1: 60,
  A2: 60,
  B1: 65,
  B2: 70,
};

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function isPassingResult(result: api.ApiTestResult) {
  return result.score >= (PASS_THRESHOLD[result.level] ?? 60);
}

function toValidDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

const createEmptyUploadForm = () => ({
  file: null as File | null,
  image: null as File | null,
  audio: null as File | null,
  video: null as File | null,
  subjectId: "",
  // El programa se asigna automáticamente según la ficha seleccionada.
  program: "",
  ficha: "",
  previewUrl: "",
  definition: "",
  synonyms: "",
  level: "",
});

// ════════════════════════════════════════════════════════════════════════════
export function AdminDashboard() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const isSuperAdmin = authUser?.role === "superadmin";

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<ExtendedDocument[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([
    {
      id: "GRAMMAR",
      name: "Grammar",
      description: "Grammar",
      color: "#3F8F5B",
      createdAt: "",
    },
    {
      id: "SPEAKING",
      name: "Speaking",
      description: "Speaking",
      color: "#135D83",
      createdAt: "",
    },
    {
      id: "WRITING",
      name: "Writing",
      description: "Writing",
      color: "#EAB308",
      createdAt: "",
    },
    {
      id: "LISTENING",
      name: "Listening",
      description: "Listening",
      color: "#EF4444",
      createdAt: "",
    },
  ]);
  const [testResults, setTestResults] = useState<api.ApiTestResult[]>([]);
  const [groups, setGroups] = useState<api.ApiTrainingGroup[]>([]);
  const [groupTeachers, setGroupTeachers] = useState<api.ApiUser[]>([]);
  const [groupStudents, setGroupStudents] = useState<api.ApiUser[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState({ ficha: "", program: "", teacher_ids: [] as string[], student_ids: [] as string[] });
  const [groupSearch, setGroupSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);
  const [showEditDataModal, setShowEditDataModal] = useState(false);
  const [editUserData, setEditUserData] = useState({ id: "", name: "", email: "", phone_num: "", role: "", program: "" });

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");

  const [newUser, setNewUser] = useState({
    first_name: "", last_name: "", email: "", password: "",
    doc_type: "CC", doc_num: "", phone_num: "", role: "student", program: ""
  });
  const [newSubject, setNewSubject] = useState({ name: "", description: "", color: "#3F8F5B" });
  const [uploadForm, setUploadForm] = useState(createEmptyUploadForm);
  const [dictionaryGroups, setDictionaryGroups] = useState<DictionaryGroup[]>([]);
  const [selectedDictionary, setSelectedDictionary] = useState<string | null>(null);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [dictionaryStats, setDictionaryStats] = useState({
    dictionaries: 0,
    words: 0,
    images: 0,
    audios: 0,
    videos: 0,
  });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // ── Cargar datos ──────────────────────────────────────────────────────────
  const loadDataFromApi = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [apiUsers, apiSubjects, apiDocs, apiResults] = await Promise.all([
        api.getUsers(),
        api.getSubjects(),
        api.getDocuments(),
        api.getTestResults(),
      ]);

      const convertedUsers: User[] = apiUsers.map(u => ({
        id: u.id, name: u.name, email: u.email, password: '',
        role: u.role as any, permissions: u.permissions, status: u.status,
        createdAt: new Date().toISOString().split('T')[0],
        docType: u.docType, docNum: u.docNum,
        phoneNum: u.phoneNum?.toString(),
        firstName: u.firstName, lastName: u.lastName,
        program: u.program || '',
      }));

      const convertedSubjects: Subject[] = apiSubjects.map(s => ({
        id: s.id, name: s.name, description: s.description, color: s.color,
        createdAt: s.createdAt || new Date().toISOString().split('T')[0],
      }));

      const convertedDocs: ExtendedDocument[] = apiDocs.map(d => {
        const objectUrl = d.imageUrl || d.audioUrl || d.videoUrl || undefined;
        const category: FileCategory = d.imageUrl
          ? "image"
          : d.audioUrl
            ? "audio"
            : d.videoUrl
              ? "video"
              : getFileCategory(d.name);

        return {
          id: d.id,
          name: d.wordId || d.name,
          subjectId: d.subjectId,
          subjectName: d.subjectName,
          program: d.program,
          uploadedAt: d.uploadedAt || new Date().toISOString().split('T')[0],
          fileType: d.fileType,
          size: d.size,
          uploadedBy: d.uploadedBy,
          wordId: d.wordId,
          definition: d.definition,
          synonyms: d.synonyms,
          level: undefined,
          imageUrl: d.imageUrl,
          audioUrl: d.audioUrl,
          videoUrl: d.videoUrl,
          objectUrl,
          category,
        };
      });

      const convertedResults: api.ApiTestResult[] = apiResults.map((r: any) => ({
        id: String(r.id),
        userId: String(r.userId ?? r.user_id ?? r.user ?? ""),
        userName: r.userName ?? r.user_name ?? "Estudiante",
        studentProgram: r.studentProgram ?? r.student_program ?? "",
        score: Number(r.score ?? 0),
        level: r.level ?? "A1",
        correctAnswers: Number(r.correctAnswers ?? r.correct_answers ?? 0),
        totalQuestions: Number(r.totalQuestions ?? r.total_questions ?? 0),
        feedback: r.feedback,
        duration: r.duration,
        completedAt: r.completedAt ?? r.created_at ?? new Date().toISOString(),
        process: r.process,
        answers: r.answers ?? [],
      }));

      setUsers(convertedUsers);
      if (convertedSubjects.length > 0) {
        setSubjects(convertedSubjects);
      }
      setDocuments(convertedDocs);
      setTestResults(convertedResults);
    } catch (error) {
      setUsers([]);
      setSubjects([]);
      setDocuments([]);
      setTestResults([]);
    }
    setIsLoading(false);
  };

  const loadGroups = async () => {
    try {
      const [loadedGroups, teachers] = await Promise.all([api.getGroups(), api.getAvailableGroupTeachers()]);
      setGroups(loadedGroups);
      setGroupTeachers(teachers);
    } catch (error: any) {
      setApiError(error?.message || "No fue posible cargar las fichas");
    }
  };

  useEffect(() => {
    loadDataFromApi();
    loadDictionaryDashboard();
    loadGroups();
  }, []);

  useEffect(() => {
    if (!groupForm.program) return void setGroupStudents([]);
    api.getAvailableGroupStudents(groupForm.program, editingGroupId || undefined)
      .then(setGroupStudents)
      .catch((error: any) => setApiError(error?.message || "No fue posible cargar los aprendices"));
  }, [groupForm.program, editingGroupId]);

  const toggleGroupSelection = (key: "teacher_ids" | "student_ids", id: string) => setGroupForm(current => ({
    ...current,
    [key]: current[key].includes(id) ? current[key].filter(item => item !== id) : [...current[key], id],
  }));
  const resetGroupForm = () => {
    setEditingGroupId(null);
    setGroupForm({ ficha: "", program: "", teacher_ids: [], student_ids: [] });
    setTeacherSearch("");
    setStudentSearch("");
  };
  const startEditingGroup = (group: api.ApiTrainingGroup) => {
    setEditingGroupId(group.id);
    setTeacherSearch("");
    setStudentSearch("");
    setGroupForm({ ficha: group.ficha, program: group.program, teacher_ids: group.teachers.map(item => item.id), student_ids: group.students.map(item => item.id) });
  };
  const handleSaveGroup = async () => {
    try {
      await api.saveGroup(groupForm, editingGroupId || undefined);
      resetGroupForm();
      await loadGroups();
    } catch (error: any) { setApiError(error?.message || "No fue posible guardar la ficha"); }
  };
  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm("¿Eliminar esta ficha y todas sus asignaciones?")) return;
    try {
      await api.deleteGroup(id);
      if (editingGroupId === id) resetGroupForm();
      await loadGroups();
    } catch (error: any) { setApiError(error?.message || "No fue posible eliminar la ficha"); }
  };

  // ── Handlers con API real ─────────────────────────────────────────────────
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    try {
      await api.deleteUser(userId);
      await loadDataFromApi();
    } catch {
      setApiError("Error al eliminar usuario");
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      await api.toggleUserStatus(userId);
      await loadDataFromApi();
    } catch {
      setApiError("Error al cambiar estado del usuario");
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      await api.changeUserRole(userId, newRole);
      await loadDataFromApi();
    } catch {
      setApiError("Error al cambiar rol del usuario");
    }
  };

  const canAdminManageUser = (targetUser: User) =>
    isSuperAdmin || targetUser.role === "teacher" || targetUser.role === "student";

  const canModifyUserActions = (targetUser: User) =>
    canAdminManageUser(targetUser) && targetUser.id !== authUser?.id;

  const canEditUserPermissions = (targetUser: User) =>
    canAdminManageUser(targetUser);

  const handleEditUserPermissions = (user: User) => {
    if (!canEditUserPermissions(user)) return;
    setSelectedUser(user);
    setShowEditUserModal(true);
  };


  // Abre el modal con los datos del usuario
  const handleEditUserData = (user: User) => {
    setEditUserData({
      id: user.id,
      name: user.name,
      email: user.email,
      phone_num: user.phoneNum || "", // mapeamos phoneNum a phone_num
      role: user.role,
      program: user.program || "",
    });
    setShowEditDataModal(true);
  };

  // Guarda los cambios (solo name y email, según el paso a paso)
  const handleSaveUserData = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateUser(editUserData.id, {
        name: editUserData.name,
        email: editUserData.email,
        phone_num: editUserData.phone_num,
        program: editUserData.role === 'teacher' || editUserData.role === 'student' ? editUserData.program : '',
      });
      await loadDataFromApi(); // recarga la lista
      setShowEditDataModal(false);
    } catch {
      setApiError("Error al actualizar usuario");
    }
  };



  const handleSaveUserPermissions = (permissions: UserPermissions) => {
    if (selectedUser) {
      setUsers(users.map(u => u.id === selectedUser.id ? { ...u, permissions } : u));
      setShowEditUserModal(false);
      setSelectedUser(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Registrar el usuario (siempre crea como APRENDIZ por defecto en backend)
      const response = await api.register({
        email: newUser.email,
        password: newUser.password,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        doc_type: newUser.doc_type,
        doc_num: newUser.doc_num,
        phone_num: newUser.phone_num ? parseInt(newUser.phone_num) : undefined,
        program: newUser.role === 'teacher' || newUser.role === 'student' ? newUser.program : '',
        role_id: ROLE_TO_BACKEND[newUser.role] || 'APRENDIZ',
      });

      // 2. Si el rol deseado no es student, cambiarlo via API
      if (newUser.role !== 'student' && response.user?.id) {
        await api.changeUserRole(response.user.id, newUser.role);
      }

      await loadDataFromApi();
      setShowUserModal(false);
      setNewUser({ first_name: "", last_name: "", email: "", password: "", doc_type: "CC", doc_num: "", phone_num: "", role: "student", program: "" });
    } catch (err: any) {
      setApiError(err?.message || "Error al crear usuario");
    }
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const subject: Subject = { id: Date.now().toString(), ...newSubject, createdAt: new Date().toISOString().split("T")[0] };
    setSubjects([...subjects, subject]);
    setShowSubjectModal(false);
    setNewSubject({ name: "", description: "", color: "#3F8F5B" });
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (confirm("¿Eliminar esta asignatura?")) setSubjects(subjects.filter(s => s.id !== subjectId));
  };

  const handleFileSelect = (file: File) => {
    setUploadForm({ ...uploadForm, file, previewUrl: URL.createObjectURL(file) });
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadForm.file) {
      setApiError("Selecciona un archivo.");
      return;
    }

    try {
      let imageUrl = "";
      let audioUrl = "";
      let videoUrl = "";

      const selectedCategory = getFileCategory(uploadForm.file.name);
      // El programa viene de la ficha seleccionada (se asigna automáticamente).
      const program = uploadForm.program || "Todos los programas";
      const ficha = uploadForm.ficha || "";

      // Subir multimedia a MinIO, organizado por programa y ficha.
      if (uploadForm.image || selectedCategory === "image") {
        const asset = await uploadMedia({
          file: uploadForm.image || uploadForm.file,
          mediaType: "image",
          program,
          ficha,
          definition: uploadForm.definition,
          synonyms: uploadForm.synonyms,
          subjectId: uploadForm.subjectId || undefined,
        });
        imageUrl = asset.url;
      }

      if (uploadForm.audio || selectedCategory === "audio") {
        const asset = await uploadMedia({
          file: uploadForm.audio || uploadForm.file,
          mediaType: "audio",
          program,
          ficha,
          definition: uploadForm.definition,
          synonyms: uploadForm.synonyms,
          subjectId: uploadForm.subjectId || undefined,
        });
        audioUrl = asset.url;
      }

      if (uploadForm.video || selectedCategory === "video") {
        const asset = await uploadMedia({
          file: uploadForm.video || uploadForm.file,
          mediaType: "video",
          program,
          ficha,
          definition: uploadForm.definition,
          synonyms: uploadForm.synonyms,
          subjectId: uploadForm.subjectId || undefined,
        });
        videoUrl = asset.url;
      }

      // Guardar registro en Django
      await api.createDocument({
        name: uploadForm.file.name,
        subjectId: uploadForm.subjectId || undefined,
        program,
        ficha,
        definition: uploadForm.definition,
        synonyms: uploadForm.synonyms,
        imageUrl,
        audioUrl,
        videoUrl,
      });

      // Recargar lista desde la API
      await loadDataFromApi();
      await loadDictionaryDashboard();

      // Limpiar formulario
      if (uploadForm.previewUrl) {
        URL.revokeObjectURL(uploadForm.previewUrl);
      }

      setUploadForm(createEmptyUploadForm());

      setShowUploadModal(false);
      setApiError(null);

    } catch (error) {
      console.error("Error al subir el diccionario:", error);
      setApiError("No fue posible guardar el diccionario.");
    }
   };


  // ── Filtros ───────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (filterRole === "all" || u.role === filterRole);
  });

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "active").length,
    totalDocuments: documents.length,
    totalSubjects: subjects.length,
    students: users.filter(u => u.role === "student").length,
    teachers: users.filter(u => u.role === "teacher").length,
    images: documents.filter(d => (d.category ?? getFileCategory(d.name)) === "image").length,
    audios: documents.filter(d => (d.category ?? getFileCategory(d.name)) === "audio").length,
    videos: documents.filter(d => (d.category ?? getFileCategory(d.name)) === "video").length,
  };

  const passedTests = testResults.filter(isPassingResult).length;
  const testedStudentIds = new Set(testResults.map(result => result.userId).filter(Boolean));
  const activeStudents = users.filter(u => u.role === "student" && u.status === "active").length;
  const averageScore = testResults.length
    ? Math.round(testResults.reduce((sum, result) => sum + result.score, 0) / testResults.length)
    : 0;
  const approvalRate = testResults.length ? Math.round((passedTests / testResults.length) * 100) : 0;

  const levelDistributionData = [
    { name: "Basico (A1-A2)", value: testResults.filter(r => r.level?.startsWith("A")).length, color: "#C45D55" },
    { name: "Intermedio (B1)", value: testResults.filter(r => r.level === "B1").length, color: "#C4943B" },
    { name: "Avanzado (B2)", value: testResults.filter(r => r.level === "B2").length, color: "#3F8F5B" },
  ];

  const scoreTrendData = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const month = date.getMonth();
    const year = date.getFullYear();
    const monthResults = testResults.filter(result => {
      const resultDate = toValidDate(result.completedAt);
      return resultDate.getMonth() === month && resultDate.getFullYear() === year;
    });

    return {
      mes: MONTH_LABELS[month],
      promedio: monthResults.length
        ? Math.round(monthResults.reduce((sum, result) => sum + result.score, 0) / monthResults.length)
        : 0,
      pruebas: monthResults.length,
    };
  });

  const analyticsKpis = [
    { label: "Promedio General", value: `${averageScore}%`, icon: Target, color: "sena-green", trend: `${testResults.length} prueba${testResults.length !== 1 ? "s" : ""}`, up: averageScore >= 60 },
    { label: "Pruebas Completadas", value: testResults.length, icon: Award, color: "sena-blue", trend: `${testedStudentIds.size} estudiante${testedStudentIds.size !== 1 ? "s" : ""}`, up: true },
    { label: "Estudiantes Activos", value: activeStudents, icon: Users, color: "warning", trend: `${stats.students} total`, up: true },
    { label: "Tasa de Aprobacion", value: `${approvalRate}%`, icon: Zap, color: "destructive", trend: `${passedTests}/${testResults.length}`, up: approvalRate >= 60 },
  ];

  const tabs = [
    { id: "overview", label: "Resumen", icon: BarChart3 },
    { id: "analytics", label: "Estadisticas", icon: PieChart },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "groups", label: "Fichas", icon: Users },
    { id: "documents", label: "Documentos", icon: FileText },
    { id: "subjects", label: "Asignaturas", icon: BookOpen },
  ];

  const uploadCat = uploadForm.file ? getFileCategory(uploadForm.file.name) : null;

  async function loadDictionaryDashboard() {
    try {
      // Derivamos las estadísticas de los grupos para evitar listar los buckets
      // de Supabase dos veces (getDictionaryGroups ya los incluye).
      const groups = await getDictionaryGroups();

      const stats = {
        dictionaries: groups.length,
        words: groups.reduce((sum, item) => sum + item.totalWords, 0),
        images: groups.reduce((sum, item) => sum + item.totalImages, 0),
        audios: groups.reduce((sum, item) => sum + item.totalAudios, 0),
        videos: groups.reduce((sum, item) => sum + item.totalVideos, 0),
      };

      setDictionaryGroups(groups);
      setDictionaryStats(stats);
    } catch (error) {
      console.error(error);
      setDictionaryGroups([]);
      setDictionaryStats({
        dictionaries: 0,
        words: 0,
        images: 0,
        audios: 0,
        videos: 0,
      });
    }
  }

  function openDictionary(subject: string) {
    setSelectedDictionary(subject);
    setDictionaryOpen(true);
  }

  function closeDictionary() {
    setDictionaryOpen(false);
    setSelectedDictionary(null);
  }

  function downloadDictionary(subject: string) {
    const packageDocs = documents.filter((doc) => doc.subjectId === subject);
    const manifest = {
      subject,
      totalWords: packageDocs.length,
      generatedAt: new Date().toISOString(),
      words: packageDocs.map((doc) => ({
        word: doc.wordId || doc.name,
        definition: doc.definition || "",
        synonyms: doc.synonyms || "",
        image: doc.imageUrl || "",
        audio: doc.audioUrl || "",
        video: doc.videoUrl || "",
      })),
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${subject.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-diccionario.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function deleteDictionary(subject: string) {
    const packageDocs = documents.filter((doc) => doc.subjectId === subject);

    if (packageDocs.length === 0) return;
    if (!confirm(`Eliminar el diccionario ${subject} con ${packageDocs.length} palabra(s)?`)) return;

    try {
      await Promise.all(packageDocs.map((doc) => api.deleteDocument(doc.id)));
      await loadDataFromApi();
      await loadDictionaryDashboard();
    } catch {
      setApiError("Error al eliminar diccionario");
    }
  }

  function editDictionary(subject: string) {
    openDictionary(subject);
  }

  function addDictionaryContent(subject: string) {
    setUploadForm({
      ...createEmptyUploadForm(),
      subjectId: subject,
    });
    setShowUploadModal(true);
  }
  return (
    <div className="min-h-screen bg-background">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-border z-40 hidden lg:block">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <BrandLogo height="h-12" />
            <div>
              <h1 className="font-semibold text-foreground">English Test</h1>
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin ? "Panel SuperAdmin" : "Panel Admin"}
              </p>
            </div>
          </div>
          {/* Badge de rol */}
          <div className={`mb-6 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit ${isSuperAdmin ? "bg-purple-100 text-purple-700" : "bg-destructive/10 text-destructive"}`}>
            <Shield className="w-3.5 h-3.5" />
            {isSuperAdmin ? "SuperAdministrador" : "Administrador"}
          </div>
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all ${activeTab === tab.id ? "bg-sena-green text-white shadow-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-all font-medium">
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo height="h-10" />
            <span className="font-semibold text-foreground">{isSuperAdmin ? "SuperAdmin" : "Admin"}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all ${activeTab === tab.id ? "bg-sena-green text-white" : "bg-muted text-muted-foreground"}`}>
              <tab.icon className="w-4 h-4" />{tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main ── */}
      <main className="lg:ml-64 pt-32 lg:pt-0">
        <div className="p-6 lg:p-8">

          {/* Error banner */}
          {apiError && (
            <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-xl flex items-center justify-between">
              <span className="text-sm font-medium">{apiError}</span>
              <button onClick={() => setApiError(null)} className="ml-4 font-bold">✕</button>
            </div>
          )}

          {/* ══ Overview ══ */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Panel de Administración</h2>
                <p className="text-muted-foreground">Bienvenido al centro de control de English Level Test</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Usuarios", value: stats.totalUsers, icon: Users, tone: "green" as const },
                  { label: "Usuarios Activos", value: stats.activeUsers, icon: Check, tone: "blue" as const },
                  { label: "Documentos", value: stats.totalDocuments, icon: FileText, tone: "yellow" as const },
                  { label: "Asignaturas", value: stats.totalSubjects, icon: BookOpen, tone: "red" as const },
                ].map((stat, i) => (
                  <StatCard key={i} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} delay={i * 0.1} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="surface-card p-5 flex items-center gap-4">
                  <IconBadge tone="blue-soft" size="lg" className="bg-purple-100 text-purple-600">
                    <Music />
                  </IconBadge>
                  <div><p className="text-2xl font-bold text-foreground">{stats.audios}</p><p className="text-sm text-muted-foreground">Archivos de audio</p></div>
                </div>
                <div className="surface-card p-5 flex items-center gap-4">
                  <IconBadge tone="blue" size="lg">
                    <Film />
                  </IconBadge>
                  <div><p className="text-2xl font-bold text-foreground">{stats.videos}</p><p className="text-sm text-muted-foreground">Archivos de video</p></div>
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="surface-card p-6">
                  <h3 className="font-semibold text-foreground mb-4">Distribución de Usuarios</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Estudiantes</span><span className="font-medium">{stats.students}</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-sena-green rounded-full" style={{ width: `${stats.totalUsers ? (stats.students / stats.totalUsers) * 100 : 0}%` }} /></div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1"><span className="text-muted-foreground">Docentes</span><span className="font-medium">{stats.teachers}</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-sena-blue rounded-full" style={{ width: `${stats.totalUsers ? (stats.teachers / stats.totalUsers) * 100 : 0}%` }} /></div>
                    </div>
                  </div>
                </div>
                <div className="surface-card p-6">
                  <h3 className="font-semibold text-foreground mb-4">Acciones Rápidas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setActiveTab("users")} className="flex items-center gap-2 p-3 bg-sena-green/10 text-sena-green rounded-2xl hover:bg-sena-green/20 transition-all font-medium text-sm"><Users className="w-4 h-4" /> Ver Usuarios</button>
                    <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 p-3 bg-sena-blue/10 text-sena-blue rounded-2xl hover:bg-sena-blue/20 transition-all font-medium text-sm"><Upload className="w-4 h-4" /> Subir Archivo</button>
                    <button onClick={() => setShowSubjectModal(true)} className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-2xl hover:bg-warning/20 transition-all font-medium text-sm"><BookOpen className="w-4 h-4" /> Nueva Asignatura</button>
                    <button onClick={() => setActiveTab("documents")} className="flex items-center gap-2 p-3 bg-muted text-muted-foreground rounded-2xl hover:bg-muted/80 transition-all font-medium text-sm"><Settings className="w-4 h-4" /> Gestionar</button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ Analytics ══ */}
          {activeTab === "analytics" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Panel de Estadisticas</h2>
                <p className="text-muted-foreground">Analisis detallado del rendimiento de la plataforma</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {analyticsKpis.map((kpi, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                    className="surface-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <IconBadge tone={kpi.color === "sena-green" ? "green" : kpi.color === "sena-blue" ? "blue" : kpi.color === "warning" ? "yellow" : "red"} size="md">
                        <kpi.icon />
                      </IconBadge>
                      <div className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? 'text-sena-green' : 'text-destructive'}`}>
                        {kpi.up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}{kpi.trend}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  </motion.div>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="surface-card p-6">
                  <h3 className="font-semibold text-foreground mb-6">Distribucion por Nivel</h3>
                  <div className="h-64">
                    {testResults.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={levelDistributionData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          >
                            {levelDistributionData.map((level, index) => <Cell key={index} fill={level.color} />)}
                          </Pie>
                          <Tooltip />
                        </RechartsPie>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        Sin pruebas registradas
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {levelDistributionData.map(level => (
                      <div key={level.name} className="text-center">
                        <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: level.color }} />
                        <p className="text-xs font-medium text-foreground">{level.value}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{level.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="surface-card p-6">
                  <h3 className="font-semibold text-foreground mb-6">Tendencia de Puntuaciones</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={scoreTrendData}>
                        <defs>
                          <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3F8F5B" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#3F8F5B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                        <Area type="monotone" dataKey="promedio" stroke="#3F8F5B" strokeWidth={2} fillOpacity={1} fill="url(#colorPromedio)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-muted-foreground">Total pruebas</p>
                      <p className="text-lg font-bold text-foreground">{testResults.length}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-muted-foreground">Aprobadas</p>
                      <p className="text-lg font-bold text-sena-green">{passedTests}</p>
                    </div>
                    <div className="rounded-xl bg-muted/50 p-3">
                      <p className="text-muted-foreground">Est. evaluados</p>
                      <p className="text-lg font-bold text-sena-blue">{testedStudentIds.size}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ Users ══ */}
          {activeTab === "users" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Gestión de Usuarios</h2>
                  <p className="text-muted-foreground">
                    {isSuperAdmin ? "Control total — puedes cambiar roles, activar/desactivar y eliminar usuarios" : "Administra usuarios y sus permisos"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={loadDataFromApi} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-muted-foreground hover:bg-muted transition-all text-sm">
                    <RefreshCw className="w-4 h-4" /> Actualizar
                  </button>
                  {isSuperAdmin && (
                    <button onClick={() => setShowUserModal(true)}
                      className="flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium shadow-lg shadow-sena-green/25">
                      <Plus className="w-5 h-5" /> Agregar Usuario
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input type="text" placeholder="Buscar por nombre o email..." value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" />
                </div>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
                    className="pl-12 pr-8 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 appearance-none cursor-pointer">
                    <option value="all">Todos los roles</option>
                    <option value="superadmin">SuperAdmin</option>
                    <option value="admin">Administrador</option>
                    <option value="teacher">Docente</option>
                    <option value="student">Estudiante</option>
                  </select>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Cargando usuarios...</div>
              ) : (
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground">Usuario</th>
                          <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground">Rol</th>
                          <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground">Estado</th>
                          <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground">Acciones</th>

                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map(user => {
                          const isSelf = user.id === authUser?.id;
                          const isTargetSuperAdmin = user.role === "superadmin";
                          const canModify = canModifyUserActions(user);
                          const canChangeRole = isSuperAdmin && !isSelf && !isTargetSuperAdmin;
                          const canOpenPermissions = canEditUserPermissions(user);

                          return (
                            <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium ${ROLE_COLORS[user.role]?.replace('text-', 'bg-').replace('/10', '') || 'bg-gray-400'}`}
                                    style={{ background: user.role === 'superadmin' ? '#7c3aed' : user.role === 'admin' ? '#ef4444' : user.role === 'teacher' ? '#135D83' : '#3F8F5B' }}>
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground flex items-center gap-2">
                                      {user.name}
                                      {isSelf && <span className="text-xs bg-sena-green/10 text-sena-green px-1.5 py-0.5 rounded-full">Tú</span>}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                    {(user.role === 'teacher' || user.role === 'student') && user.program && (
                                      <p className="text-xs text-muted-foreground">{user.program}</p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-5">
                                {canChangeRole ? (
                                  <select value={user.role} onChange={e => handleChangeUserRole(user.id, e.target.value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer ${ROLE_COLORS[user.role] || 'bg-muted text-muted-foreground'}`}>
                                    <option value="admin">Administrador</option>
                                    <option value="teacher">Docente</option>
                                    <option value="student">Estudiante</option>
                                  </select>
                                ) : (
                                  <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${ROLE_COLORS[user.role] || 'bg-muted text-muted-foreground'}`}>
                                    {ROLE_LABELS[user.role] || user.role}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-5">
                                <button onClick={() => canModify && handleToggleUserStatus(user.id)}
                                  disabled={!canModify}
                                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${user.status === "active" ? "bg-sena-green/10 text-sena-green hover:bg-sena-green/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                                  {user.status === "active" ? <><ToggleRight className="w-4 h-4" /> Activo</> : <><ToggleLeft className="w-4 h-4" /> Inactivo</>}
                                </button>
                              </td>
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-2">
                                  {canModify && (
                                    <button
                                      onClick={() => handleEditUserData(user)}
                                      className="p-2 text-sena-green hover:bg-sena-green/10 rounded-lg transition-colors"
                                      title="Editar datos"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canOpenPermissions && (
                                    <button onClick={() => handleEditUserPermissions(user)}
                                      className="p-2 text-sena-blue hover:bg-sena-blue/10 rounded-lg transition-colors" title="Editar permisos">
                                      <Settings className="w-4 h-4" />
                                    </button>
                                  )}
                                  {canModify && !isTargetSuperAdmin && (
                                    <button onClick={() => handleDeleteUser(user.id)}
                                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors" title="Eliminar usuario">
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={4} className="py-12 text-center text-muted-foreground">No se encontraron usuarios</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "groups" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-[1500px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-foreground">Administración de fichas</h2><p className="text-muted-foreground">Asigna docentes y aprendices por programa SENA.</p></div>
                <button onClick={resetGroupForm} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-muted-foreground hover:bg-muted"><Plus className="w-4 h-4" /> Nueva ficha</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-border rounded-2xl p-5"><p className="text-sm text-muted-foreground">Fichas creadas</p><p className="text-3xl font-bold mt-1">{groups.length}</p></div>
                <div className="bg-white border border-border rounded-2xl p-5"><p className="text-sm text-muted-foreground">Aprendices asignados</p><p className="text-3xl font-bold mt-1 text-sena-green">{groups.reduce((total, group) => total + group.students.length, 0)}</p></div>
                <div className="bg-white border border-border rounded-2xl p-5"><p className="text-sm text-muted-foreground">Docentes con ficha</p><p className="text-3xl font-bold mt-1 text-sena-blue">{new Set(groups.flatMap(group => group.teachers.map(teacher => teacher.id))).size}</p></div>
              </div>
              {apiError && <div className="rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-sm">{apiError}</div>}
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
                <section className="xl:col-span-2 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-border"><div className="flex items-center justify-between"><div><h3 className="text-lg font-semibold">Fichas creadas</h3><p className="text-sm text-muted-foreground">Selecciona una para editarla.</p></div><button onClick={loadGroups} className="p-2 text-sena-green hover:bg-sena-green/10 rounded-lg" title="Actualizar"><RefreshCw className="w-4 h-4" /></button></div><div className="relative mt-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={groupSearch} onChange={e => setGroupSearch(e.target.value)} placeholder="Buscar ficha o programa" className="w-full pl-9 pr-3 py-2.5 border border-border rounded-xl text-sm" /></div></div>
                  <div className="p-2 max-h-[620px] overflow-y-auto space-y-1">{groups.filter(group => `${group.ficha} ${group.program}`.toLowerCase().includes(groupSearch.toLowerCase())).map(group => <div key={group.id} className={`rounded-xl p-4 transition-colors ${editingGroupId === group.id ? "bg-sena-green/10" : "hover:bg-muted/50"}`}><div className="flex justify-between gap-2"><button onClick={() => startEditingGroup(group)} className="text-left min-w-0 flex-1"><p className="font-semibold">Ficha {group.ficha}</p><p className="text-sm text-sena-blue truncate">{group.program}</p></button><div className="flex gap-1"><button onClick={() => startEditingGroup(group)} className="p-2 text-sena-green hover:bg-white rounded-lg" title="Editar"><Edit className="w-4 h-4" /></button><button onClick={() => handleDeleteGroup(group.id)} className="p-2 text-destructive hover:bg-white rounded-lg" title="Eliminar"><Trash2 className="w-4 h-4" /></button></div></div><div className="flex gap-2 mt-3 text-xs"><span className="px-2 py-1 rounded-full bg-sena-blue/10 text-sena-blue">{group.teachers.length} docentes</span><span className="px-2 py-1 rounded-full bg-sena-green/10 text-sena-green">{group.students.length} aprendices</span></div></div>)}{groups.length === 0 && <div className="p-10 text-center text-muted-foreground"><Users className="w-9 h-9 mx-auto mb-3 opacity-40" /><p className="font-medium text-foreground">Aún no hay fichas</p><p className="text-sm mt-1">Crea la primera ficha para empezar.</p></div>}</div>
                </section>
                <section className="xl:col-span-3 bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border flex items-center justify-between"><div><h3 className="text-xl font-semibold">{editingGroupId ? `Editando ficha ${groupForm.ficha}` : "Nueva ficha"}</h3><p className="text-sm text-muted-foreground mt-1">Define la ficha y luego sus participantes.</p></div>{editingGroupId && <button onClick={resetGroupForm} className="text-sm px-3 py-2 rounded-lg hover:bg-muted">Cancelar</button>}</div>
                  <div className="p-6 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-5"><div><label className="block text-sm font-semibold mb-2">Número de ficha</label><input value={groupForm.ficha} onChange={e => setGroupForm({ ...groupForm, ficha: e.target.value })} placeholder="Ej. 2998765" className="w-full px-4 py-3 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/30" /></div><div><label className="block text-sm font-semibold mb-2">Programa SENA</label><select value={groupForm.program} onChange={e => setGroupForm({ ...groupForm, program: e.target.value, student_ids: [] })} className="w-full px-4 py-3 border border-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-sena-green/30"><option value="">Seleccionar programa</option>{senaPrograms.map(program => <option key={program} value={program}>{program}</option>)}</select></div></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5"><div className="border border-border rounded-2xl overflow-hidden"><div className="p-4 bg-sena-blue/5 border-b border-border"><div className="flex justify-between"><div><p className="font-semibold">1. Docentes</p><p className="text-xs text-muted-foreground mt-1">Verán resultados de esta ficha.</p></div><span className="text-sm font-semibold text-sena-blue">{groupForm.teacher_ids.length}</span></div><div className="relative mt-3"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} placeholder="Buscar docente" className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm bg-white" /></div></div><div className="max-h-60 overflow-y-auto divide-y">{groupTeachers.filter(teacher => `${teacher.name} ${teacher.email}`.toLowerCase().includes(teacherSearch.toLowerCase())).map(teacher => <label key={teacher.id} className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-muted/40"><input className="w-4 h-4 accent-sena-green" type="checkbox" checked={groupForm.teacher_ids.includes(teacher.id)} onChange={() => toggleGroupSelection("teacher_ids", teacher.id)} /><span><span className="block font-medium text-sm">{teacher.name}</span><span className="block text-xs text-muted-foreground">{teacher.email}</span></span></label>)}</div></div>
                      <div className="border border-border rounded-2xl overflow-hidden"><div className="p-4 bg-sena-green/5 border-b border-border"><div className="flex justify-between"><div><p className="font-semibold">2. Aprendices</p><p className="text-xs text-muted-foreground mt-1">Disponibles en el programa elegido.</p></div><span className="text-sm font-semibold text-sena-green">{groupForm.student_ids.length}</span></div><div className="relative mt-3"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={studentSearch} disabled={!groupForm.program} onChange={e => setStudentSearch(e.target.value)} placeholder="Buscar aprendiz" className="w-full pl-9 pr-3 py-2 rounded-lg border border-border text-sm bg-white disabled:bg-muted" /></div></div>{!groupForm.program ? <p className="p-8 text-center text-sm text-muted-foreground">Selecciona primero el programa.</p> : <div className="max-h-60 overflow-y-auto divide-y">{[...groupStudents, ...(editingGroupId ? (groups.find(group => group.id === editingGroupId)?.students || []).filter(student => !groupStudents.some(item => item.id === student.id)) : [])].filter(student => `${student.name} ${student.email}`.toLowerCase().includes(studentSearch.toLowerCase())).map(student => <label key={student.id} className="flex items-center gap-3 p-3.5 cursor-pointer hover:bg-muted/40"><input className="w-4 h-4 accent-sena-green" type="checkbox" checked={groupForm.student_ids.includes(student.id)} onChange={() => toggleGroupSelection("student_ids", student.id)} /><span><span className="block font-medium text-sm">{student.name}</span><span className="block text-xs text-muted-foreground">{student.email}</span></span></label>)}</div>}</div></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border"><p className="text-sm text-muted-foreground">{groupForm.teacher_ids.length} docentes y {groupForm.student_ids.length} aprendices seleccionados.</p><button disabled={!groupForm.ficha || !groupForm.program} onClick={handleSaveGroup} className="px-6 py-3 rounded-xl bg-sena-green text-white font-medium hover:bg-sena-green-dark disabled:opacity-50">{editingGroupId ? "Guardar cambios" : "Crear ficha"}</button></div>
                  </div>
                </section>
              </div>
              <div className="hidden">
                <section className="xl:col-span-3 bg-white rounded-2xl border border-border shadow-sm p-6 space-y-6">
                  <div className="flex items-center justify-between"><h3 className="font-semibold text-foreground">{editingGroupId ? "Editar ficha" : "Crear ficha"}</h3>{editingGroupId && <button onClick={resetGroupForm} className="text-sm text-sena-green">Cancelar</button>}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1.5">Número de ficha</label><input value={groupForm.ficha} onChange={e => setGroupForm({ ...groupForm, ficha: e.target.value })} placeholder="Ej. 2998765" className="w-full px-4 py-2.5 border border-border rounded-xl" /></div>
                    <div><label className="block text-sm font-medium mb-1.5">Programa SENA</label><select value={groupForm.program} onChange={e => setGroupForm({ ...groupForm, program: e.target.value, student_ids: [] })} className="w-full px-4 py-2.5 border border-border rounded-xl"><option value="">Seleccionar programa</option>{senaPrograms.map(program => <option key={program} value={program}>{program}</option>)}</select></div>
                  </div>
                  <div><p className="text-sm font-medium mb-2">Docentes asignados</p><div className="max-h-36 overflow-y-auto border border-border rounded-xl divide-y">{groupTeachers.map(teacher => <label key={teacher.id} className="flex gap-3 p-3 cursor-pointer hover:bg-muted/50"><input type="checkbox" checked={groupForm.teacher_ids.includes(teacher.id)} onChange={() => toggleGroupSelection("teacher_ids", teacher.id)} /><span>{teacher.name}<span className="block text-xs text-muted-foreground">{teacher.email}</span></span></label>)}{groupTeachers.length === 0 && <p className="p-3 text-sm text-muted-foreground">No hay docentes registrados.</p>}</div></div>
                  <div><p className="text-sm font-medium mb-2">Aprendices disponibles del programa</p>{!groupForm.program ? <p className="p-3 text-sm text-muted-foreground border border-border rounded-xl">Selecciona un programa para ver sus aprendices.</p> : <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y">{[...groupStudents, ...(editingGroupId ? (groups.find(group => group.id === editingGroupId)?.students || []).filter(student => !groupStudents.some(item => item.id === student.id)) : [])].map(student => <label key={student.id} className="flex gap-3 p-3 cursor-pointer hover:bg-muted/50"><input type="checkbox" checked={groupForm.student_ids.includes(student.id)} onChange={() => toggleGroupSelection("student_ids", student.id)} /><span>{student.name}<span className="block text-xs text-muted-foreground">{student.email}</span></span></label>)}</div>}</div>
                  <button disabled={!groupForm.ficha || !groupForm.program} onClick={handleSaveGroup} className="w-full bg-sena-green text-white py-3 rounded-xl font-medium disabled:opacity-50">{editingGroupId ? "Guardar cambios" : "Crear ficha"}</button>
                </section>
                <section className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden"><div className="p-6 border-b border-border flex items-center justify-between"><h3 className="font-semibold">Fichas creadas</h3><button onClick={loadGroups} className="text-sm text-sena-green">Actualizar</button></div><div className="divide-y divide-border">{groups.map(group => <div key={group.id} className="p-5"><div className="flex justify-between gap-4"><div><p className="font-semibold">Ficha {group.ficha}</p><p className="text-sm text-muted-foreground">{group.program}</p></div><div className="flex gap-2"><button onClick={() => startEditingGroup(group)} className="p-2 text-sena-green hover:bg-sena-green/10 rounded-lg" title="Editar"><Edit className="w-4 h-4" /></button><button onClick={() => handleDeleteGroup(group.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg" title="Eliminar"><Trash2 className="w-4 h-4" /></button></div></div><p className="mt-3 text-sm"><span className="font-medium">Docentes:</span> {group.teachers.map(teacher => teacher.name).join(", ") || "Sin asignar"}</p><p className="mt-1 text-sm"><span className="font-medium">Aprendices ({group.students.length}):</span> {group.students.map(student => student.name).join(", ") || "Sin asignar"}</p></div>)}{groups.length === 0 && <p className="p-8 text-center text-muted-foreground">Aún no hay fichas creadas.</p>}</div></section>
              </div>
            </motion.div>
          )}

          {/* ══ Documents ══ */}
          {activeTab === "documents" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Diccionario Multimedia</h2>
                  <p className="text-muted-foreground">Administra los diccionarios organizados por asignatura.</p>
                </div>
                <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium shadow-lg shadow-sena-green/25">
                  <Plus className="w-5 h-5" /> Nueva Palabra
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Diccionarios", value: dictionaryStats.dictionaries, icon: BookOpen, tone: "green" as const },
                  { label: "Palabras", value: dictionaryStats.words, icon: FileText, tone: "blue" as const },
                  { label: "Imagenes", value: dictionaryStats.images, icon: ImageIcon, tone: "blue-soft" as const },
                  { label: "Audios", value: dictionaryStats.audios + dictionaryStats.videos, icon: Music, tone: "green" as const },
                ].map((stat, i) => (
                  <StatCard key={i} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} delay={i * 0.05} />
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {dictionaryGroups.map((dictionary) => (
                  <DictionaryFolderCard
                    key={dictionary.subject}
                    dictionary={dictionary}
                    onOpen={openDictionary}
                    onDownload={downloadDictionary}
                    onDelete={deleteDictionary}
                    onEdit={editDictionary}
                    onAddContent={addDictionaryContent}
                  />
                ))}
                {dictionaryGroups.length === 0 && (
                  <div className="md:col-span-2 xl:col-span-3 bg-white border border-dashed border-border rounded-2xl p-10 text-center">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold text-foreground mb-2">No hay diccionarios creados</h3>
                    <p className="text-muted-foreground mb-4">Sube una palabra con asignatura y multimedia para crear el primer paquete.</p>
                    <button onClick={() => setShowUploadModal(true)} className="inline-flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl hover:bg-sena-green-dark transition-colors">
                      <Upload className="w-5 h-5" /> Subir contenido
                    </button>
                  </div>
                )}
              </div>

              {/* Explorador multimedia (MinIO): Programa > Ficha > Tipo, y su inversa */}
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Archivos Multimedia (MinIO)</h3>
                  <p className="text-sm text-muted-foreground">
                    Imágenes, audios y videos subidos, organizados por programa y ficha.
                  </p>
                </div>
                <MediaHierarchyExplorer />
              </div>

              <DictionaryExplorer
                subject={selectedDictionary ?? ""}
                open={dictionaryOpen && Boolean(selectedDictionary)}
                onClose={closeDictionary}
              />
            </motion.div>
          )}

          {/* ══ Subjects ══ */}
          {activeTab === "subjects" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-foreground">Asignaturas</h2><p className="text-muted-foreground">Organiza el contenido por áreas temáticas</p></div>
                <button onClick={() => setShowSubjectModal(true)} className="flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium shadow-lg shadow-sena-green/25">
                  <Plus className="w-5 h-5" /> Nueva Asignatura
                </button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(subject => {
                  const docsCount = documents.filter(d => d.subjectId === subject.id).length;
                  return (
                    <motion.div key={subject.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: subject.color }} />
                      <div className="flex items-start justify-between mb-4 pt-2">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${subject.color}20` }}>
                          <BookOpen className="w-6 h-6" style={{ color: subject.color }} />
                        </div>
                        <button onClick={() => handleDeleteSubject(subject.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h4 className="font-semibold text-foreground mb-2">{subject.name}</h4>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{subject.description}</p>
                      <div className="flex items-center justify-between pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="w-4 h-4" /><span>{docsCount} archivo{docsCount !== 1 ? "s" : ""}</span></div>
                        <span className="text-xs text-muted-foreground">{subject.createdAt}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* ══ Modal: Agregar Usuario ══ */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">Agregar Usuario</h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
                    <input type="text" value={newUser.first_name} onChange={e => setNewUser({ ...newUser, first_name: e.target.value })} required
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Apellido</label>
                    <input type="text" value={newUser.last_name} onChange={e => setNewUser({ ...newUser, last_name: e.target.value })} required
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" /></div>
                </div>
                <div><label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" /></div>
                <div><label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required minLength={6}
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Tipo Doc</label>
                    <select value={newUser.doc_type} onChange={e => setNewUser({ ...newUser, doc_type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                      <option value="CC">Cédula</option>
                      <option value="CE">Cédula Ext.</option>
                      <option value="TI">Tarjeta Identidad</option>
                      <option value="PS">Pasaporte</option>
                    </select></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Número Doc</label>
                    <input type="text" value={newUser.doc_num} onChange={e => setNewUser({ ...newUser, doc_num: e.target.value })} required
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Teléfono</label>
                    <input type="text" value={newUser.phone_num} onChange={e => setNewUser({ ...newUser, phone_num: e.target.value })}
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" /></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Rol</label>
                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value, program: "" })}
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                      <option value="student">Estudiante</option>
                      <option value="teacher">Docente</option>
                      <option value="admin">Administrador</option>
                    </select></div>
                </div>
                {(newUser.role === "teacher" || newUser.role === "student") && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Programa SENA</label>
                    <select
                      value={newUser.program}
                      onChange={e => setNewUser({ ...newUser, program: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                    >
                      <option value="">Seleccionar programa</option>
                      {senaPrograms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium">Crear Usuario</button>
                  <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-medium">Cancelar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Modal: Editar Permisos ══ */}
      <AnimatePresence>
        {showEditUserModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div><h3 className="text-xl font-bold text-foreground">Editar Permisos</h3><p className="text-sm text-muted-foreground">{selectedUser.name}</p></div>
                <button onClick={() => { setShowEditUserModal(false); setSelectedUser(null); }} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <PermissionsEditor permissions={selectedUser.permissions} onSave={handleSaveUserPermissions} onCancel={() => { setShowEditUserModal(false); setSelectedUser(null); }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>



      {/* ══ Modal: Editar Datos Usuario ══ */}
      <AnimatePresence>
        {showEditDataModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Editar Usuario</h3>
                  <p className="text-sm text-muted-foreground">Modifica los datos básicos</p>
                </div>
                <button
                  onClick={() => setShowEditDataModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveUserData} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={editUserData.name}
                    onChange={(e) =>
                      setEditUserData({ ...editUserData, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editUserData.email}
                    onChange={(e) =>
                      setEditUserData({ ...editUserData, email: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editUserData.phone_num}
                    onChange={(e) =>
                      setEditUserData({ ...editUserData, phone_num: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                  />
                </div>
                {(editUserData.role === "teacher" || editUserData.role === "student") && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Programa SENA
                    </label>
                    <select
                      value={editUserData.program}
                      onChange={(e) =>
                        setEditUserData({ ...editUserData, program: e.target.value })
                      }
                      required
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                    >
                      <option value="">Seleccionar programa</option>
                      {senaPrograms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditDataModal(false)}
                    className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Modal: Nueva Asignatura ══ */}
      <AnimatePresence>
        {showSubjectModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">Nueva Asignatura</h3>
                <button onClick={() => setShowSubjectModal(false)} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <div><label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
                  <input type="text" value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} required placeholder="Ej: Gramática Avanzada" className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" /></div>
                <div><label className="block text-sm font-medium text-foreground mb-1.5">Descripción</label>
                  <textarea value={newSubject.description} onChange={e => setNewSubject({ ...newSubject, description: e.target.value })} required rows={3} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 resize-none" /></div>
                <div><label className="block text-sm font-medium text-foreground mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {["#3F8F5B", "#135D83", "#C4943B", "#C45D55", "#9333EA", "#06B6D4"].map(color => (
                      <button key={color} type="button" onClick={() => setNewSubject({ ...newSubject, color })}
                        className={`w-10 h-10 rounded-xl transition-all ${newSubject.color === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`}
                        style={{ backgroundColor: color }} />
                    ))}
                  </div></div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium">Crear</button>
                  <button type="button" onClick={() => setShowSubjectModal(false)} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-medium">Cancelar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Modal: Subir Archivo ══ */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">Subir Archivo</h3>
                <button onClick={() => { setShowUploadModal(false); setUploadForm(createEmptyUploadForm()); }} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Archivo</label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${uploadForm.file ? "border-sena-green/60 bg-sena-green/5" : "border-border hover:border-sena-green/40"}`}>
                    <input type="file" accept={ACCEPT_ALL} onChange={e => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      {uploadForm.file ? (
                        <div className="flex flex-col items-center gap-2">
                          {uploadCat === "audio" && <Music className="w-10 h-10 text-purple-500" />}
                          {uploadCat === "video" && <Film className="w-10 h-10 text-sena-blue" />}
                          {uploadCat === "image" && <ImageIcon className="w-10 h-10 text-blue-500" />}
                          {uploadCat === "document" && <FileText className="w-10 h-10 text-sena-green" />}
                          <p className="text-sm font-semibold text-foreground">{uploadForm.file.name}</p>
                          <span className="text-xs text-sena-green font-medium">Clic para cambiar</span>
                        </div>
                      ) : (
                        <><Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-sm font-medium text-foreground">Haz clic para seleccionar</p></>
                      )}
                    </label>
                  </div>
                </div>
                {uploadCat === "audio" && uploadForm.previewUrl && (
                  <div className="bg-purple-50 rounded-xl p-4"><p className="text-xs font-semibold text-purple-700 mb-2">Vista previa del audio</p><audio controls src={uploadForm.previewUrl} className="w-full h-10" /></div>
                )}
                {uploadCat === "video" && uploadForm.previewUrl && (
                  <div className="bg-sena-blue/5 rounded-xl overflow-hidden"><video controls src={uploadForm.previewUrl} className="w-full max-h-40 object-contain bg-black" /></div>
                )}
                {uploadCat === "image" && uploadForm.previewUrl && (
                  <div className="bg-blue-50 rounded-xl overflow-hidden border border-blue-100"><img src={uploadForm.previewUrl} alt="Vista previa" className="w-full max-h-48 object-contain bg-white" /></div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Asignatura</label>
                    <select value={uploadForm.subjectId} onChange={e => setUploadForm({ ...uploadForm, subjectId: e.target.value })} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                      <option value="">Sin asignar</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Ficha</label>
                    <select
                      value={uploadForm.ficha}
                      onChange={e => {
                        const selectedFicha = e.target.value;
                        const group = groups.find(g => g.ficha === selectedFicha);
                        setUploadForm({
                          ...uploadForm,
                          ficha: selectedFicha,
                          // El programa queda asignado automáticamente según la ficha.
                          program: group?.program || "",
                        });
                      }}
                      className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                    >
                      <option value="">Sin ficha (todos los programas)</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.ficha}>
                          Ficha {g.ficha} — {g.program}
                        </option>
                      ))}
                    </select>
                    {uploadForm.program && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Programa: <span className="font-medium text-foreground">{uploadForm.program}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-sena-green" />Informacion del Diccionario Digital</p>
                  <div className="space-y-3">
                    <div><label className="block text-sm font-medium text-foreground mb-1.5">Definicion</label>
                      <textarea value={uploadForm.definition} onChange={e => setUploadForm({ ...uploadForm, definition: e.target.value })} rows={2} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 resize-none" /></div>
                    <div><label className="block text-sm font-medium text-foreground mb-1.5">Sinonimos</label>
                      <input type="text" value={uploadForm.synonyms} onChange={e => setUploadForm({ ...uploadForm, synonyms: e.target.value })} placeholder="Separados por comas" className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" /></div>
                    <div><label className="block text-sm font-medium text-foreground mb-1.5">Nivel</label>
                      <select value={uploadForm.level} onChange={e => setUploadForm({ ...uploadForm, level: e.target.value })} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                        <option value="">Seleccionar nivel</option>
                        {["A1", "A2", "B1", "B2"].map(l => <option key={l} value={l}>{l}</option>)}
                      </select></div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={!uploadForm.file} className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed">Subir Archivo</button>
                  <button type="button" onClick={() => { setShowUploadModal(false); setUploadForm(createEmptyUploadForm()); }} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-medium">Cancelar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PermissionsEditor ───────────────────────────────────────────────────────
function PermissionsEditor({ permissions, onSave, onCancel }: { permissions: UserPermissions; onSave: (p: UserPermissions) => void; onCancel: () => void }) {
  const [edited, setEdited] = useState(permissions);
  const items: { key: keyof UserPermissions; label: string; description: string }[] = [
    { key: "canManageUsers", label: "Gestionar Usuarios", description: "Crear, editar y eliminar usuarios" },
    { key: "canManageDocuments", label: "Gestionar Documentos", description: "Subir y eliminar documentos" },
    { key: "canViewStatistics", label: "Ver Estadísticas", description: "Acceder a reportes y métricas" },
    { key: "canGiveFeedback", label: "Dar Retroalimentación", description: "Comentar en resultados" },
    { key: "canTakeQuiz", label: "Realizar Pruebas", description: "Acceso a evaluaciones de inglés" },
    { key: "canViewResults", label: "Ver Resultados", description: "Ver resultados de pruebas" },
    { key: "canManageSubjects", label: "Gestionar Asignaturas", description: "Crear y editar asignaturas" },
    { key: "canConfigureLevels", label: "Configurar Niveles", description: "Ajustar rangos de evaluación" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
        {items.map(perm => (
          <button key={perm.key} type="button" onClick={() => setEdited(prev => ({ ...prev, [perm.key]: !prev[perm.key] }))}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${edited[perm.key] ? "border-sena-green bg-sena-green/5" : "border-border bg-white hover:border-muted-foreground/30"}`}>
            <div className="text-left">
              <p className="font-medium text-foreground">{perm.label}</p>
              <p className="text-sm text-muted-foreground">{perm.description}</p>
            </div>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${edited[perm.key] ? "bg-sena-green text-white" : "bg-muted"}`}>
              {edited[perm.key] && <Check className="w-4 h-4" />}
            </div>
          </button>
        ))}
      </div>
      <div className="flex gap-3 pt-4 border-t border-border">
        <button onClick={() => onSave(edited)} className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium">Guardar Cambios</button>
        <button onClick={onCancel} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-medium">Cancelar</button>
      </div>
    </div>
  );
}
