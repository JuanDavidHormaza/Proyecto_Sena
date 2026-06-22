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
} from "lucide-react";
import {
  mockUsers, User, UserPermissions, getDefaultPermissions,
  mockDocuments, Document, mockSubjects, Subject, senaPrograms,
  mockTestResults,
} from "../data/users";
import * as api from "../services/api";
import {
  AreaChart, Area, BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

// ─── Tipos de archivo ────────────────────────────────────────────────────────
type FileCategory = "document" | "audio" | "video";

function getFileCategory(filename: string): FileCategory {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a", "webm"].includes(ext)) return "audio";
  if (["mp4", "mov", "avi", "mkv", "ogv", "3gp"].includes(ext)) return "video";
  return "document";
}

const ACCEPT_ALL = ".pdf,.doc,.docx,.txt,.xlsx,.mp3,.wav,.ogg,.flac,.aac,.m4a,.mp4,.mov,.avi,.mkv,.webm";

// ─── Colores / iconos por categoría ─────────────────────────────────────────
function categoryMeta(cat: FileCategory) {
  switch (cat) {
    case "audio":
      return { icon: Music,    bg: "bg-purple-100", text: "text-purple-600",  label: "Audio" };
    case "video":
      return { icon: Film,     bg: "bg-sena-blue/10", text: "text-sena-blue", label: "Video" };
    default:
      return { icon: FileText, bg: "bg-sena-green/10", text: "text-sena-green", label: "Doc"   };
  }
}

// ─── Reproductores inline ────────────────────────────────────────────────────
function AudioPlayer({ src, name }: { src: string; name: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); } else { ref.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="mt-3 flex items-center gap-3 bg-purple-50 rounded-xl px-4 py-3">
      <audio ref={ref} src={src} onEnded={() => setPlaying(false)} />
      <button
        onClick={toggle}
        className="w-9 h-9 bg-purple-600 text-white rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors flex-shrink-0"
      >
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
    if (playing) { ref.current.pause(); } else { ref.current.play(); }
    setPlaying(!playing);
  };

  return (
    <div className="mt-3 rounded-xl overflow-hidden border border-sena-blue/20">
      <div className="relative bg-gray-900 aspect-video">
        <video
          ref={ref}
          src={src}
          className="w-full h-full object-contain"
          onEnded={() => setPlaying(false)}
        />
        {/* Overlay con botón play cuando está pausado */}
        {!playing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <button
              onClick={toggle}
              className="w-12 h-12 bg-white/90 text-sena-blue rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
            >
              <Play className="w-6 h-6 ml-0.5" />
            </button>
          </div>
        )}
        {playing && (
          <button
            onClick={toggle}
            className="absolute bottom-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
          >
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

// ─── Tarjeta de documento (con reproductor si es audio/video + Digital Dict) ──
function DocumentCard({
  doc,
  subjects,
  onDelete,
  onAssign,
}: {
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all"
    >
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.bg}`}>
          <Icon className={`w-6 h-6 ${meta.text}`} />
        </div>
        <div className="flex items-center gap-1">
          {/* Botón ver/reproducir */}
          {(cat === "audio" || cat === "video") && doc.objectUrl ? (
            <button
              onClick={() => setShowPlayer((p) => !p)}
              className={`p-2 rounded-lg transition-colors ${
                showPlayer
                  ? "bg-sena-green/10 text-sena-green"
                  : "text-muted-foreground hover:text-sena-green hover:bg-sena-green/10"
              }`}
              title={showPlayer ? "Ocultar reproductor" : "Reproducir"}
            >
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
          <button
            onClick={() => onDelete(doc.id)}
            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Nombre y badges */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <h4 className="font-semibold text-foreground line-clamp-1 flex-1">{doc.name}</h4>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
          {meta.label}
        </span>
        {doc.level && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            doc.level.startsWith('C') ? 'bg-sena-green/10 text-sena-green' :
            doc.level.startsWith('B') ? 'bg-sena-blue/10 text-sena-blue' :
            'bg-warning/10 text-warning'
          }`}>
            {doc.level}
          </span>
        )}
      </div>

      {/* Meta info */}
      <div className="space-y-1 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <FolderOpen className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground truncate">{doc.program}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{doc.size}</span>
          <span>·</span>
          <span>{doc.uploadedAt}</span>
        </div>
      </div>

      {/* Digital Dictionary Info */}
      {hasDigitalDictInfo && (
        <div className="mb-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm text-sena-green hover:text-sena-green-dark transition-colors font-medium"
          >
            <BookOpen className="w-4 h-4" />
            {showDetails ? 'Ocultar detalles' : 'Ver detalles del diccionario'}
          </button>
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 p-3 bg-sena-green/5 rounded-xl border border-sena-green/20 space-y-2 overflow-hidden"
              >
                {doc.definition && (
                  <div>
                    <p className="text-xs font-semibold text-sena-green mb-1">Definicion:</p>
                    <p className="text-sm text-foreground">{doc.definition}</p>
                  </div>
                )}
                {doc.synonyms && (
                  <div>
                    <p className="text-xs font-semibold text-sena-green mb-1">Sinonimos:</p>
                    <div className="flex flex-wrap gap-1">
                      {doc.synonyms.split(',').map((syn, i) => (
                        <span key={i} className="text-xs bg-white px-2 py-0.5 rounded-full border border-sena-green/30 text-foreground">
                          {syn.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Reproductor inline (audio o video) */}
      <AnimatePresence>
        {showPlayer && doc.objectUrl && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {cat === "audio" && <AudioPlayer src={doc.objectUrl} name={doc.name} />}
            {cat === "video" && <VideoPlayer src={doc.objectUrl} name={doc.name} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Asignatura */}
      <div className="mt-3">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Asignatura</label>
        <select
          value={doc.subjectId || ""}
          onChange={(e) => onAssign(doc.id, e.target.value)}
          className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sena-green/50"
        >
          <option value="">Sin asignar</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </motion.div>
  );
}

// ─── Tipos aumentados ────────────────────────────────────────────────────────
type TabType = "overview" | "users" | "documents" | "subjects" | "analytics";

type ExtendedDocument = Document & {
  objectUrl?: string;
  category?: FileCategory;
  // Campos adicionales para Digital Dictionaries
  definition?: string;
  synonyms?: string;
  level?: string;
};

// ════════════════════════════════════════════════════════════════════════════
export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [documents, setDocuments] = useState<ExtendedDocument[]>(mockDocuments);
  const [subjects, setSubjects] = useState<Subject[]>(mockSubjects);
  const [isLoading, setIsLoading] = useState(false);
  const [useApiData, setUseApiData] = useState(true);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Selected / search states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | FileCategory>("all");

  // Form states
  const [newUser, setNewUser] = useState({
    name: "", email: "", password: "",
    role: "student" as "admin" | "teacher" | "student",
    country: "", program: "",
  });

  const [newSubject, setNewSubject] = useState({ name: "", description: "", color: "#39A900" });

  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    subjectId: "",
    program: "",
    previewUrl: "",
    // Campos Digital Dictionaries
    definition: "",
    synonyms: "",
    level: "",
  });

  // ── Cargar datos desde API ────────────────────────────────────────────────
  const loadDataFromApi = async () => {
    setIsLoading(true);
    try {
      const [apiUsers, apiSubjects, apiDocs] = await Promise.all([
        api.getUsers(),
        api.getSubjects(),
        api.getDocuments(),
      ]);
      
      // Convertir usuarios de API a formato local
      const convertedUsers: User[] = apiUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: '',
        role: u.role,
        permissions: u.permissions,
        status: u.status,
        createdAt: new Date().toISOString().split('T')[0],
        docType: u.docType,
        docNum: u.docNum,
        phoneNum: u.phoneNum?.toString(),
        firstName: u.firstName,
        lastName: u.lastName,
      }));
      
      // Convertir subjects de API a formato local
      const convertedSubjects: Subject[] = apiSubjects.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        color: s.color,
        createdAt: s.createdAt || new Date().toISOString().split('T')[0],
      }));
      
      // Convertir documentos de API a formato local
      const convertedDocs: ExtendedDocument[] = apiDocs.map((d) => ({
        id: d.id,
        name: d.name,
        subjectId: d.subjectId,
        subjectName: d.subjectName,
        program: d.program,
        uploadedAt: d.uploadedAt || new Date().toISOString().split('T')[0],
        fileType: d.fileType,
        size: d.size,
        uploadedBy: d.uploadedBy,
        definition: d.definition,
        synonyms: d.synonyms,
        level: undefined,
      }));
      
      setUsers(convertedUsers.length > 0 ? convertedUsers : mockUsers);
      setSubjects(convertedSubjects.length > 0 ? convertedSubjects : mockSubjects);
      setDocuments(convertedDocs.length > 0 ? convertedDocs : mockDocuments);
      setUseApiData(true);
    } catch (error) {
      console.log("[v0] Failed to load from API, using mock data", error);
      setUsers(mockUsers);
      setSubjects(mockSubjects);
      setDocuments(mockDocuments);
      setUseApiData(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadDataFromApi();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogout = () => { localStorage.clear(); navigate("/"); };

  const handleDeleteUser = (userId: string) => {
    if (confirm("¿Eliminar este usuario?")) setUsers(users.filter((u) => u.id !== userId));
  };

  const handleToggleUserStatus = (userId: string) => {
    setUsers(users.map((u) =>
      u.id === userId ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
    ));
  };

  const handleEditUserPermissions = (user: User) => { setSelectedUser(user); setShowEditUserModal(true); };

  const handleSaveUserPermissions = (permissions: UserPermissions) => {
    if (selectedUser) {
      setUsers(users.map((u) => u.id === selectedUser.id ? { ...u, permissions } : u));
      setShowEditUserModal(false);
      setSelectedUser(null);
    }
  };

  const handleChangeUserRole = (userId: string, newRole: "admin" | "teacher" | "student") => {
    setUsers(users.map((u) =>
      u.id === userId ? { ...u, role: newRole, permissions: getDefaultPermissions(newRole) } : u
    ));
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      id: Date.now().toString(),
      ...newUser,
      permissions: getDefaultPermissions(newUser.role),
      status: "active",
      createdAt: new Date().toISOString().split("T")[0],
    };
    setUsers([...users, user]);
    setShowUserModal(false);
    setNewUser({ name: "", email: "", password: "", role: "student", country: "", program: "" });
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const subject: Subject = {
      id: Date.now().toString(),
      ...newSubject,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setSubjects([...subjects, subject]);
    setShowSubjectModal(false);
    setNewSubject({ name: "", description: "", color: "#39A900" });
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (confirm("¿Eliminar esta asignatura?")) setSubjects(subjects.filter((s) => s.id !== subjectId));
  };

  // ── Selección de archivo en el modal ──────────────────────────────────────
  const handleFileSelect = (file: File) => {
    const url = URL.createObjectURL(file);
    setUploadForm({ ...uploadForm, file, previewUrl: url });
  };

  // ── Subir archivo (ahora con objectUrl y category + Digital Dictionaries) ──
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file) return;

    const cat = getFileCategory(uploadForm.file.name);
    const selectedSubject = subjects.find((s) => s.id === uploadForm.subjectId);

    const newDoc: ExtendedDocument = {
      id: Date.now().toString(),
      name: uploadForm.file.name,
      subjectId: uploadForm.subjectId || null,
      subjectName: selectedSubject?.name || "Sin asignar",
      program: uploadForm.program || "Todos los programas",
      uploadedAt: new Date().toISOString().split("T")[0],
      fileType: uploadForm.file.name.split(".").pop()?.toUpperCase() || "FILE",
      size: `${(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB`,
      uploadedBy: "Administrador SENA",
      // Campos nuevos
      objectUrl: uploadForm.previewUrl,
      category: cat,
      // Digital Dictionaries
      definition: uploadForm.definition || undefined,
      synonyms: uploadForm.synonyms || undefined,
      level: uploadForm.level || undefined,
    };

    setDocuments([...documents, newDoc]);
    setShowUploadModal(false);
    setUploadForm({ file: null, subjectId: "", program: "", previewUrl: "", definition: "", synonyms: "", level: "" });
  };

  const handleDeleteDocument = (docId: string) => {
    if (confirm("¿Eliminar este documento?")) setDocuments(documents.filter((d) => d.id !== docId));
  };

  const handleAssignSubject = (docId: string, subjectId: string) => {
    const subject = subjects.find((s) => s.id === subjectId);
    setDocuments(documents.map((d) =>
      d.id === docId ? { ...d, subjectId: subjectId || null, subjectName: subject?.name || "Sin asignar" } : d
    ));
  };

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filteredUsers = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (filterRole === "all" || u.role === filterRole);
  });

  const filteredDocs = documents.filter((d) =>
    filterCategory === "all" || (d.category ?? getFileCategory(d.name)) === filterCategory
  );

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    totalDocuments: documents.length,
    totalSubjects: subjects.length,
    students: users.filter((u) => u.role === "student").length,
    teachers: users.filter((u) => u.role === "teacher").length,
    audios: documents.filter((d) => (d.category ?? getFileCategory(d.name)) === "audio").length,
    videos: documents.filter((d) => (d.category ?? getFileCategory(d.name)) === "video").length,
  };

  const tabs = [
    { id: "overview",   label: "Resumen",       icon: BarChart3  },
    { id: "analytics",  label: "Estadisticas",  icon: PieChart   },
    { id: "users",      label: "Usuarios",      icon: Users      },
    { id: "documents",  label: "Documentos",    icon: FileText   },
    { id: "subjects",   label: "Asignaturas",   icon: BookOpen   },
  ];

  // ── Preview dentro del modal ───────────────────────────────────────────────
  const uploadCat = uploadForm.file ? getFileCategory(uploadForm.file.name) : null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-border z-40 hidden lg:block">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img src="/SENAIMG.png" alt="SENA Logo" className="w-11 h-11 object-contain" />
            <div>
              <h1 className="font-semibold text-foreground">English Test</h1>
              <p className="text-xs text-muted-foreground">Panel Admin</p>
            </div>
          </div>
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? "bg-sena-green text-white shadow-lg shadow-sena-green/25"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all font-medium"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/SENAIMG.png" alt="SENA Logo" className="w-10 h-10 object-contain" />
            <span className="font-semibold text-foreground">Admin</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                activeTab === tab.id ? "bg-sena-green text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="lg:ml-64 pt-32 lg:pt-0">
        <div className="p-6 lg:p-8">

          {/* ══ Overview ══ */}
          {activeTab === "overview" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Panel de Administración</h2>
                <p className="text-muted-foreground">Bienvenido al centro de control de English Level Test</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Usuarios",   value: stats.totalUsers,    icon: Users,    color: "sena-green" },
                  { label: "Usuarios Activos", value: stats.activeUsers,   icon: Check,    color: "sena-blue"  },
                  { label: "Documentos",       value: stats.totalDocuments, icon: FileText, color: "warning"   },
                  { label: "Asignaturas",      value: stats.totalSubjects,  icon: BookOpen, color: "destructive" },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-2xl p-5 border border-border shadow-sm"
                  >
                    <div className={`w-12 h-12 bg-${stat.color}/10 rounded-xl flex items-center justify-center mb-3`}>
                      <stat.icon className={`w-6 h-6 text-${stat.color}`} />
                    </div>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Media mini-stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Music className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.audios}</p>
                    <p className="text-sm text-muted-foreground">Archivos de audio</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-border shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                    <Film className="w-6 h-6 text-sena-blue" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.videos}</p>
                    <p className="text-sm text-muted-foreground">Archivos de video</p>
                  </div>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <h3 className="font-semibold text-foreground mb-4">Distribución de Usuarios</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Estudiantes</span>
                        <span className="font-medium">{stats.students}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-sena-green rounded-full" style={{ width: `${(stats.students / stats.totalUsers) * 100}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Docentes</span>
                        <span className="font-medium">{stats.teachers}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-sena-blue rounded-full" style={{ width: `${(stats.teachers / stats.totalUsers) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <h3 className="font-semibold text-foreground mb-4">Acciones Rápidas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowUserModal(true)} className="flex items-center gap-2 p-3 bg-sena-green/10 text-sena-green rounded-xl hover:bg-sena-green/20 transition-all font-medium text-sm">
                      <Plus className="w-4 h-4" /> Nuevo Usuario
                    </button>
                    <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 p-3 bg-sena-blue/10 text-sena-blue rounded-xl hover:bg-sena-blue/20 transition-all font-medium text-sm">
                      <Upload className="w-4 h-4" /> Subir Archivo
                    </button>
                    <button onClick={() => setShowSubjectModal(true)} className="flex items-center gap-2 p-3 bg-warning/10 text-warning rounded-xl hover:bg-warning/20 transition-all font-medium text-sm">
                      <BookOpen className="w-4 h-4" /> Nueva Asignatura
                    </button>
                    <button onClick={() => setActiveTab("documents")} className="flex items-center gap-2 p-3 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-all font-medium text-sm">
                      <Settings className="w-4 h-4" /> Gestionar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ Analytics - Panel de Estadísticas Avanzadas ══ */}
          {activeTab === "analytics" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Panel de Estadisticas</h2>
                <p className="text-muted-foreground">Analisis detallado del rendimiento de la plataforma</p>
              </div>

              {/* KPIs principales */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Promedio General", value: `${Math.round(mockTestResults.reduce((a, r) => a + r.score, 0) / mockTestResults.length)}%`, icon: Target, color: "sena-green", trend: "+5.2%", up: true },
                  { label: "Pruebas Completadas", value: mockTestResults.length, icon: Award, color: "sena-blue", trend: "+12", up: true },
                  { label: "Estudiantes Activos", value: users.filter(u => u.role === 'student' && u.status === 'active').length, icon: Users, color: "warning", trend: "+3", up: true },
                  { label: "Tasa de Aprobacion", value: `${Math.round((mockTestResults.filter(r => r.score >= 60).length / mockTestResults.length) * 100)}%`, icon: Zap, color: "destructive", trend: "+2.1%", up: true },
                ].map((kpi, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-2xl p-5 border border-border shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-11 h-11 bg-${kpi.color}/10 rounded-xl flex items-center justify-center`}>
                        <kpi.icon className={`w-5 h-5 text-${kpi.color}`} />
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${kpi.up ? 'text-sena-green' : 'text-destructive'}`}>
                        {kpi.up ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {kpi.trend}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Gráficos principales */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Rendimiento por Nivel */}
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-foreground">Distribucion por Nivel</h3>
                      <p className="text-sm text-muted-foreground">Clasificacion de estudiantes</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Ultimo mes</span>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={[
                            { name: 'Basico (A1-A2)', value: mockTestResults.filter(r => r.level.startsWith('A')).length, color: '#E21B3C' },
                            { name: 'Intermedio (B1-B2)', value: mockTestResults.filter(r => r.level.startsWith('B')).length, color: '#D89E00' },
                            { name: 'Avanzado (C1-C2)', value: mockTestResults.filter(r => r.level.startsWith('C')).length, color: '#39A900' },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: 'Basico', color: '#E21B3C' },
                            { name: 'Intermedio', color: '#D89E00' },
                            { name: 'Avanzado', color: '#39A900' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Tendencia de puntuaciones */}
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-foreground">Tendencia de Puntuaciones</h3>
                      <p className="text-sm text-muted-foreground">Promedio mensual de calificaciones</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-sena-green/10 text-sena-green rounded-lg">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">+12%</span>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={[
                        { mes: 'Ene', promedio: 65, estudiantes: 12 },
                        { mes: 'Feb', promedio: 68, estudiantes: 18 },
                        { mes: 'Mar', promedio: 72, estudiantes: 24 },
                        { mes: 'Abr', promedio: 75, estudiantes: 32 },
                      ]}>
                        <defs>
                          <linearGradient id="colorPromedio" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#39A900" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#39A900" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="mes" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                        />
                        <Area type="monotone" dataKey="promedio" stroke="#39A900" strokeWidth={2} fillOpacity={1} fill="url(#colorPromedio)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Segunda fila de gráficos */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Rendimiento por Programa */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-foreground">Rendimiento por Programa SENA</h3>
                      <p className="text-sm text-muted-foreground">Comparativa de promedios por carrera</p>
                    </div>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { programa: 'Desarrollo', promedio: 78, estudiantes: 45 },
                        { programa: 'Analisis', promedio: 72, estudiantes: 32 },
                        { programa: 'Redes', promedio: 68, estudiantes: 28 },
                        { programa: 'Diseno', promedio: 82, estudiantes: 20 },
                        { programa: 'Marketing', promedio: 75, estudiantes: 15 },
                      ]} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis type="number" domain={[0, 100]} stroke="#9ca3af" fontSize={12} />
                        <YAxis dataKey="programa" type="category" stroke="#9ca3af" fontSize={12} width={80} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}
                          formatter={(value, name) => [name === 'promedio' ? `${value}%` : value, name === 'promedio' ? 'Promedio' : 'Estudiantes']}
                        />
                        <Bar dataKey="promedio" fill="#1F4E78" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Radar de competencias */}
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <div className="mb-6">
                    <h3 className="font-semibold text-foreground">Competencias</h3>
                    <p className="text-sm text-muted-foreground">Promedio por habilidad</p>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { skill: 'Grammar', value: 75 },
                        { skill: 'Vocabulary', value: 82 },
                        { skill: 'Reading', value: 78 },
                        { skill: 'Listening', value: 70 },
                        { skill: 'Writing', value: 65 },
                      ]}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="skill" stroke="#9ca3af" fontSize={11} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#9ca3af" fontSize={10} />
                        <Radar name="Promedio" dataKey="value" stroke="#39A900" fill="#39A900" fillOpacity={0.3} strokeWidth={2} />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Tabla de mejores estudiantes */}
              <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-foreground">Top Estudiantes</h3>
                    <p className="text-sm text-muted-foreground">Mejores calificaciones del periodo</p>
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground rounded-xl hover:bg-muted/80 transition-all text-sm font-medium">
                    <Download className="w-4 h-4" />
                    Exportar
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Posicion</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Estudiante</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Programa</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Puntuacion</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Nivel</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Tendencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockTestResults
                        .sort((a, b) => b.score - a.score)
                        .slice(0, 5)
                        .map((result, index) => {
                          const student = users.find(u => u.id === result.userId);
                          return (
                            <tr key={result.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-4 px-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                  index === 1 ? 'bg-gray-100 text-gray-700' :
                                  index === 2 ? 'bg-orange-100 text-orange-700' :
                                  'bg-muted text-muted-foreground'
                                }`}>
                                  {index + 1}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-sena-green rounded-xl flex items-center justify-center text-white font-medium">
                                    {result.userName.charAt(0)}
                                  </div>
                                  <span className="font-medium text-foreground">{result.userName}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-muted-foreground">{student?.program || 'N/A'}</td>
                              <td className="py-4 px-4">
                                <span className={`text-lg font-bold ${
                                  result.score >= 80 ? 'text-sena-green' : 
                                  result.score >= 60 ? 'text-warning' : 'text-destructive'
                                }`}>{result.score}%</span>
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                                  result.level.startsWith('C') ? 'bg-sena-green/10 text-sena-green' :
                                  result.level.startsWith('B') ? 'bg-sena-blue/10 text-sena-blue' :
                                  'bg-warning/10 text-warning'
                                }`}>{result.level}</span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-1 text-sena-green text-sm font-medium">
                                  <TrendingUp className="w-4 h-4" />
                                  +{Math.floor(Math.random() * 10) + 1}%
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actividad reciente */}
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-foreground">Actividad por Hora</h3>
                      <p className="text-sm text-muted-foreground">Pruebas realizadas hoy</p>
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { hora: '8am', pruebas: 2 },
                        { hora: '10am', pruebas: 8 },
                        { hora: '12pm', pruebas: 5 },
                        { hora: '2pm', pruebas: 12 },
                        { hora: '4pm', pruebas: 15 },
                        { hora: '6pm', pruebas: 8 },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="hora" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                        <Line type="monotone" dataKey="pruebas" stroke="#1F4E78" strokeWidth={2} dot={{ fill: '#1F4E78', strokeWidth: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-semibold text-foreground">Recursos mas Usados</h3>
                      <p className="text-sm text-muted-foreground">Top documentos del mes</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {documents.slice(0, 4).map((doc, i) => (
                      <div key={doc.id} className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          categoryMeta(doc.category ?? getFileCategory(doc.name)).bg
                        }`}>
                          {(() => {
                            const Icon = categoryMeta(doc.category ?? getFileCategory(doc.name)).icon;
                            return <Icon className={`w-5 h-5 ${categoryMeta(doc.category ?? getFileCategory(doc.name)).text}`} />;
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">{doc.subjectName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-foreground">{Math.floor(Math.random() * 50) + 10}</p>
                          <p className="text-xs text-muted-foreground">descargas</p>
                        </div>
                      </div>
                    ))}
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
                  <p className="text-muted-foreground">Administra usuarios y sus permisos</p>
                </div>
                <button
                  onClick={() => setShowUserModal(true)}
                  className="flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium shadow-lg shadow-sena-green/25"
                >
                  <Plus className="w-5 h-5" /> Agregar Usuario
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="pl-12 pr-8 py-3 bg-white border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 appearance-none cursor-pointer"
                  >
                    <option value="all">Todos los roles</option>
                    <option value="admin">Administrador</option>
                    <option value="teacher">Docente</option>
                    <option value="student">Estudiante</option>
                  </select>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground">Usuario</th>
                        <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground">Rol</th>
                        <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground">Programa</th>
                        <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground">Estado</th>
                        <th className="text-left py-4 px-5 text-sm font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-medium ${user.role === "admin" ? "bg-destructive" : user.role === "teacher" ? "bg-sena-blue" : "bg-sena-green"}`}>
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{user.name}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <select
                              value={user.role}
                              onChange={(e) => handleChangeUserRole(user.id, e.target.value as any)}
                              disabled={user.email === "admin@gmail.com"}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 cursor-pointer disabled:cursor-not-allowed ${user.role === "admin" ? "bg-destructive/10 text-destructive" : user.role === "teacher" ? "bg-sena-blue/10 text-sena-blue" : "bg-sena-green/10 text-sena-green"}`}
                            >
                              <option value="admin">Administrador</option>
                              <option value="teacher">Docente</option>
                              <option value="student">Estudiante</option>
                            </select>
                          </td>
                          <td className="py-4 px-5"><span className="text-sm text-muted-foreground">{user.program || "-"}</span></td>
                          <td className="py-4 px-5">
                            <button
                              onClick={() => handleToggleUserStatus(user.id)}
                              disabled={user.email === "admin@gmail.com"}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${user.status === "active" ? "bg-sena-green/10 text-sena-green hover:bg-sena-green/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                            >
                              {user.status === "active" ? <><ToggleRight className="w-4 h-4" /> Activo</> : <><ToggleLeft className="w-4 h-4" /> Inactivo</>}
                            </button>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleEditUserPermissions(user)} className="p-2 text-sena-blue hover:bg-sena-blue/10 rounded-lg transition-colors">
                                <Settings className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteUser(user.id)} disabled={user.email === "admin@gmail.com"} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* ══ Documents ══ */}
          {activeTab === "documents" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Archivos y Documentos</h2>
                  <p className="text-muted-foreground">Gestiona documentos, audios y videos educativos</p>
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium shadow-lg shadow-sena-green/25"
                >
                  <Upload className="w-5 h-5" /> Subir Archivo
                </button>
              </div>

              {/* Filtros de categoría */}
              <div className="flex gap-2 flex-wrap">
                {([
                  { key: "all",      label: "Todos",      icon: FolderOpen },
                  { key: "document", label: "Documentos", icon: FileText   },
                  { key: "audio",    label: "Audios",     icon: Music      },
                  { key: "video",    label: "Videos",     icon: Film       },
                ] as const).map((f) => {
                  const Icon = f.icon;
                  const active = filterCategory === f.key;
                  return (
                    <button
                      key={f.key}
                      onClick={() => setFilterCategory(f.key)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? "bg-sena-green text-white shadow-md"
                          : "bg-white border border-border text-muted-foreground hover:border-sena-green/40 hover:text-sena-green"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {f.label}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-white/20" : "bg-muted"}`}>
                        {f.key === "all"
                          ? documents.length
                          : documents.filter((d) => (d.category ?? getFileCategory(d.name)) === f.key).length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Grid de archivos */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocs.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    subjects={subjects}
                    onDelete={handleDeleteDocument}
                    onAssign={handleAssignSubject}
                  />
                ))}
              </div>

              {filteredDocs.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-border">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No hay archivos</h3>
                  <p className="text-muted-foreground mb-4">Sube tu primer archivo para comenzar</p>
                  <button onClick={() => setShowUploadModal(true)} className="inline-flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl font-medium">
                    <Upload className="w-5 h-5" /> Subir Archivo
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ Subjects ══ */}
          {activeTab === "subjects" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Asignaturas</h2>
                  <p className="text-muted-foreground">Organiza el contenido por áreas temáticas</p>
                </div>
                <button onClick={() => setShowSubjectModal(true)} className="flex items-center gap-2 bg-sena-green text-white px-5 py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium shadow-lg shadow-sena-green/25">
                  <Plus className="w-5 h-5" /> Nueva Asignatura
                </button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject) => {
                  const docsCount = documents.filter((d) => d.subjectId === subject.id).length;
                  return (
                    <motion.div key={subject.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all relative overflow-hidden">
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
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <FileText className="w-4 h-4" />
                          <span>{docsCount} archivo{docsCount !== 1 ? "s" : ""}</span>
                        </div>
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
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nombre Completo</label>
                  <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Rol</label>
                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                      <option value="student">Estudiante</option>
                      <option value="teacher">Docente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">País</label>
                    <input type="text" value={newUser.country} onChange={(e) => setNewUser({ ...newUser, country: e.target.value })} placeholder="Colombia" className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Programa SENA</label>
                  <select value={newUser.program} onChange={(e) => setNewUser({ ...newUser, program: e.target.value })} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                    <option value="">Seleccionar programa</option>
                    {senaPrograms.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium">Agregar</button>
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
                <div>
                  <h3 className="text-xl font-bold text-foreground">Editar Permisos</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                </div>
                <button onClick={() => { setShowEditUserModal(false); setSelectedUser(null); }} className="p-2 hover:bg-muted rounded-lg transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <PermissionsEditor permissions={selectedUser.permissions} onSave={handleSaveUserPermissions} onCancel={() => { setShowEditUserModal(false); setSelectedUser(null); }} />
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
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
                  <input type="text" value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} required placeholder="Ej: Gramática Avanzada" className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Descripción</label>
                  <textarea value={newSubject.description} onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })} required rows={3} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Color</label>
                  <div className="flex gap-2">
                    {["#39A900", "#1F4E78", "#D89E00", "#E21B3C", "#9333EA", "#06B6D4"].map((color) => (
                      <button key={color} type="button" onClick={() => setNewSubject({ ...newSubject, color })} className={`w-10 h-10 rounded-xl transition-all ${newSubject.color === color ? "ring-2 ring-offset-2 ring-foreground scale-110" : ""}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium">Crear</button>
                  <button type="button" onClick={() => setShowSubjectModal(false)} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-medium">Cancelar</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Modal: Subir Archivo (documentos + audio + video) ══ */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-foreground">Subir Archivo</h3>
                <button onClick={() => { setShowUploadModal(false); setUploadForm({ file: null, subjectId: "", program: "", previewUrl: "" }); }} className="p-2 hover:bg-muted rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-4">
                {/* Zona de drop */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Archivo</label>
                  <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${uploadForm.file ? "border-sena-green/60 bg-sena-green/5" : "border-border hover:border-sena-green/40"}`}>
                    <input
                      type="file"
                      accept={ACCEPT_ALL}
                      onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]); }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer block">
                      {uploadForm.file ? (
                        <div className="flex flex-col items-center gap-2">
                          {uploadCat === "audio" && <Music className="w-10 h-10 text-purple-500" />}
                          {uploadCat === "video" && <Film className="w-10 h-10 text-sena-blue" />}
                          {uploadCat === "document" && <FileText className="w-10 h-10 text-sena-green" />}
                          <p className="text-sm font-semibold text-foreground">{uploadForm.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB · {uploadCat === "audio" ? "Audio" : uploadCat === "video" ? "Video" : "Documento"}
                          </p>
                          <span className="text-xs text-sena-green font-medium">Clic para cambiar</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm font-medium text-foreground">Haz clic para seleccionar</p>
                          <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT · MP3, WAV, OGG · MP4, MOV, AVI</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {/* Preview de audio */}
                {uploadCat === "audio" && uploadForm.previewUrl && (
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                      <Music className="w-3.5 h-3.5" /> Vista previa del audio
                    </p>
                    <audio controls src={uploadForm.previewUrl} className="w-full h-10" />
                  </div>
                )}

                {/* Preview de video */}
                {uploadCat === "video" && uploadForm.previewUrl && (
                  <div className="bg-sena-blue/5 rounded-xl overflow-hidden">
                    <p className="text-xs font-semibold text-sena-blue px-3 pt-3 pb-2 flex items-center gap-1">
                      <Film className="w-3.5 h-3.5" /> Vista previa del video
                    </p>
                    <video controls src={uploadForm.previewUrl} className="w-full max-h-40 object-contain bg-black" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Asignatura</label>
                    <select value={uploadForm.subjectId} onChange={(e) => setUploadForm({ ...uploadForm, subjectId: e.target.value })} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                      <option value="">Sin asignar</option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Programa SENA</label>
                    <select value={uploadForm.program} onChange={(e) => setUploadForm({ ...uploadForm, program: e.target.value })} className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50">
                      <option value="">Todos los programas</option>
                      {senaPrograms.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Campos Digital Dictionaries */}
                <div className="border-t border-border pt-4 mt-2">
                  <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sena-green" />
                    Informacion del Diccionario Digital
                  </p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Definicion</label>
                      <textarea
                        value={uploadForm.definition}
                        onChange={(e) => setUploadForm({ ...uploadForm, definition: e.target.value })}
                        placeholder="Escribe la definicion del termino o contenido..."
                        rows={2}
                        className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Sinonimos</label>
                      <input
                        type="text"
                        value={uploadForm.synonyms}
                        onChange={(e) => setUploadForm({ ...uploadForm, synonyms: e.target.value })}
                        placeholder="Separados por comas: palabra1, palabra2, palabra3"
                        className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Nivel de Dificultad</label>
                      <select
                        value={uploadForm.level}
                        onChange={(e) => setUploadForm({ ...uploadForm, level: e.target.value })}
                        className="w-full px-4 py-2.5 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                      >
                        <option value="">Seleccionar nivel</option>
                        <option value="A1">A1 - Principiante</option>
                        <option value="A2">A2 - Elemental</option>
                        <option value="B1">B1 - Intermedio</option>
                        <option value="B2">B2 - Intermedio Alto</option>
                        <option value="C1">C1 - Avanzado</option>
                        <option value="C2">C2 - Maestria</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={!uploadForm.file} className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    Subir Archivo
                  </button>
                  <button type="button" onClick={() => { setShowUploadModal(false); setUploadForm({ file: null, subjectId: "", program: "", previewUrl: "", definition: "", synonyms: "", level: "" }); }} className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-medium">
                    Cancelar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Permissions Editor (sin cambios) ────────────────────────────────────────
function PermissionsEditor({ permissions, onSave, onCancel }: { permissions: UserPermissions; onSave: (p: UserPermissions) => void; onCancel: () => void }) {
  const [edited, setEdited] = useState(permissions);

  const items: { key: keyof UserPermissions; label: string; description: string }[] = [
    { key: "canManageUsers",     label: "Gestionar Usuarios",    description: "Crear, editar y eliminar usuarios"         },
    { key: "canManageDocuments", label: "Gestionar Documentos",  description: "Subir y eliminar documentos"               },
    { key: "canViewStatistics",  label: "Ver Estadísticas",      description: "Acceder a reportes y métricas"             },
    { key: "canGiveFeedback",    label: "Dar Retroalimentación", description: "Comentar en resultados de estudiantes"     },
    { key: "canTakeQuiz",        label: "Realizar Pruebas",      description: "Acceso a evaluaciones de inglés"           },
    { key: "canViewResults",     label: "Ver Resultados",        description: "Ver resultados de pruebas"                 },
    { key: "canManageSubjects",  label: "Gestionar Asignaturas", description: "Crear y editar asignaturas"                },
    { key: "canConfigureLevels", label: "Configurar Niveles",   description: "Ajustar rangos de evaluación"              },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
        {items.map((perm) => (
          <button key={perm.key} type="button" onClick={() => setEdited((prev) => ({ ...prev, [perm.key]: !prev[perm.key] }))}
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
