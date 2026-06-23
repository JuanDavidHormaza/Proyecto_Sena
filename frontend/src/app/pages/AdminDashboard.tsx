// frontend/src/pages/AdminDashboard.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  LogOut, Users, Upload, FileText, Trash2, Plus, Search,
  GraduationCap, BarChart3, BookOpen, Settings, X,
  Check, Filter, Eye, ToggleLeft, ToggleRight,
  FolderOpen, Download, Play, Pause, Music, Video,
  Volume2, Film, TrendingUp, PieChart, Activity, Calendar,
  Award, Target, Zap, ChevronUp, ChevronDown, RefreshCw,
  Shield,
  Edit, 
} from "lucide-react";
import {
  mockUsers, User, UserPermissions, getDefaultPermissions,
  mockDocuments, Document, mockSubjects, Subject, senaPrograms,
  mockTestResults,
} from "../data/users";
import * as api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

// ─── Tipos de archivo ─────────────────────────────────────────────────────────
type FileCategory = "document" | "audio" | "video";

function getFileCategory(filename: string): FileCategory {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a", "webm"].includes(ext)) return "audio";
  if (["mp4", "mov", "avi", "mkv", "ogv", "3gp"].includes(ext)) return "video";
  return "document";
}

const ACCEPT_ALL = ".pdf,.doc,.docx,.txt,.xlsx,.mp3,.wav,.ogg,.flac,.aac,.m4a,.mp4,.mov,.avi,.mkv,.webm";

function categoryMeta(cat: FileCategory) {
  switch (cat) {
    case "audio": return { icon: Music, bg: "bg-purple-100", text: "text-purple-600", label: "Audio" };
    case "video": return { icon: Film, bg: "bg-sena-blue/10", text: "text-sena-blue", label: "Video" };
    default:      return { icon: FileText, bg: "bg-sena-green/10", text: "text-sena-green", label: "Doc" };
  }
}

// ─── Reproductores inline ─────────────────────────────────────────────────────
function AudioPlayer({ src, name }: { src: string; name: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);
  const toggle = () => {
    if (!ref.current) return;
    playing ? ref.current.pause() : ref.current.play();
    setPlaying(!playing);
  };
  return (
    <div className="mt-3 flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3">
      <audio ref={ref} src={src} onEnded={() => setPlaying(false)} />
      <button onClick={toggle} className="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors flex-shrink-0">
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-purple-700 truncate">{name}</p>
        <div className="flex items-center gap-1 mt-1">
          <Volume2 className="w-3 h-3 text-purple-400" />
          <p className="text-xs text-purple-400">{playing ? "Reproduciendo..." : "Pausado"}</p>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ src, name }: { src: string; name: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const toggle = () => {
    if (!ref.current) return;
    playing ? ref.current.pause() : ref.current.play();
    setPlaying(!playing);
  };
  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-sena-blue/20">
      <div className="relative bg-gray-900 aspect-video">
        <video ref={ref} src={src} className="w-full h-full object-contain" onEnded={() => setPlaying(false)} />
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <button onClick={toggle} className="w-12 h-12 bg-white/90 text-sena-blue rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg">
              <Play className="w-6 h-6 ml-0.5" />
            </button>
          </div>
        )}
        {playing && (
          <button onClick={toggle} className="absolute bottom-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors">
            <Pause className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="px-3 py-2 bg-sena-blue/5 flex items-center gap-2">
        <Video className="w-3.5 h-3.5 text-sena-blue" />
        <p className="text-xs font-medium text-sena-blue truncate">{name}</p>
      </div>
    </div>
  );
}

