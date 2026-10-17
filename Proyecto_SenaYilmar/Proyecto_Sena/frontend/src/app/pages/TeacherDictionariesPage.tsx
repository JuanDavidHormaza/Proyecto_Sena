import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  FolderOpen,
  Image,
  Search,
  Video,
  Volume2,
  VolumeX,
  Plus,
  Edit3,
  Trash2,
  X,
  CheckCircle,
  CheckCircle2,
  Upload,
  Loader2,
  GraduationCap,
  Languages,
  Mic,
  PenTool,
  ImageIcon,
  Code2,
  Cpu,
  ExternalLink,
  AlertCircle,
  Play,
  Pause,
  Layers,
  Sparkles,
  GitBranch,
  Terminal,
} from "lucide-react";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { WorklexBrandLogo } from "../components/WorklexBrandLogo";
import { resolveMediaUrl } from "../services/api";
import { Document, mockDocuments } from "../data/users";
import { toast } from "../components/Toast";

export type DictionaryDocument = Document & {
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  level?: string;
  competence?: string;
};

function isGlobalProgram(program?: string | null) {
  const normalized = (program || "").trim().toLowerCase();
  return !normalized || normalized === "todos los programas";
}

function matchesTeacherProgram(docProgram: string | undefined, teacherProgram: string) {
  if (!teacherProgram) return true;
  const tNorm = teacherProgram.trim().toLowerCase();
  const dNorm = (docProgram || "").trim().toLowerCase();
  return dNorm.includes(tNorm) || tNorm.includes(dNorm) || isGlobalProgram(docProgram);
}

export function getTermSemanticIcon(termName?: string) {
  const name = (termName || "").toLowerCase().trim();
  if (
    name.includes("branch") ||
    name.includes("git") ||
    name.includes("repo") ||
    name.includes("merge") ||
    name.includes("commit") ||
    name.includes("pull") ||
    name.includes("checkout")
  ) {
    return GitBranch;
  }
  if (
    name.includes("terminal") ||
    name.includes("debug") ||
    name.includes("test") ||
    name.includes("cli") ||
    name.includes("console") ||
    name.includes("shell") ||
    name.includes("script") ||
    name.includes("command")
  ) {
    return Terminal;
  }
  if (
    name.includes("layer") ||
    name.includes("middle") ||
    name.includes("microservice") ||
    name.includes("service") ||
    name.includes("cloud") ||
    name.includes("server") ||
    name.includes("api") ||
    name.includes("backend") ||
    name.includes("docker") ||
    name.includes("deploy")
  ) {
    return Layers;
  }
  return Code2;
}

