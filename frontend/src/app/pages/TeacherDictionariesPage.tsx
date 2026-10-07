import { useEffect, useMemo, useState } from "react";
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
  Plus,
  Edit3,
  Trash2,
  X,
  CheckCircle,
  Upload,
  Loader2,
  GraduationCap,
  Languages,
} from "lucide-react";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { resolveMediaUrl } from "../services/api";
import { Document, mockDocuments } from "../data/users";

type DictionaryDocument = Document & {
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
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);

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

  const programLabel = teacherProgram || "tu programa";

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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/teacher")}
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted transition-colors text-left"
            >
              <img
                src="/worklex.png"
                alt="WorkLex"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-500/30 shadow-md transition-transform hover:scale-105 flex-shrink-0"
              />
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground">English Level Test</h1>
                <p className="text-xs text-muted-foreground">Diccionarios y Documentos del Instructor</p>
              </div>
            </button>

            <UserAccountMenu accent="blue" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Banner de Estado */}
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-sena-green/10 border border-sena-green/30 rounded-xl flex items-center justify-between gap-3 text-sena-green text-sm font-medium"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-sena-green hover:underline text-xs">
              Cerrar
            </button>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            onClick={() => navigate("/teacher")}
            className="inline-flex items-center gap-2 text-sm font-medium text-sena-blue hover:text-sena-blue-light mb-4"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.8} />
            Volver al panel
          </button>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Diccionario Digital y Recursos</h2>
              <p className="text-muted-foreground">
                {teacherName.split(" ")[0]}, gestiona los términos técnicos, audios nativos e ilustraciones para {programLabel}.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white border border-border rounded-xl px-4 py-3 shadow-sm min-w-40">
                <p className="text-xs text-muted-foreground">Términos Disponibles</p>
                <p className="text-2xl font-bold text-sena-blue">{teacherDocuments.length}</p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-3 bg-sena-green hover:bg-sena-green/90 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" strokeWidth={1.8} />
                <span>Nuevo Término</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Barra de Búsqueda y Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-4 rounded-2xl border border-border shadow-sm mb-6 space-y-4"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.8} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por término, definición o sinónimos..."
              className="w-full pl-12 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-sena-blue/50 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border">
            {/* Filtro Asignatura */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Asignatura</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sena-blue/40"
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
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Nivel Marco CEFR</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sena-blue/40"
              >
                <option value="all">Todos los niveles</option>
                <option value="A1">Nivel A1 (Acceso)</option>
                <option value="A2">Nivel A2 (Plataforma)</option>
                <option value="B1">Nivel B1 (Umbral)</option>
                <option value="B2">Nivel B2 (Avanzado)</option>
              </select>
            </div>

            {/* Filtro Competencia */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Competencia</label>
              <select
                value={selectedCompetence}
                onChange={(e) => setSelectedCompetence(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sena-blue/40"
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

        {/* Reproductor de Audio Flotante */}
        {activeAudioUrl && (
          <div className="fixed bottom-6 right-6 z-50 bg-white border border-border rounded-2xl p-4 shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-sena-blue flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" strokeWidth={1.8} /> Reproduciendo Audio
              </span>
              <button
                onClick={() => setActiveAudioUrl(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cerrar
              </button>
            </div>
            <audio controls autoPlay className="w-full h-8" src={activeAudioUrl} />
          </div>
        )}

        {/* Lista de Tarjetas Multimedia */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="bg-white rounded-2xl border border-border p-5 shadow-sm animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-muted mb-4" />
                <div className="h-4 bg-muted rounded w-2/3 mb-3" />
                <div className="h-3 bg-muted rounded w-full mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : teacherDocuments.length > 0 ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {teacherDocuments.map((doc, index) => (
              <motion.article
                key={doc.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-white rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
                      </div>
                      <div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sena-green/10 text-sena-green">
                          {doc.level || "A1"}
                        </span>
                        <span className="ml-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {doc.competence || "Grammar"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(doc)}
                        title="Editar término"
                        className="p-1.5 hover:bg-muted text-muted-foreground hover:text-sena-blue rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTerm(doc.id, doc.name || doc.wordId || "")}
                        title="Eliminar término"
                        className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-lg text-foreground mb-2">{doc.name || doc.wordId}</h3>

                  <div className="space-y-1.5 mb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
                      <span className="truncate">{doc.program || "Todos los programas"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
                      <span className="truncate">{doc.subjectName || "Sin asignatura"}</span>
                    </div>
                  </div>

                  {doc.definition && (
                    <div className="mb-3 bg-muted/40 rounded-xl p-3">
                      <p className="text-[11px] font-semibold text-sena-blue mb-0.5">Definición</p>
                      <p className="text-xs text-foreground leading-relaxed">{doc.definition}</p>
                    </div>
                  )}

                  {doc.synonyms && (
                    <div className="mb-3">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Sinónimos</p>
                      <div className="flex flex-wrap gap-1">
                        {doc.synonyms.split(",").map((synonym) => (
                          <span
                            key={synonym.trim()}
                            className="text-[11px] bg-sena-blue/10 text-sena-blue px-2 py-0.5 rounded-md"
                          >
                            {synonym.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recursos multimedia servidos por Django Proxy */}
                {(doc.audioUrl || doc.videoUrl || doc.imageUrl) && (
                  <div className="pt-3 border-t border-border mt-2 flex flex-wrap gap-2">
                    {doc.audioUrl && (
                      <button
                        onClick={() => setActiveAudioUrl(resolveMediaUrl(doc.audioUrl))}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-purple-600" strokeWidth={1.8} />
                        Escuchar Audio
                      </button>
                    )}
                    {doc.imageUrl && (
                      <a
                        href={resolveMediaUrl(doc.imageUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-sena-green bg-sena-green/10 hover:bg-sena-green/20 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Image className="w-3.5 h-3.5 text-sena-green" strokeWidth={1.8} />
                        Ver Ilustración
                      </a>
                    )}
                    {doc.videoUrl && (
                      <a
                        href={resolveMediaUrl(doc.videoUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-sena-blue bg-sena-blue/10 hover:bg-sena-blue/20 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Video className="w-3.5 h-3.5 text-sena-blue" strokeWidth={1.8} />
                        Ver Video
                      </a>
                    )}
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-border">
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" strokeWidth={1.8} />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay términos disponibles</h3>
            <p className="text-muted-foreground text-sm">
              No se encontraron términos para {programLabel} con los filtros seleccionados.
            </p>
          </div>
        )}
      </main>

      {/* ── Modal de Creación / Edición de Término Técnico ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-border relative my-8 max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="absolute right-5 top-5 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
              >
                <X className="w-5 h-5" strokeWidth={1.8} />
              </button>

              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-xl bg-sena-green/10 text-sena-green flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6" strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {modalMode === "create" ? "Registrar Nuevo Término Técnico" : "Editar Término Técnico"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Repositorio centralizado con almacenamiento multimedia en MinIO
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveTerm} className="space-y-4">
                {/* Nombre / Palabra Clave */}
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Término en Inglés *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Polymorphism, Recursion, Microservices..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-sena-green/50 text-sm font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Nivel */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Nivel CEFR</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sena-green/40"
                    >
                      <option value="A1">A1</option>
                      <option value="A2">A2</option>
                      <option value="B1">B1</option>
                      <option value="B2">B2</option>
                    </select>
                  </div>

                  {/* Competencia */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Competencia</label>
                    <select
                      value={formData.competence}
                      onChange={(e) => setFormData({ ...formData, competence: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sena-green/40"
                    >
                      <option value="Speaking">Speaking</option>
                      <option value="Grammar">Grammar</option>
                      <option value="Writing">Writing</option>
                      <option value="Reading">Reading</option>
                    </select>
                  </div>

                  {/* Asignatura */}
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Asignatura</label>
                    <select
                      value={formData.subjectId}
                      onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sena-green/40"
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
                  <label className="block text-xs font-bold text-foreground mb-1.5">
                    Definición Técnica en Inglés *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Provide a clear, technical definition in English..."
                    value={formData.definition}
                    onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-sena-green/50 text-sm leading-relaxed"
                  />
                </div>

                {/* Sinónimos */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                    Sinónimos o Términos Relacionados (Separados por coma)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. subprogram, method, procedure"
                    value={formData.synonyms}
                    onChange={(e) => setFormData({ ...formData, synonyms: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-border bg-muted/30 focus:outline-none focus:ring-2 focus:ring-sena-green/50 text-sm"
                  />
                </div>

                {/* Multimedia: Subida a MinIO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-border">
                  {/* Audio */}
                  <div className="p-3 bg-muted/20 border border-border rounded-2xl">
                    <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-purple-600" strokeWidth={1.8} />
                      <span>Audio de Pronunciación</span>
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                    />
                    {formData.audioUrl && !audioFile && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        Audio actual: {formData.audioUrl}
                      </p>
                    )}
                  </div>

                  {/* Imagen */}
                  <div className="p-3 bg-muted/20 border border-border rounded-2xl">
                    <label className="block text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
                      <Image className="w-4 h-4 text-sena-green" strokeWidth={1.8} />
                      <span>Ilustración / Diagrama</span>
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200"
                    />
                    {formData.imageUrl && !imageFile && (
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">
                        Imagen actual: {formData.imageUrl}
                      </p>
                    )}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted font-medium text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl bg-sena-green hover:bg-sena-green/90 text-white font-bold text-xs shadow-md transition flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.8} />
                        <span>Guardando en MinIO...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" strokeWidth={1.8} />
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