// ─── DocumentCard ─────────────────────────────────────────────────────────────
function DocumentCard({ doc, subjects, onDelete, onAssign }: {
  doc: Document & { objectUrl?: string; category?: FileCategory; definition?: string; synonyms?: string; level?: string };
  subjects: Subject[];
  onDelete: (id: string) => void;
  onAssign: (id: string, subjectId: string) => void;
}) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const cat: FileCategory = doc.category ?? getFileCategory(doc.name);
  const meta = categoryMeta(cat);
  const Icon = meta.icon;
  const hasDigitalDictInfo = doc.definition || doc.synonyms || doc.level;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.bg}`}>
          <Icon className={`w-6 h-6 ${meta.text}`} />
        </div>
        <div className="flex items-center gap-1">
          {(cat === "audio" || cat === "video") && doc.objectUrl ? (
            <button onClick={() => setShowPlayer(p => !p)}
              className={`p-2 rounded-lg transition-colors ${showPlayer ? "bg-sena-green/10 text-sena-green" : "text-muted-foreground hover:text-sena-green hover:bg-sena-green/10"}`}>
              {cat === "audio" ? <Music className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
          ) : (
            <button className="p-2 text-muted-foreground hover:text-sena-blue hover:bg-sena-blue/10 rounded-lg transition-colors">
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 text-muted-foreground hover:text-sena-green hover:bg-sena-green/10 rounded-lg transition-colors">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(doc.id)} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <h4 className="font-semibold text-foreground line-clamp-1 flex-1">{doc.name}</h4>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>{meta.label}</span>
        {doc.level && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${doc.level.startsWith('C') ? 'bg-sena-green/10 text-sena-green' : doc.level.startsWith('B') ? 'bg-sena-blue/10 text-sena-blue' : 'bg-warning/10 text-warning'}`}>
            {doc.level}
          </span>
        )}
      </div>
      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground truncate">{doc.program}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{doc.size}</span><span>·</span><span>{doc.uploadedAt}</span>
        </div>
      </div>
      {hasDigitalDictInfo && (
        <div className="mb-4">
          <button onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-sena-green hover:text-sena-green-dark transition-colors font-medium">
            <BookOpen className="w-4 h-4" />
            {showDetails ? 'Ocultar detalles' : 'Ver detalles del diccionario'}
          </button>
          <AnimatePresence>
            {showDetails && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-sena-green/5 rounded-xl border border-sena-green/20 space-y-2 overflow-hidden">
                {doc.definition && (<div><p className="text-xs font-semibold text-sena-green mb-1">Definicion:</p><p className="text-sm text-foreground">{doc.definition}</p></div>)}
                {doc.synonyms && (
                  <div>
                    <p className="text-xs font-semibold text-sena-green mb-1">Sinonimos:</p>
                    <div className="flex flex-wrap gap-1">
                      {doc.synonyms.split(',').map((syn, i) => (
                        <span key={i} className="text-xs bg-white px-2 py-0.5 rounded-full border border-sena-green/30 text-foreground">{syn.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      <AnimatePresence>
        {showPlayer && doc.objectUrl && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            {cat === "audio" && <AudioPlayer src={doc.objectUrl} name={doc.name} />}
            {cat === "video" && <VideoPlayer src={doc.objectUrl} name={doc.name} />}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="mt-3">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Asignatura</label>
        <select value={doc.subjectId || ""} onChange={e => onAssign(doc.id, e.target.value)}
          className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sena-green/50">
          <option value="">Sin asignar</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
    </motion.div>
  );
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
type TabType = "overview" | "users" | "documents" | "subjects" | "analytics";
type ExtendedDocument = Document & { objectUrl?: string; category?: FileCategory; definition?: string; synonyms?: string; level?: string; };

// ─── Etiquetas de rol para mostrar ───────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  superadmin: "SuperAdmin",
  admin: "Administrador",
  teacher: "Docente",
  student: "Estudiante",
};

const ROLE_COLORS: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  admin: "bg-destructive/10 text-destructive",
  teacher: "bg-sena-blue/10 text-sena-blue",
  student: "bg-sena-green/10 text-sena-green",
};

// ════════════════════════════════════════════════════════════════════════════
export function AdminDashboard() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isSuperAdmin = authUser?.role === "superadmin";

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<ExtendedDocument[]>(mockDocuments);
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showEditDataModal, setShowEditDataModal] = useState(false);
  const [editUserData, setEditUserData] = useState({ id: "", name: "", email: "", phone_num: "" });

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | FileCategory>("all");

  const [newUser, setNewUser] = useState({
  first_name: "", last_name: "", email: "", password: "",
  doc_type: "CC", doc_num: "", phone_num: "", role: "student", program: ""});  
  const [newSubject, setNewSubject] = useState({ name: "", description: "", color: "#39A900" });
  const [uploadForm, setUploadForm] = useState({ file: null as File | null, subjectId: "", program: "", previewUrl: "", definition: "", synonyms: "", level: "" });

  // ── Cargar datos ──────────────────────────────────────────────────────────
  const loadDataFromApi = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [apiUsers, apiSubjects, apiDocs] = await Promise.all([
        api.getUsers(),
        api.getSubjects(),
        api.getDocuments(),
      ]);

      const convertedUsers: User[] = apiUsers.map(u => ({
        id: u.id, name: u.name, email: u.email, password: '',
        role: u.role as any, permissions: u.permissions, status: u.status,
        createdAt: new Date().toISOString().split('T')[0],
        docType: u.docType, docNum: u.docNum,
        phoneNum: u.phoneNum?.toString(),
        firstName: u.firstName, lastName: u.lastName,
      }));

      const convertedSubjects: Subject[] = apiSubjects.map(s => ({
        id: s.id, name: s.name, description: s.description, color: s.color,
        createdAt: s.createdAt || new Date().toISOString().split('T')[0],
      }));

      const convertedDocs: ExtendedDocument[] = apiDocs.map(d => ({
        id: d.id, name: d.name, subjectId: d.subjectId, subjectName: d.subjectName,
        program: d.program, uploadedAt: d.uploadedAt || new Date().toISOString().split('T')[0],
        fileType: d.fileType, size: d.size, uploadedBy: d.uploadedBy,
        definition: d.definition, synonyms: d.synonyms, level: undefined,
      }));

      setUsers(convertedUsers.length > 0 ? convertedUsers : mockUsers);
      setSubjects(convertedSubjects.length > 0 ? convertedSubjects : mockSubjects);
      setDocuments(convertedDocs.length > 0 ? convertedDocs : mockDocuments);
    } catch (error) {
      setUsers(mockUsers);
      setSubjects(mockSubjects);
      setDocuments(mockDocuments);
    }
    setIsLoading(false);
  };

  useEffect(() => { loadDataFromApi(); }, []);

  // ── Handlers con API real ─────────────────────────────────────────────────
  const handleLogout = () => { localStorage.clear(); navigate("/"); };

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

  const handleEditUserPermissions = (user: User) => { setSelectedUser(user); setShowEditUserModal(true); };


  // Abre el modal con los datos del usuario
const handleEditUserData = (user: User) => {
  setEditUserData({
    id: user.id,
    name: user.name,
    email: user.email,
    phone_num: user.phoneNum || "", // mapeamos phoneNum a phone_num
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
    setNewSubject({ name: "", description: "", color: "#39A900" });
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (confirm("¿Eliminar esta asignatura?")) setSubjects(subjects.filter(s => s.id !== subjectId));
  };

  const handleFileSelect = (file: File) => {
    setUploadForm({ ...uploadForm, file, previewUrl: URL.createObjectURL(file) });
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) return;
    const cat = getFileCategory(uploadForm.file.name);
    const selectedSubject = subjects.find(s => s.id === uploadForm.subjectId);
    const newDoc: ExtendedDocument = {
      id: Date.now().toString(), name: uploadForm.file.name,
      subjectId: uploadForm.subjectId || null, subjectName: selectedSubject?.name || "Sin asignar",
      program: uploadForm.program || "Todos los programas",
      uploadedAt: new Date().toISOString().split("T")[0],
      fileType: uploadForm.file.name.split(".").pop()?.toUpperCase() || "FILE",
      size: `${(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB`,
      uploadedBy: "Administrador SENA",
      objectUrl: uploadForm.previewUrl, category: cat,
      definition: uploadForm.definition || undefined,
      synonyms: uploadForm.synonyms || undefined,
      level: uploadForm.level || undefined,
    };
    setDocuments([...documents, newDoc]);
    setShowUploadModal(false);
    setUploadForm({ file: null, subjectId: "", program: "", previewUrl: "", definition: "", synonyms: "", level: "" });
  };

  const handleDeleteDocument = (docId: string) => {
    if (confirm("¿Eliminar este documento?")) setDocuments(documents.filter(d => d.id !== docId));
  };

  const handleAssignSubject = (docId: string, subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    setDocuments(documents.map(d => d.id === docId ? { ...d, subjectId: subjectId || null, subjectName: subject?.name || "Sin asignar" } : d));
  };

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (filterRole === "all" || u.role === filterRole);
  });

  const filteredDocs = documents.filter(d => filterCategory === "all" || (d.category ?? getFileCategory(d.name)) === filterCategory);

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === "active").length,
    totalDocuments: documents.length,
    totalSubjects: subjects.length,
    students: users.filter(u => u.role === "student").length,
    teachers: users.filter(u => u.role === "teacher").length,
    audios: documents.filter(d => (d.category ?? getFileCategory(d.name)) === "audio").length,
    videos: documents.filter(d => (d.category ?? getFileCategory(d.name)) === "video").length,
  };

  const tabs = [
    { id: "overview",   label: "Resumen",      icon: BarChart3 },
    { id: "analytics",  label: "Estadisticas", icon: PieChart  },
    { id: "users",      label: "Usuarios",     icon: Users     },
    { id: "documents",  label: "Documentos",   icon: FileText  },
    { id: "subjects",   label: "Asignaturas",  icon: BookOpen  },
  ];

  const uploadCat = uploadForm.file ? getFileCategory(uploadForm.file.name) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-border z-40 hidden lg:block">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 bg-sena-green rounded-xl flex items-center justify-center shadow-lg shadow-sena-green/25">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">English Test</h1>
              <p className="text-xs text-muted-foreground">
                {isSuperAdmin ? "Panel SuperAdmin" : "Panel Admin"}
              </p>
            </div>
          </div>
          {/* Badge de rol */}
          <div className={`mb-6 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 w-fit ${isSuperAdmin ? "bg-purple-100 text-purple-700" : "bg-destructive/10 text-destructive"}`}>
            <Shield className="w-3.5 h-3.5" />
            {isSuperAdmin ? "SuperAdministrador" : "Administrador"}
          </div>
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === tab.id ? "bg-sena-green text-white shadow-lg shadow-sena-green/25" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all font-medium">
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sena-green rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">{isSuperAdmin ? "SuperAdmin" : "Admin"}</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${activeTab === tab.id ? "bg-sena-green text-white" : "bg-muted text-muted-foreground"}`}>
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
                  { label: "Total Usuarios",    value: stats.totalUsers,     icon: Users,    color: "sena-green"  },
                  { label: "Usuarios Activos",  value: stats.activeUsers,    icon: Check,    color: "sena-blue"   },
                  { label: "Documentos",        value: stats.totalDocuments, icon: FileText, color: "warning"     },
                  { label: "Asignaturas",       value: stats.totalSubjects,  icon: BookOpen, color: "destructive" },
                ].map((stat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                    <div className={`w-12 h-12 bg-${stat.color}/10 rounded-xl flex items-center justify-center mb-3`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Music className="w-6 h-6 text-purple-600" />
                  </div>
                  <div><p className="text-2xl font-bold text-foreground">{stats.audios}</p><p className="text-sm text-muted-foreground">Archivos de audio</p></div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                    <Film className="w-6 h-6 text-sena-blue" />
                  </div>
                  <div><p className="text-2xl font-bold text-foreground">{stats.videos}</p><p className="text-sm text-muted-foreground">Archivos de video</p></div>
                </div>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
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
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <h3 className="font-semibold text-foreground mb-4">Acciones Rápidas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setActiveTab("users")} className="flex items-center gap-2 p-3 bg-sena-green/10 text-sena-green rounded-xl hover:bg-sena-green/20 transition-all font-medium text-sm"><Users className="w-4 h-4" /> Ver Usuarios</button>
                    <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 p-3 bg-sena-blue/10 text-sena-blue rounded-xl hover:bg-sena-blue/20 transition-all font-medium text-sm"><Upload className="w-4 h-4" /> Subir Archivo</button>
                    <button onClick={() => setShowSubjectModal(true)} className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-xl hover:bg-warning/20 transition-all font-medium text-sm"><BookOpen className="w-4 h-4" /> Nueva Asignatura</button>
                    <button onClick={() => setActiveTab("documents")} className="flex items-center gap-2 p-3 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-all font-medium text-sm"><Settings className="w-4 h-4" /> Gestionar</button>
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
                {[
                  { label: "Promedio General", value: `${mockTestResults.length ? Math.round(mockTestResults.reduce((a, r) => a + r.score, 0) / mockTestResults.length) : 0}%`, icon: Target, color: "sena-green", trend: "+5.2%", up: true },
                  { label: "Pruebas Completadas", value: mockTestResults.length, icon: Award, color: "sena-blue", trend: "+12", up: true },
                  { label: "Estudiantes Activos", value: users.filter(u => u.role === 'student' && u.status === 'active').length, icon: Users, color: "warning", trend: "+3", up: true },
                  { label: "Tasa de Aprobacion", value: `${mockTestResults.length ? Math.round((mockTestResults.filter(r => r.score >= 60).length / mockTestResults.length) * 100) : 0}%`, icon: Zap, color: "destructive", trend: "+2.1%", up: true },
                ].map((kpi, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-2xl p-5 border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-11 h-11 bg-${kpi.color}/10 rounded-xl flex items-center justify-center`}>
                        <kpi.icon className={`w-5 h-5 text-${kpi.color}`} />
                      </div>
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
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <h3 className="font-semibold text-foreground mb-6">Distribucion por Nivel</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie data={[
                          { name: 'Basico (A1-A2)', value: mockTestResults.filter(r => r.level.startsWith('A')).length, color: '#E21B3C' },
                          { name: 'Intermedio (B1-B2)', value: mockTestResults.filter(r => r.level.startsWith('B')).length, color: '#D89E00' },
                          { name: 'Avanzado (C1-C2)', value: mockTestResults.filter(r => r.level.startsWith('C')).length, color: '#39A900' },
                        ]} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value"
                          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                          {['#E21B3C', '#D89E00', '#39A900'].map((color, index) => <Cell key={index} fill={color} />)}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <h3 className="font-semibold text-foreground mb-6">Tendencia de Puntuaciones</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[{ mes: 'Ene', promedio: 65 }, { mes: 'Feb', promedio: 68 }, { mes: 'Mar', promedio: 72 }, { mes: 'Abr', promedio: 75 }]}>
                        <defs>
                          <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#39A900" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#39A900" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                        <Area type="monotone" dataKey="promedio" stroke="#39A900" strokeWidth={2} fillOpacity={1} fill="url(#colorPromedio)" />
                      </AreaChart>
                    </ResponsiveContainer>
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
                          const canModify = isSuperAdmin && !isSelf;

                          return (
                            <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-4 px-5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium ${ROLE_COLORS[user.role]?.replace('text-', 'bg-').replace('/10', '') || 'bg-gray-400'}`}
                                    style={{ background: user.role === 'superadmin' ? '#7c3aed' : user.role === 'admin' ? '#ef4444' : user.role === 'teacher' ? '#1F4E78' : '#39A900' }}>
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground flex items-center gap-2">
                                      {user.name}
                                      {isSelf && <span className="text-xs bg-sena-green/10 text-sena-green px-1.5 py-0.5 rounded-full">Tú</span>}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-5">
                                {canModify && !isTargetSuperAdmin ? (
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
                                  <button onClick={() => handleEditUserPermissions(user)}
                                    className="p-2 text-sena-blue hover:bg-sena-blue/10 rounded-lg transition-colors" title="Editar permisos">
                                    <Settings className="w-4 h-4" />
                                  </button>
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

          {/* ══ Documents ══ */}
          {activeTab === "documents" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div><h2 className="text-2xl font-bold text-foreground">Archivos y Documentos</h2><p className="text-muted-foreground">Gestiona documentos, audios y videos educativos</p></div>
                <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium shadow-lg shadow-sena-green/25">
                  <Upload className="w-5 h-5" /> Subir Archivo
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {([{ key: "all", label: "Todos", icon: FolderOpen }, { key: "document", label: "Documentos", icon: FileText }, { key: "audio", label: "Audios", icon: Music }, { key: "video", label: "Videos", icon: Film }] as const).map(f => {
                  const Icon = f.icon;
                  const active = filterCategory === f.key;
                  return (
                    <button key={f.key} onClick={() => setFilterCategory(f.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${active ? "bg-sena-green text-white shadow-md" : "bg-white border border-border text-muted-foreground hover:border-sena-green/40 hover:text-sena-green"}`}>
                      <Icon className="w-4 h-4" />{f.label}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-muted"}`}>
                        {f.key === "all" ? documents.length : documents.filter(d => (d.category ?? getFileCategory(d.name)) === f.key).length}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocs.map(doc => <DocumentCard key={doc.id} doc={doc} subjects={subjects} onDelete={handleDeleteDocument} onAssign={handleAssignSubject} />)}
              </div>
              {filteredDocs.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-border">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No hay archivos</h3>
                  <p className="text-muted-foreground mb-4">Sube tu primer archivo para comenzar</p>
                  <button onClick={() => setShowUploadModal(true)} className="inline-flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl font-medium"><Upload className="w-5 h-5" /> Subir Archivo</button>
                </div>
              )}
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
      <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}
        className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
        <option value="student">Estudiante</option>
        <option value="teacher">Docente</option>
        <option value="admin">Administrador</option>
      </select></div>
  </div>
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
                    {["#39A900", "#1F4E78", "#D89E00", "#E21B3C", "#9333EA", "#06B6D4"].map(color => (
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
                <button onClick={() => { setShowUploadModal(false); setUploadForm({ file: null, subjectId: "", program: "", previewUrl: "", definition: "", synonyms: "", level: "" }); }} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
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
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Asignatura</label>
                    <select value={uploadForm.subjectId} onChange={e => setUploadForm({ ...uploadForm, subjectId: e.target.value })} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                      <option value="">Sin asignar</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select></div>
                  <div><label className="block text-sm font-medium text-foreground mb-1.5">Programa SENA</label>
                    <select value={uploadForm.program} onChange={e => setUploadForm({ ...uploadForm, program: e.target.value })} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                      <option value="">Todos los programas</option>
                      {senaPrograms.map(p => <option key={p} value={p}>{p}</option>)}
                    </select></div>
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
                        {["A1", "A2", "B1", "B2", "C1", "C2"].map(l => <option key={l} value={l}>{l}</option>)}
                      </select></div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={!uploadForm.file} className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed">Subir Archivo</button>
                  <button type="button" onClick={() => { setShowUploadModal(false); setUploadForm({ file: null, subjectId: "", program: "", previewUrl: "", definition: "", synonyms: "", level: "" }); }} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-medium">Cancelar</button>
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
    { key: "canManageUsers",     label: "Gestionar Usuarios",    description: "Crear, editar y eliminar usuarios"     },
    { key: "canManageDocuments", label: "Gestionar Documentos",  description: "Subir y eliminar documentos"           },
    { key: "canViewStatistics",  label: "Ver Estadísticas",      description: "Acceder a reportes y métricas"         },
    { key: "canGiveFeedback",    label: "Dar Retroalimentación", description: "Comentar en resultados"                },
    { key: "canTakeQuiz",        label: "Realizar Pruebas",      description: "Acceso a evaluaciones de inglés"       },
    { key: "canViewResults",     label: "Ver Resultados",        description: "Ver resultados de pruebas"             },
    { key: "canManageSubjects",  label: "Gestionar Asignaturas", description: "Crear y editar asignaturas"            },
    { key: "canConfigureLevels", label: "Configurar Niveles",   description: "Ajustar rangos de evaluación"          },
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
