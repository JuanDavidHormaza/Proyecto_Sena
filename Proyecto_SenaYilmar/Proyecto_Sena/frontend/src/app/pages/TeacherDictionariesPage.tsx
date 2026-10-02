import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  FileText,
  FolderOpen,
  Image,
  Music,
  Search,
  Video,
  Volume2,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
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
  return isGlobalProgram(docProgram) || Boolean(teacherProgram && docProgram === teacherProgram);
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

  const teacherName = user?.name || localStorage.getItem("userName") || "Docente";
  const teacherProgram = user?.program || localStorage.getItem("userProgram") || "";

  // Cargar asignaturas disponibles
  useEffect(() => {
    api.getSubjects()
      .then((data) => setSubjects(data))
      .catch((err) => console.error("Error al cargar asignaturas:", err));
  }, []);

  // Cargar documentos desde Django backend con filtros
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true);
      try {
        const apiDocs = await api.getDocuments({
          subject: selectedSubject !== "all" ? selectedSubject : undefined,
          level: selectedLevel !== "all" ? selectedLevel : undefined,
          competence: selectedCompetence !== "all" ? selectedCompetence : undefined,
          search: searchTerm || undefined,
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
        console.warn("Fallo al conectar con backend, usando documentos mock:", error);
        setDocuments(mockDocuments);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      loadDocuments();
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [selectedSubject, selectedLevel, selectedCompetence, searchTerm]);

  const teacherDocuments = useMemo(() => {
    return documents.filter((doc) => matchesTeacherProgram(doc.program, teacherProgram));
  }, [documents, teacherProgram]);

  const programLabel = teacherProgram || "tu programa";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/teacher")}
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted transition-colors text-left"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg shadow-slate-900/15">
                <img src="/worklex.png" alt="WorkLex logo" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground">English Level Test</h1>
                <p className="text-xs text-muted-foreground">Diccionarios y Documentos del Docente</p>
              </div>
            </button>

            <UserAccountMenu accent="blue" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            onClick={() => navigate("/teacher")}
            className="inline-flex items-center gap-2 text-sm font-medium text-sena-blue hover:text-sena-blue-light mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </button>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Diccionario Digital y Recursos</h2>
              <p className="text-muted-foreground">
                {teacherName.split(" ")[0]}, consulta los términos técnicos, pronunciaciones y material pedagógico asignados a {programLabel}.
              </p>
            </div>
            <div className="bg-white border border-border rounded-xl px-4 py-3 shadow-sm min-w-48">
              <p className="text-xs text-muted-foreground">Términos Disponibles</p>
              <p className="text-2xl font-bold text-sena-blue">{teacherDocuments.length}</p>
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
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

        {/* Reproductor de Audio Flotante (si se seleccionó un audio) */}
        {activeAudioUrl && (
          <div className="fixed bottom-6 right-6 z-50 bg-white border border-border rounded-2xl p-4 shadow-2xl max-w-sm w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-sena-blue flex items-center gap-1.5">
                <Volume2 className="w-4 h-4" /> Reproduciendo Audio
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
                        <BookOpen className="w-5 h-5 text-sena-blue" />
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
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {isGlobalProgram(doc.program) ? "Global" : "Programa"}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-foreground mb-2">{doc.name || doc.wordId}</h3>

                  <div className="space-y-1.5 mb-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{doc.program || "Todos los programas"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
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
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-purple-600" />
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
                        <Image className="w-3.5 h-3.5 text-sena-green" />
                        Ver Imagen
                      </a>
                    )}
                    {doc.videoUrl && (
                      <a
                        href={resolveMediaUrl(doc.videoUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-sena-blue bg-sena-blue/10 hover:bg-sena-blue/20 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <Video className="w-3.5 h-3.5 text-sena-blue" />
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
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay términos disponibles</h3>
            <p className="text-muted-foreground text-sm">
              No se encontraron términos para {programLabel} con los filtros seleccionados.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}