export function TeacherDictionariesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<DictionaryDocument[]>(mockDocuments);
  const [subjects, setSubjects] = useState<api.ApiSubject[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [selectedCompetence, setSelectedCompetence] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  // Control resiliente de audio y reproductor tolerante a 404
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioErrorMap, setAudioErrorMap] = useState<Record<string, boolean>>({});
  const [audioLoadingMap, setAudioLoadingMap] = useState<Record<string, boolean>>({});
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Control tolerante a fallos de imágenes
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Estados de creación y edición de términos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Formulario de término
  const [formData, setFormData] = useState({
    name: "",
    level: "A1",
    competence: "Grammar",
    subjectId: "",
    program: "",
    definition: "",
    synonyms: "",
    videoUrl: "",
    audioUrl: "",
    imageUrl: "",
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const teacherName = user?.name || localStorage.getItem("userName") || "Instructor";
  const teacherProgram = user?.program || localStorage.getItem("userProgram") || "ADSO";

  // Cargar asignaturas disponibles
  useEffect(() => {
    api.getSubjects()
      .then((data) => {
        setSubjects(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, subjectId: prev.subjectId || data[0].id }));
        }
      })
      .catch((err) => console.error("Error al cargar asignaturas:", err));
  }, []);

  // Cargar documentos desde backend
  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const apiDocs = await api.getDocuments({
        subject: selectedSubject !== "all" ? selectedSubject : undefined,
        level: selectedLevel !== "all" ? selectedLevel : undefined,
        competence: selectedCompetence !== "all" ? selectedCompetence : undefined,
        search: searchTerm || undefined,
        program: teacherProgram || undefined,
        fichaId: teacherProgram || undefined,
      });

      const convertedDocs: DictionaryDocument[] = apiDocs.map((doc) => ({
        id: doc.id,
        name: doc.name,
        subjectId: doc.subjectId,
        subjectName: doc.subjectName,
        program: doc.program,
        uploadedAt: doc.uploadedAt || "",
        fileType: doc.fileType,
        size: doc.size,
        uploadedBy: doc.uploadedBy,
        wordId: doc.wordId,
        definition: doc.definition,
        synonyms: doc.synonyms,
        audioUrl: doc.audioUrl,
        videoUrl: doc.videoUrl,
        imageUrl: doc.imageUrl,
        level: doc.level || "A1",
        competence: doc.competence || "Grammar",
      }));

      setDocuments(convertedDocs);
    } catch (error) {
      console.warn("Fallo al conectar con backend, usando documentos de respaldo:", error);
      setDocuments(mockDocuments);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadDocuments();
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [selectedSubject, selectedLevel, selectedCompetence, searchTerm]);

  const teacherDocuments = useMemo(() => {
    return documents.filter((doc) => matchesTeacherProgram(doc.program, teacherProgram));
  }, [documents, teacherProgram]);

  const programLabel = teacherProgram || "tu programa de formación";

  // Manejo de reproducción de audio con tolerancia total a fallos (404)
  const handlePlayAudio = (docId: string, rawAudioUrl: string) => {
    if (audioErrorMap[docId]) {
      toast.warning("El archivo de audio no se encuentra disponible en el almacenamiento temporalmente.", "Audio 404");
      return;
    }

    const resolved = resolveMediaUrl(rawAudioUrl);

    // Si ya se está reproduciendo el mismo audio, alternar pausa
    if (playingAudioId === docId && audioPlayerRef.current) {
      if (!audioPlayerRef.current.paused) {
        audioPlayerRef.current.pause();
        setPlayingAudioId(null);
        return;
      } else {
        audioPlayerRef.current.play().catch(() => {});
        setPlayingAudioId(docId);
        return;
      }
    }

    setAudioLoadingMap((prev) => ({ ...prev, [docId]: true }));
    setActiveAudioUrl(resolved);
    setPlayingAudioId(docId);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(resolved);
    audioPlayerRef.current = audio;

    audio.oncanplay = () => {
      setAudioLoadingMap((prev) => ({ ...prev, [docId]: false }));
      audio.play().catch((err) => {
        console.warn("Reproducción de audio bloqueada o con error:", err);
        setAudioErrorMap((prev) => ({ ...prev, [docId]: true }));
        setPlayingAudioId(null);
        setAudioLoadingMap((prev) => ({ ...prev, [docId]: false }));
      });
    };

    audio.onerror = () => {
      console.warn(`[MediaProxy 404] Audio no encontrado en bucket: ${resolved}`);
      setAudioErrorMap((prev) => ({ ...prev, [docId]: true }));
      setPlayingAudioId(null);
      setAudioLoadingMap((prev) => ({ ...prev, [docId]: false }));
      toast.warning("Audio no disponible temporalmente en el bucket 'dictionary-audios'.", "Recurso no encontrado (404)");
    };

    audio.onended = () => {
      setPlayingAudioId(null);
    };
  };

  // Abrir modal de creación
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingDocId(null);
    setAudioFile(null);
    setImageFile(null);
    setFormData({
      name: "",
      level: "A1",
      competence: "Grammar",
      subjectId: subjects[0]?.id || "ADSO",
      program: teacherProgram || "ADSO",
      definition: "",
      synonyms: "",
      videoUrl: "",
      audioUrl: "",
      imageUrl: "",
    });
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const handleOpenEdit = (doc: DictionaryDocument) => {
    setModalMode("edit");
    setEditingDocId(doc.id);
    setAudioFile(null);
    setImageFile(null);
    setFormData({
      name: doc.name || doc.wordId || "",
      level: doc.level || "A1",
      competence: doc.competence || "Grammar",
      subjectId: doc.subjectId || subjects[0]?.id || "ADSO",
      program: doc.program || teacherProgram || "ADSO",
      definition: doc.definition || "",
      synonyms: doc.synonyms || "",
      videoUrl: doc.videoUrl || "",
      audioUrl: doc.audioUrl || "",
      imageUrl: doc.imageUrl || "",
    });
    setIsModalOpen(true);
  };

  // Guardar término (Crear o Editar con MinIO multimedia)
  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsSaving(true);
    setStatusMessage(null);

    try {
      let finalAudioUrl = formData.audioUrl;
      let finalImageUrl = formData.imageUrl;

      // 1. Subir audio a MinIO si se seleccionó archivo
      if (audioFile) {
        const audioUpload = await api.uploadMediaFile(audioFile, "dictionary-audios");
        finalAudioUrl = audioUpload.proxy_url;
      }

      // 2. Subir ilustración a MinIO si se seleccionó archivo
      if (imageFile) {
        const imageUpload = await api.uploadMediaFile(imageFile, "dictionary-images");
        finalImageUrl = imageUpload.proxy_url;
      }

      const payload: Partial<api.ApiDocument> = {
        name: formData.name.trim(),
        wordId: formData.name.trim(),
        level: formData.level,
        competence: formData.competence,
        subjectId: formData.subjectId || "ADSO",
        program: formData.program || teacherProgram || "ADSO",
        definition: formData.definition.trim(),
        synonyms: formData.synonyms.trim(),
        videoUrl: formData.videoUrl.trim() || undefined,
        audioUrl: finalAudioUrl || undefined,
        imageUrl: finalImageUrl || undefined,
      };

      if (modalMode === "create") {
        await api.createDocument(payload);
        setStatusMessage(`Término "${formData.name}" creado con éxito en MinIO y base de datos.`);
      } else if (editingDocId) {
        await api.updateDocument(editingDocId, payload);
        setStatusMessage(`Término "${formData.name}" actualizado correctamente.`);
      }

      setIsModalOpen(false);
      await loadDocuments();
    } catch (err: any) {
      console.error("Error al guardar término:", err);
      setStatusMessage(err?.message || "Ocurrió un error al guardar el término.");
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar término
  const handleDeleteTerm = async (docId: string, docName: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el término "${docName}" del diccionario unificado?`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      setStatusMessage(`Término "${docName}" eliminado.`);
      await loadDocuments();
    } catch (err: any) {
      console.error("Error al eliminar término:", err);
      setStatusMessage(err?.message || "No se pudo eliminar el término.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-[#39A900]/20 selection:text-[#39A900]">
      {/* ─── Top Header Institucional con Protagonismo de Marca Worklex ─── */}
      <header className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate("/teacher")}
              className="flex items-center gap-3 sm:gap-4 p-1.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group text-left"
              title="Regresar al panel del docente"
            >
              <WorklexBrandLogo
                size="md"
                showText={true}
                showBadge={true}
                badgeText="Ecosistema Digital"
                subtitle="Plataforma de Gestión y Aprendizaje"
              />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <UserAccountMenu accent="blue" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Banner de Estado Operativo */}
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-300 text-sm font-medium shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" strokeWidth={1.75} />
              <span>{statusMessage}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
            >
              Cerrar
            </button>
          </motion.div>
        )}

        {/* ─── Encabezado de Página y Botón de Acción Principal ─── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={() => navigate("/teacher")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-4 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
            <span>Regresar al panel principal</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#39A900]" strokeWidth={1.75} />
                <span>Gestión de Vocabulario y Almacenamiento en MinIO</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Diccionario Técnico y Recursos Multimedia
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed mt-1">
                {teacherName.split(" ")[0]}, administra los términos técnicos, audios de pronunciación nativa e ilustraciones para {programLabel}.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start lg:self-end">
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl px-5 py-3 shadow-xs min-w-44">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Términos Disponibles</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{teacherDocuments.length}</p>
              </div>

              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 bg-[#39A900] hover:bg-[#2e8600] active:scale-[0.99] text-white rounded-xl text-base font-semibold shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-5 h-5" strokeWidth={1.75} />
                <span>Nuevo Término</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* ─── Barra de Búsqueda y Filtros con Estilo SaaS Moderno ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mb-8 space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" strokeWidth={1.75} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por término en inglés, definición técnica o sinónimos..."
              className="w-full h-12 pl-12 pr-4 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] text-base text-slate-900 dark:text-white placeholder:text-slate-400 transition-all shadow-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Filtro Asignatura */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Asignatura / Área
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full h-12 px-3.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] cursor-pointer transition-all shadow-xs"
              >
                <option value="all">Todas las asignaturas</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Nivel CEFR */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nivel Marco CEFR
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full h-12 px-3.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] cursor-pointer transition-all shadow-xs"
              >
                <option value="all">Todos los niveles (A1 - B2)</option>
                <option value="A1">Nivel A1 (Acceso)</option>
                <option value="A2">Nivel A2 (Plataforma)</option>
                <option value="B1">Nivel B1 (Umbral)</option>
                <option value="B2">Nivel B2 (Avanzado)</option>
              </select>
            </div>

            {/* Filtro Competencia */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Competencia
              </label>
              <select
                value={selectedCompetence}
                onChange={(e) => setSelectedCompetence(e.target.value)}
                className="w-full h-12 px-3.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] cursor-pointer transition-all shadow-xs"
              >
                <option value="all">Todas las competencias</option>
                <option value="Speaking">Speaking (Habla)</option>
                <option value="Grammar">Grammar (Gramática)</option>
                <option value="Writing">Writing (Escritura)</option>
                <option value="Reading">Reading (Lectura)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* ─── Reproductor de Audio Flotante Resiliente ─── */}
        {activeAudioUrl && (
          <div className="fixed bottom-6 right-6 z-50 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xl max-w-sm w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#00324D] dark:text-sky-400 flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" strokeWidth={1.75} /> Reproduciendo Audio
              </span>
              <button
                onClick={() => {
                  if (audioPlayerRef.current) audioPlayerRef.current.pause();
                  setActiveAudioUrl(null);
                  setPlayingAudioId(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Cerrar
              </button>
            </div>
            <audio
              controls
              autoPlay
              className="w-full h-8"
              src={activeAudioUrl}
              onError={() => {
                toast.warning("El archivo de audio solicitado no se encuentra en el bucket 'dictionary-audios'.");
              }}
            />
          </div>
        )}

        {/* ─── Grid de Tarjetas de Términos Multimedia ─── */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm animate-pulse space-y-4">
                <div className="w-full aspect-video rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : teacherDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {teacherDocuments.map((doc, index) => (
              <motion.article
                key={doc.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Vista Previa de Ilustración con Fallback Semántico Tolerante a 404 (aspect-video siempre constante) */}
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 mb-4 group/img flex items-center justify-center">
                    {doc.imageUrl && !imageErrors[doc.id] ? (
                      <img
                        src={resolveMediaUrl(doc.imageUrl)}
                        alt={doc.name || doc.wordId || "Ilustración técnica"}
                        loading="lazy"
                        decoding="async"
                        onError={() => {
                          console.warn(`[MediaProxy 404] Imagen no encontrada: ${doc.imageUrl}`);
                          setImageErrors((prev) => ({ ...prev, [doc.id]: true }));
                        }}
                        className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover/img:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 text-center">
                        {(() => {
                          const SemanticIcon = getTermSemanticIcon(doc.name || doc.wordId);
                          return (
                            <>
                              <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-700/90 border border-slate-200 dark:border-slate-600 flex items-center justify-center mb-1.5 shadow-xs text-slate-600 dark:text-slate-300">
                                <SemanticIcon className="w-6 h-6" strokeWidth={1.75} />
                              </div>
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-tight truncate max-w-full px-2">
                                {doc.name || doc.wordId}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                Recurso institucional
                              </span>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Cabecera de la Tarjeta con Badges y Acciones */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl flex items-center justify-center flex-shrink-0 text-[#39A900]">
                        <BookOpen className="w-5 h-5" strokeWidth={1.75} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80">
                          {doc.level || "A1"}
                        </span>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1">
                          {doc.competence === "Speaking" && <Mic className="w-3 h-3 shrink-0" strokeWidth={1.75} />}
                          {doc.competence === "Writing" && <PenTool className="w-3 h-3 shrink-0" strokeWidth={1.75} />}
                          {(!doc.competence || doc.competence === "Grammar") && <Languages className="w-3 h-3 shrink-0" strokeWidth={1.75} />}
                          {doc.competence === "Reading" && <BookOpen className="w-3 h-3 shrink-0" strokeWidth={1.75} />}
                          <span>{doc.competence || "Grammar"}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(doc)}
                        title="Editar término técnico"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTerm(doc.id, doc.name || doc.wordId || "")}
                        title="Eliminar término del diccionario"
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-2 tracking-tight">
                    {doc.name || doc.wordId}
                  </h3>

                  <div className="space-y-1 mb-3 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" strokeWidth={1.75} />
                      <span className="truncate">{doc.program || "Todos los programas"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" strokeWidth={1.75} />
                      <span className="truncate">{doc.subjectName || "Sin asignatura"}</span>
                    </div>
                  </div>

                  {doc.definition && (
                    <div className="mb-3 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3.5">
                      <p className="text-[11px] font-bold text-[#00324D] dark:text-sky-400 uppercase tracking-wider mb-0.5">
                        Definición Técnica
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                        {doc.definition}
                      </p>
                    </div>
                  )}

                  {doc.synonyms && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Sinónimos</p>
                      <div className="flex flex-wrap gap-1.5">
                        {doc.synonyms.split(",").map((synonym) => (
                          <span
                            key={synonym.trim()}
                            className="text-xs font-medium bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/80 px-2.5 py-0.5 rounded-md"
                          >
                            {synonym.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ─── Acciones Multimedia (Audio, Imagen, Video) ─── */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-2 flex flex-wrap items-center gap-2">
                  {/* Botón de Audio con Tolerancia Total a Fallos 404 */}
                  {doc.audioUrl && !audioErrorMap[doc.id] ? (
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(doc.id, doc.audioUrl!)}
                      title="Escuchar pronunciación nativa"
                      className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        playingAudioId === doc.id
                          ? "bg-[#39A900] text-white border border-[#39A900] shadow-xs"
                          : "bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80"
                      }`}
                    >
                      {audioLoadingMap[doc.id] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      )}
                      <span>
                        {playingAudioId === doc.id ? "Pausar Audio" : "Escuchar Audio"}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={true}
                      title="Audio no disponible temporalmente (404)"
                      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 opacity-40 cursor-not-allowed transition-all"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                      <span>Audio no disponible</span>
                    </button>
                  )}

                  {/* Enlace Ilustración si existe y no dio error */}
                  {doc.imageUrl && !imageErrors[doc.id] && (
                    <a
                      href={resolveMediaUrl(doc.imageUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-800/80 transition-colors"
                    >
                      <Image className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Ver Ilustración</span>
                    </a>
                  )}

                    {/* Video Educativo */}
                    {doc.videoUrl && (
                      <div className="w-full mt-2">
                        {api.getEmbedVideoUrl(doc.videoUrl) ? (
                          <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-black shadow-xs">
                            <iframe
                              src={api.getEmbedVideoUrl(doc.videoUrl)!}
                              title={`Video explicativo de ${doc.wordId}`}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <a
                            href={resolveMediaUrl(doc.videoUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl text-xs font-semibold text-[#00324D] dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 border border-sky-200/80 dark:border-sky-800/80 transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" strokeWidth={1.75} />
                            <span>Ver Video</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 shadow-sm">
            <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" strokeWidth={1.75} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No hay términos disponibles</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              No se encontraron términos para {programLabel} con los filtros seleccionados. Puedes registrar un nuevo término técnico haciendo clic en el botón superior.
            </p>
          </div>
        )}
      </main>

      {/* ─── Modal de Creación / Edición de Término Técnico ─── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 sm:p-8 md:p-10 shadow-2xl border border-slate-200/80 dark:border-slate-800 relative my-8 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>

              <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-[#39A900] flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6" strokeWidth={1.75} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {modalMode === "create" ? "Registrar Nuevo Término Técnico" : "Editar Término Técnico"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Repositorio centralizado con almacenamiento multimedia en MinIO
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveTerm} className="space-y-5">
                {/* Nombre / Palabra Clave */}
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Término en Inglés <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Polymorphism, Recursion, Microservices..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] text-base text-slate-900 dark:text-white placeholder:text-slate-400 font-medium transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Nivel */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nivel CEFR
                    </label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full h-12 px-3.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] cursor-pointer transition-all shadow-xs"
                    >
                      <option value="A1">A1 (Acceso)</option>
                      <option value="A2">A2 (Plataforma)</option>
                      <option value="B1">B1 (Umbral)</option>
                      <option value="B2">B2 (Avanzado)</option>
                    </select>
                  </div>

                  {/* Competencia */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Competencia
                    </label>
                    <select
                      value={formData.competence}
                      onChange={(e) => setFormData({ ...formData, competence: e.target.value })}
                      className="w-full h-12 px-3.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] cursor-pointer transition-all shadow-xs"
                    >
                      <option value="Speaking">Speaking</option>
                      <option value="Grammar">Grammar</option>
                      <option value="Writing">Writing</option>
                      <option value="Reading">Reading</option>
                    </select>
                  </div>

                  {/* Asignatura */}
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Asignatura
                    </label>
                    <select
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      className="w-full h-12 px-3.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] cursor-pointer transition-all shadow-xs"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Definición */}
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Definición Técnica en Inglés <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide a clear, technical definition in English..."
                    value={formData.definition}
                    onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 leading-relaxed font-normal transition-all shadow-xs"
                  />
                </div>

                {/* Sinónimos */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Sinónimos o Términos Relacionados (Separados por coma)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. subprogram, method, procedure"
                    value={formData.synonyms}
                    onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 font-medium transition-all shadow-xs"
                  />
                </div>

                {/* URL de Video Educativo */}
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Video className="w-4 h-4 text-[#00324D] dark:text-sky-400" strokeWidth={1.75} />
                    <span>URL de Video Educativo (YouTube o Vimeo)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="Ej. https://www.youtube.com/watch?v=... o https://vimeo.com/..."
                    value={formData.videoUrl || ""}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#39A900]/20 focus:border-[#39A900] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 font-medium transition-all shadow-xs"
                  />
                  {formData.videoUrl && api.getEmbedVideoUrl(formData.videoUrl) && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-slate-200/80 aspect-video max-h-48 bg-black">
                      <iframe
                        src={api.getEmbedVideoUrl(formData.videoUrl)!}
                        title="Vista previa del video"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                  )}
                </div>

                {/* Multimedia: Subida a MinIO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  {/* Audio */}
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-purple-600 dark:text-purple-400" strokeWidth={1.75} />
                      <span>Audio de Pronunciación</span>
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer"
                    />
                    {formData.audioUrl && !audioFile && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
                        Audio actual: {formData.audioUrl}
                      </p>
                    )}
                  </div>

                  {/* Imagen */}
                  <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 rounded-xl">
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                      <Image className="w-4 h-4 text-[#39A900]" strokeWidth={1.75} />
                      <span>Ilustración / Diagrama</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-2 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 cursor-pointer"
                    />
                    {formData.imageUrl && !imageFile && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 truncate">
                        Imagen actual: {formData.imageUrl}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botones de acción del Modal */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="h-12 px-6 rounded-xl border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="h-12 px-6 rounded-xl bg-[#39A900] hover:bg-[#2e8600] active:scale-[0.99] text-white font-semibold text-sm shadow-sm transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                        <span>Guardando en MinIO...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" strokeWidth={1.75} />
                        <span>Guardar Término</span>
                      </>
                    )}
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

export default TeacherDictionariesPage;