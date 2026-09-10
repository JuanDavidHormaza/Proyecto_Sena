import MediaHierarchyExplorer from "../components/MediaHierarchyExplorer";
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
  Plus,
  Search,
  Video,
} from "lucide-react";
import { BrandLogo } from "../components/BrandLogo";
import { UserAccountMenu } from "../components/UserAccountMenu";
import { IconBadge } from "../components/ui/icon-badge";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";
import { Document } from "../data/users";

type DictionaryDocument = Document & {
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
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
  const [documents, setDocuments] = useState<DictionaryDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const teacherName = user?.name || localStorage.getItem("userName") || "Docente";
  const teacherProgram = user?.program || localStorage.getItem("userProgram") || "";

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const apiDocs = await api.getDocuments();
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
      }));

      setDocuments(convertedDocs);
    } catch (error) {
     setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const teacherDocuments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return documents.filter((doc) => {
      const belongsToTeacher = matchesTeacherProgram(doc.program, teacherProgram);
      const matchesSearch =
        !term ||
        doc.name.toLowerCase().includes(term) ||
        doc.subjectName.toLowerCase().includes(term) ||
        (doc.definition || "").toLowerCase().includes(term) ||
        (doc.synonyms || "").toLowerCase().includes(term);

      return belongsToTeacher && matchesSearch;
    });
  }, [documents, searchTerm, teacherProgram]);

  const programLabel = teacherProgram || "tu programa";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/teacher")}
              className="flex items-center gap-3 rounded-full p-2 hover:bg-muted transition-colors text-left"
            >
              <BrandLogo height="h-12" />
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground">English Level Test</h1>
                <p className="text-xs text-muted-foreground">Diccionarios del Docente</p>
              </div>
            </button>

            <UserAccountMenu accent="blue" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={() => navigate("/teacher")}
            className="inline-flex items-center gap-2 text-sm font-medium text-sena-blue hover:text-sena-blue-light mb-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </button>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">Diccionario Multimedia</h2>
              <p className="text-muted-foreground">
                {teacherName.split(" ")[0]}, aqui puedes consultar el diccionario asignado a {programLabel}. Esta es una vista de solo lectura basada en el material multimedia oficial.
              </p>
            </div>
            <div className="surface-card px-4 py-3 min-w-48">
              <p className="text-xs text-muted-foreground">Disponibles</p>
              <p className="text-2xl font-bold text-sena-blue">{teacherDocuments.length}</p>
            </div>
          </div>
        </motion.div>

        <div className="mb-6 rounded-2xl border border-sena-blue/15 bg-sena-blue/5 p-4">
          <p className="text-sm text-sena-blue font-medium">
            Las imagenes, audios y videos se almacenan en MinIO, organizados por programa y ficha.
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por palabra, asignatura o definicion..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-sena-blue/40"
            />
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="surface-card p-5 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-muted mb-5" />
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
                transition={{ delay: index * 0.05 }}
                className="surface-card p-5 hover:shadow-soft-lg transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  {doc.imageUrl ? (
                    <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden border border-border">
                      <img src={doc.imageUrl} alt={doc.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <IconBadge tone="blue" size="md">
                      <BookOpen />
                    </IconBadge>
                  )}
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-sena-green/10 text-sena-green">
                    {isGlobalProgram(doc.program) ? "Global" : "Programa"}
                  </span>
                </div>

                <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{doc.name}</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FolderOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{doc.program || "Todos los programas"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{doc.subjectName || "Sin asignatura"}</span>
                  </div>
                </div>

                {doc.definition && (
                  <div className="mb-4 bg-muted/40 rounded-xl p-3">
                    <p className="text-xs font-semibold text-sena-blue mb-1">Definicion</p>
                    <p className="text-sm text-foreground leading-relaxed">{doc.definition}</p>
                  </div>
                )}

                {doc.synonyms && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Sinonimos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {doc.synonyms.split(",").map((synonym) => (
                        <span key={synonym.trim()} className="text-xs bg-sena-blue/10 text-sena-blue px-2 py-1 rounded-full">
                          {synonym.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {doc.audioUrl && (
                  <div className="mb-3">
                    <audio controls src={doc.audioUrl} className="w-full h-8" />
                  </div>
                )}

                {(doc.audioUrl || doc.videoUrl || doc.imageUrl) && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                    {doc.audioUrl && (
                      <a href={doc.audioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-700 bg-purple-100 px-2.5 py-1.5 rounded-lg">
                        <Music className="w-3.5 h-3.5" />
                        Audio
                      </a>
                    )}
                    {doc.videoUrl && (
                      <a href={doc.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-sena-blue bg-sena-blue/10 px-2.5 py-1.5 rounded-lg">
                        <Video className="w-3.5 h-3.5" />
                        Video
                      </a>
                    )}
                    {doc.imageUrl && (
                      <a href={doc.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-sena-green bg-sena-green/10 px-2.5 py-1.5 rounded-lg">
                        <Image className="w-3.5 h-3.5" />
                        Imagen
                      </a>
                    )}
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 surface-card">
            <BookOpen className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay diccionarios disponibles</h3>
            <p className="text-muted-foreground">No se encontraron diccionarios para {programLabel} con tu busqueda actual.</p>
          </div>
        )}

        {/* Archivos multimedia (MinIO) del programa asignado al docente */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-10">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Archivos Multimedia</h3>
            <p className="text-sm text-muted-foreground">
              Imágenes, audios y videos de {programLabel}, organizados por ficha.
            </p>
          </div>
          <MediaHierarchyExplorer fixedProgram={teacherProgram || undefined} />
        </motion.div>
      </main>
    </div>
  );
}