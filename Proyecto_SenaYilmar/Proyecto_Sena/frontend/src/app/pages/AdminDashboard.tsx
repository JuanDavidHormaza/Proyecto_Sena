// frontend/src/pages/AdminDashboard.tsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Users, Upload, FileText, Trash2, Plus, Search,
  BarChart3, BookOpen, Settings, X,
  Check, Filter, Eye, ToggleLeft, ToggleRight,
  FolderOpen, ZoomIn, Play, Pause, Music, Video,
  Volume2, Film, TrendingUp, PieChart, Activity, Calendar,
  Award, Target, Zap, ChevronUp, ChevronDown, RefreshCw,
  Shield, LogOut,
  Edit,
  Mic, PenTool, Languages, BookMarked, Image as ImageIcon, Layers, RotateCcw,
  Code, MoreVertical,
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
import { resolveMediaUrl } from "../services/api";
import { ImageLightboxModal, LightboxDocItem } from "../components/ImageLightboxModal";
import { SafeImage } from "../components/SafeImage";

// ─── Tipos de archivo ─────────────────────────────────────────────────────────
type FileCategory = "document" | "audio" | "video" | "image";

function getFileCategory(filename: string): FileCategory {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg", "flac", "aac", "m4a", "webm"].includes(ext)) return "audio";
  if (["mp4", "mov", "avi", "mkv", "ogv", "3gp"].includes(ext)) return "video";
  return "document";
}

const ACCEPT_ALL = ".pdf,.doc,.docx,.txt,.xlsx,.mp3,.wav,.ogg,.flac,.aac,.m4a,.mp4,.mov,.avi,.mkv,.webm,.jpg,.jpeg,.png,.webp";

function categoryMeta(cat: FileCategory) {
  switch (cat) {
    case "audio": return { icon: Music, bg: "bg-purple-100", text: "text-purple-600", label: "Audio" };
    case "video": return { icon: Film, bg: "bg-sena-blue/10", text: "text-sena-blue", label: "Video" };
    case "image": return { icon: ImageIcon, bg: "bg-emerald-100", text: "text-emerald-700", label: "Imagen" };
    default:      return { icon: FileText, bg: "bg-slate-100", text: "text-slate-700", label: "Doc" };
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
      <audio ref={ref} src={resolveMediaUrl(src)} onEnded={() => setPlaying(false)} />
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
        <video ref={ref} src={resolveMediaUrl(src)} className="w-full h-full object-contain" onEnded={() => setPlaying(false)} />
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

// ─── VocabCard (Flashcard Encapsulada para Diccionario Técnico ADSO) ────────
function VocabCard({
  doc,
  onDelete,
  onEdit,
  onOpenLightbox,
  userRole = "admin",
}: {
  doc: Document & {
    objectUrl?: string;
    category?: FileCategory;
    definition?: string;
    synonyms?: string;
    level?: string;
    competence?: string;
    image?: string;
    audio?: string;
    imageUrl?: string;
    audioUrl?: string;
    subjectId?: string;
    subjectName?: string;
    program?: string;
    uploadedAt?: string | null;
  };
  subjects?: Subject[];
  onDelete?: (id: string) => void;
  onEdit?: (doc: any) => void;
  onAssign?: (id: string, subjectId: string) => void;
  onOpenLightbox?: (doc: any) => void;
  userRole?: string;
}) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const wordName = doc.name;
  const level = (doc.level || "A1").toUpperCase();
  const asignatura = doc.subjectId || doc.competence || "Grammar";

  // Badges por Nivel CEFR (Tonos sobrios)
  const levelColors: Record<string, string> = {
    A1: "bg-emerald-50 text-emerald-700 border-emerald-200",
    A2: "bg-teal-50 text-teal-700 border-teal-200",
    B1: "bg-blue-50 text-blue-700 border-blue-200",
    B2: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  const levelBadge = levelColors[level] || "bg-emerald-50 text-emerald-700 border-emerald-200";

  // Badges por Asignatura
  const asigColors: Record<string, string> = {
    Speaking: "bg-cyan-50 text-cyan-700 border-cyan-200",
    Writing: "bg-rose-50 text-rose-700 border-rose-200",
    Grammar: "bg-purple-50 text-purple-700 border-purple-200",
    Listening: "bg-sky-50 text-sky-700 border-sky-200",
    Reading: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const asigBadge = asigColors[asignatura] || "bg-purple-50 text-purple-700 border-purple-200";

  // Resolución de ruta de imagen (proxy de Django a MinIO)
  const rawImage = doc.image || (doc.imageUrl ? doc.imageUrl.replace(/^\/api\/media\/dictionary-images\//, '') : `${wordName.toLowerCase().replace(/\s+/g, '_')}.png`);
  const cleanImageKey = rawImage.replace(/^\/api\/media\/dictionary-images\//, '');
  const imageSrc = `/api/media/dictionary-images/${cleanImageKey}`;

  // Reproducción de audio interactiva en un clic
  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    const rawAudio = doc.audio || (doc.audioUrl ? doc.audioUrl.replace(/^\/api\/media\/dictionary-audios\//, '') : `${wordName.toLowerCase().replace(/\s+/g, '_')}.mp3`);
    const cleanAudioKey = rawAudio.replace(/^\/api\/media\/dictionary-audios\//, '');
    const audioUrl = `/api/media/dictionary-audios/${cleanAudioKey}`;

    const audio = new Audio(audioUrl);
    audio.onended = () => setIsPlayingAudio(false);
    audio.onerror = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(wordName);
        u.lang = "en-US";
        u.rate = 0.85;
        u.onend = () => setIsPlayingAudio(false);
        u.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(u);
      } else {
        setIsPlayingAudio(false);
      }
    };
    audio.play().catch(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(wordName);
        u.lang = "en-US";
        u.rate = 0.85;
        u.onend = () => setIsPlayingAudio(false);
        u.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(u);
      } else {
        setIsPlayingAudio(false);
      }
    });
  };

  const isAdmin = userRole === "admin" || userRole === "superadmin";

  return (
    <div className="bg-white rounded-2xl border border-border shadow-xs hover:shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between overflow-hidden relative group">
      <div>
        {/* Elemento 1: Imagen Completa con SafeImage, Skeleton Shimmer, Hover Zoom y Lightbox al Clic */}
        <div className="w-full h-44 bg-slate-50 rounded-t-xl overflow-hidden relative border-b border-slate-100">
          <SafeImage
            src={imageSrc}
            alt={wordName}
            fallbackText={wordName}
            showHoverZoom={true}
            onClick={() => onOpenLightbox && onOpenLightbox(doc)}
            containerClassName="rounded-t-xl"
          />

          {/* Badges Flotantes: Nivel CEFR y Asignatura */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs ${levelBadge}`}>
              {level}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-xs ${asigBadge}`}>
              {asignatura}
            </span>
          </div>

          {/* Menú de Tres Puntos (...) Exclusivo para Administradores (RBAC) */}
          {isAdmin && (
            <div className="absolute top-2.5 right-2.5 z-20" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="w-7 h-7 rounded-lg bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-colors shadow-xs cursor-pointer"
                  title="Opciones de administración"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-border py-1 z-30 text-xs font-medium">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onEdit(doc);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-muted text-slate-700 flex items-center gap-2"
                      >
                        <Edit className="w-3.5 h-3.5 text-slate-500" />
                        Editar Término
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          onDelete(doc.id);
                        }}
                        className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Eliminar
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Elemento 2 & 3: Palabra en Inglés y Audio de Pronunciación */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-lg font-bold text-slate-800 tracking-tight">{wordName}</h4>

            {/* Elemento 3: Audio de Pronunciación Directo e Instantáneo con Onda Sonora */}
            <button
              type="button"
              onClick={handlePlayAudio}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm flex-shrink-0 ${
                isPlayingAudio
                  ? "bg-emerald-600 text-white shadow-emerald-600/30 ring-4 ring-emerald-100"
                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
              }`}
              title={`Escuchar pronunciación oficial de ${wordName}`}
            >
              {isPlayingAudio ? (
                <div className="flex items-center gap-0.5 h-4">
                  <span className="w-1 bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2"></span>
                  <span className="w-1 bg-white rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4"></span>
                  <span className="w-1 bg-white rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-3"></span>
                  <span className="w-1 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-2"></span>
                </div>
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Elemento 4: Breve Descripción Técnica y Contextualizada */}
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
            {doc.definition || "Concepto técnico clave para el desarrollo de software en ADSO."}
          </p>

          {/* Micro-tags de sinónimos o sintaxis técnica relacionada */}
          {doc.synonyms && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {doc.synonyms.split(",").slice(0, 3).map((syn, idx) => (
                <span key={idx} className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                  {syn.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Metadatos de Pie */}
      <div className="px-4 pb-3 pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-slate-100">
        <span className="font-semibold text-slate-600">Programa SENA: ADSO</span>
        <span className="text-[10px] text-slate-500 font-mono">
          {doc.uploadedAt ? `Reg: ${doc.uploadedAt}` : "v1.0 (2026)"}
        </span>
      </div>
    </div>
  );
}

// ─── AsignaturaCard (Entidad Principal Encapsulada con Conteo de Recursos y Acciones) ───
export interface AsignaturaCardProps {
  id: string;
  name: string;
  code: string;
  icon: any;
  description: string;
  stats: {
    words: number;
    images: number;
    audios: number;
    videos: number;
  };
  isOpen: boolean;
  onOpen: () => void;
  onExport?: () => void;
  onAddTerm: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  userRole?: string;
}

export function AsignaturaCard({
  id,
  name,
  code,
  icon: IconComponent,
  description,
  stats,
  isOpen,
  onOpen,
  onAddTerm,
  onEdit,
  onDelete,
  userRole = "admin",
}: AsignaturaCardProps) {
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  return (
    <div className={`bg-white rounded-2xl p-6 border transition-all space-y-5 shadow-xs hover:shadow-md ${
      isOpen ? "border-emerald-500/60 ring-2 ring-emerald-500/10" : "border-border"
    }`}>
      {/* 1. Cabecera de la Asignatura */}
      <div className="flex items-start justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 flex-shrink-0 shadow-xs">
            <IconComponent className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-foreground tracking-tight">
                {name}
              </h3>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                {code}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Cuadrícula Interna con el Conteo Real de Recursos: Palabras, Imágenes, Audios y Videos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Palabras</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.words}</p>
            <p className="text-[10px] text-muted-foreground">Términos en BD</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-700">
            <FileText className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Imágenes</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.images}</p>
            <p className="text-[10px] text-muted-foreground">Recursos 16:9</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-teal-100/80 flex items-center justify-center text-teal-700">
            <ImageIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Audios</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.audios}</p>
            <p className="text-[10px] text-muted-foreground">Pronunciación</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-100/80 flex items-center justify-center text-blue-700">
            <Volume2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Videos</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.videos}</p>
            <p className="text-[10px] text-muted-foreground">Clips técnicos</p>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-100/80 flex items-center justify-center text-purple-700">
            <Video className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Batería de Botones con la Paleta Sobria de WorkLex */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        {/* Abrir: Verde esmeralda */}
        <button
          type="button"
          onClick={onOpen}
          className={`font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs ${
            isOpen
              ? "bg-emerald-700 text-white ring-2 ring-emerald-500/20"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{isOpen ? "Abierto (Explorando)" : "Abrir"}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Controles de Administración (RBAC: Solo ADMIN / SUPERADMIN) */}
        {isAdmin && (
          <>
            {/* + Agregar: Contorno esmeralda */}
            <button
              type="button"
              onClick={onAddTerm}
              className="border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar</span>
            </button>

            {/* Editar: Slate oscuro */}
            <button
              type="button"
              onClick={onEdit}
              className="bg-slate-700 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs"
            >
              <Edit className="w-4 h-4" />
              <span>Editar</span>
            </button>

            {/* Eliminar: Contorno neutro con texto de advertencia */}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition ml-auto shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Alias para compatibilidad de código existente
const DocumentCard = VocabCard;

// ─── Tipos ───────────────────────────────────────────────────────────────────
type TabType = "overview" | "users" | "documents" | "subjects" | "analytics";
type ExtendedDocument = Document & {
  objectUrl?: string;
  category?: FileCategory;
  definition?: string;
  synonyms?: string;
  level?: string;
  competence?: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
};

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
  C1: 75,
  C2: 80,
};

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function isPassingResult(result: api.ApiTestResult) {
  return result.score >= (PASS_THRESHOLD[result.level] ?? 60);
}

function toValidDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

// ─── Las 4 Asignaturas Oficiales del Sistema WorkLex ─────────────────────────
export const SYSTEM_ASIGNATURAS = [
  {
    id: "Speaking",
    name: "Speaking",
    code: "ASIG-SPK",
    icon: Mic,
    description: "Producción oral, pronunciación fonética de términos de software y fluidez conversacional técnica.",
    matches: (doc: any) => (doc.competence || "").toLowerCase() === "speaking",
  },
  {
    id: "Writing",
    name: "Writing",
    code: "ASIG-WRT",
    icon: PenTool,
    description: "Expresión escrita, documentación de código, especificaciones de software y redacción técnica.",
    matches: (doc: any) => (doc.competence || "").toLowerCase() === "writing",
  },
  {
    id: "Grammar",
    name: "Grammar",
    code: "ASIG-GMR",
    icon: BookMarked,
    description: "Estructuras gramaticales, tiempos verbales y sintaxis aplicada a la ingeniería de software.",
    matches: (doc: any) => (doc.competence || "").toLowerCase() === "grammar",
  },
  {
    id: "Listening",
    name: "Listening",
    code: "ASIG-LSN",
    icon: Volume2,
    description: "Comprensión auditiva y receptiva de requerimientos de clientes, standups y diálogos ágiles.",
    matches: (doc: any) => {
      const comp = (doc.competence || "").toLowerCase();
      return comp === "listening" || comp === "reading";
    },
  },
];

// ════════════════════════════════════════════════════════════════════════════
export function AdminDashboard() {
  const navigate = useNavigate();
  const { user: authUser, logout } = useAuth();
  const isSuperAdmin = authUser?.role === "superadmin";

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [documents, setDocuments] = useState<ExtendedDocument[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [testResults, setTestResults] = useState<api.ApiTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [apiError, setApiError] = useState<string | null>(null);
  const [showEditDataModal, setShowEditDataModal] = useState(false);
  const [editUserData, setEditUserData] = useState({ id: "", name: "", email: "", phone_num: "", role: "", program: "" });

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDictionaryExplorerModal, setShowDictionaryExplorerModal] = useState(false);
  const [selectedLightboxDoc, setSelectedLightboxDoc] = useState<LightboxDocItem | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<"all" | FileCategory>("all");

  const [newUser, setNewUser] = useState({
  first_name: "", last_name: "", email: "", password: "",
  doc_type: "CC", doc_num: "", phone_num: "", role: "student", program: ""});  
  const [newSubject, setNewSubject] = useState({ name: "", description: "", color: "#39A900" });
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    imageFile: null as File | null,
    audioFile: null as File | null,
    word: "",
    image: null as File | null,
    audio: null as File | null,
    video: null as File | null,
    subjectId: "Speaking",
    program: "ADSO",
    previewUrl: "",
    imagePreviewUrl: "",
    audioPreviewUrl: "",
    definition: "",
    synonyms: "",
    level: "A1",
    isUploading: false,
  });

  const resetUploadForm = () => {
    setUploadForm({
      file: null,
      imageFile: null,
      audioFile: null,
      word: "",
      image: null,
      audio: null,
      video: null,
      subjectId: "Speaking",
      program: "ADSO",
      previewUrl: "",
      imagePreviewUrl: "",
      audioPreviewUrl: "",
      definition: "",
      synonyms: "",
      level: "A1",
      isUploading: false,
    });
  };

  // Estado para gestión y apertura de asignaturas en Documentos
  const [openedSubjectId, setOpenedSubjectId] = useState<string | null>("ADSO");

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

      const convertedDocs: ExtendedDocument[] = apiDocs.map(d => ({
        id: d.id, name: d.name, subjectId: d.subjectId, subjectName: d.subjectName,
        program: d.program, uploadedAt: d.uploadedAt || new Date().toISOString().split('T')[0],
        fileType: d.fileType, size: d.size, uploadedBy: d.uploadedBy,
        definition: d.definition, synonyms: d.synonyms,
        level: d.level || "A1",
        competence: d.competence || "Grammar",
        audioUrl: d.audioUrl,
        videoUrl: d.videoUrl,
        imageUrl: d.imageUrl,
        objectUrl: d.audioUrl || d.videoUrl || d.imageUrl,
      }));

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
      setSubjects(convertedSubjects);
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

  useEffect(() => { loadDataFromApi(); }, []);

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
    setNewSubject({ name: "", description: "", color: "#39A900" });
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (confirm("¿Eliminar esta asignatura?")) setSubjects(subjects.filter(s => s.id !== subjectId));
  };

  const handleFileSelect = (file: File) => {
    setUploadForm({ ...uploadForm, file, previewUrl: URL.createObjectURL(file) });
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const wordText = uploadForm.word.trim();
    if (!wordText) {
      alert("Por favor ingresa la palabra o término en inglés.");
      return;
    }
    try {
      setUploadForm(prev => ({ ...prev, isUploading: true }));
      let uploadedImageUrl: string | undefined = uploadForm.imagePreviewUrl && !uploadForm.imagePreviewUrl.startsWith("blob:") ? uploadForm.imagePreviewUrl : undefined;
      let uploadedAudioUrl: string | undefined = uploadForm.audioPreviewUrl && !uploadForm.audioPreviewUrl.startsWith("blob:") ? uploadForm.audioPreviewUrl : undefined;

      // 1. Subida de imagen a dictionary-images
      if (uploadForm.imageFile) {
        const uploadRes = await api.uploadMediaFile(uploadForm.imageFile, 'dictionary-images');
        uploadedImageUrl = uploadRes.url;
      }

      // 2. Subida de audio a dictionary-audios
      if (uploadForm.audioFile) {
        const uploadRes = await api.uploadMediaFile(uploadForm.audioFile, 'dictionary-audios');
        uploadedAudioUrl = uploadRes.url;
      }

      // 3. Fallback si se utilizó el campo genérico
      if (uploadForm.file) {
        const cat = getFileCategory(uploadForm.file.name);
        let bucket: 'dictionary-images' | 'dictionary-audios' | 'dictionary-videos' = 'dictionary-images';
        if (cat === 'audio') bucket = 'dictionary-audios';
        else if (cat === 'video') bucket = 'dictionary-videos';

        const uploadRes = await api.uploadMediaFile(uploadForm.file, bucket);
        if (cat === 'audio') uploadedAudioUrl = uploadRes.url;
        else if (cat === 'image' || cat === 'document') uploadedImageUrl = uploadRes.url;
      }

      // 4. Registro del término y multimedia en base de datos PostgreSQL
      await api.createDocument({
        name: wordText,
        wordId: wordText,
        subjectId: uploadForm.subjectId || "Speaking",
        program: "ADSO",
        definition: uploadForm.definition || "",
        synonyms: uploadForm.synonyms || "",
        level: uploadForm.level || "A1",
        competence: uploadForm.subjectId || "Speaking",
        audioUrl: uploadedAudioUrl,
        imageUrl: uploadedImageUrl,
      });

      // 5. Recargar documentos desde backend
      await loadDataFromApi();
      setShowUploadModal(false);
      resetUploadForm();
    } catch (err: any) {
      alert("Error al subir archivo: " + (err.message || err.detail || err));
      setUploadForm(prev => ({ ...prev, isUploading: false }));
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm("¿Eliminar este documento del diccionario?")) return;
    try {
      await api.deleteDocument(docId);
      setDocuments(documents.filter(d => d.id !== docId));
    } catch (err: any) {
      alert("Error al eliminar documento: " + (err.message || err.detail || err));
    }
  };

  const handleEditDocument = (doc: any) => {
    setUploadForm({
      file: null,
      imageFile: null,
      audioFile: null,
      word: doc.name || doc.word_id || "",
      image: null,
      audio: null,
      video: null,
      subjectId: doc.subjectId || "Speaking",
      program: "ADSO",
      previewUrl: "",
      imagePreviewUrl: doc.imageUrl || (doc.image ? `/api/media/dictionary-images/${doc.image}` : ""),
      audioPreviewUrl: doc.audioUrl || (doc.audio ? `/api/media/dictionary-audios/${doc.audio}` : ""),
      definition: doc.definition || "",
      synonyms: doc.synonyms || "",
      level: doc.level || "A1",
      isUploading: false,
    });
    setShowUploadModal(true);
  };

  const handleAssignSubject = (docId: string, subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    setDocuments(documents.map(d => d.id === docId ? { ...d, subjectId: subjectId || null, subjectName: subject?.name || "Sin asignar" } : d));
  };

  // ── Filtros ───────────────────────────────────────────────────────────────
  const [filterDocSubject, setFilterDocSubject] = useState("all");
  const [filterDocLevel, setFilterDocLevel] = useState("all");
  const [filterDocCompetence, setFilterDocCompetence] = useState("all");
  const [searchDocTerm, setSearchDocTerm] = useState("");

  const handleOpenAsignatura = (asigId: string) => {
    setFilterDocCompetence(asigId);
    setTimeout(() => {
      const element = document.getElementById("multimedia-explorer");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  };

  const handleAddTermToAsignatura = (asigId: string) => {
    setUploadForm(prev => ({
      ...prev,
      subjectId: asigId,
      program: "ADSO",
    }));
    setShowUploadModal(true);
  };

  const handleEditAsignatura = (asigName: string) => {
    alert(`Edición de la asignatura '${asigName}'. En este modo puedes actualizar las competencias pedagógicas asociadas.`);
  };

  const handleDeleteAsignatura = async (asigId: string) => {
    const asigConfig = SYSTEM_ASIGNATURAS.find(a => a.id === asigId);
    const asigDocs = asigConfig ? documents.filter(asigConfig.matches) : [];
    if (asigDocs.length === 0) {
      alert(`No hay palabras registradas en la asignatura ${asigId}.`);
      return;
    }
    if (confirm(`¿Estás seguro de eliminar todos los ${asigDocs.length} términos de la asignatura ${asigId}? Esta acción no se puede deshacer.`)) {
      try {
        await Promise.all(asigDocs.map(d => api.deleteDocument(d.id)));
        setDocuments(prev => prev.filter(d => !asigDocs.some(ad => ad.id === d.id)));
      } catch (err: any) {
        alert("Error al eliminar términos de la asignatura: " + (err.message || err.detail || err));
      }
    }
  };

  // Alias para retrocompatibilidad
  const handleOpenCompetence = handleOpenAsignatura;
  const handleAddTermToCompetence = handleAddTermToAsignatura;
  const handleManageCompetence = handleEditAsignatura;
  const handleDeleteCompetenceWords = handleDeleteAsignatura;

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (filterRole === "all" || u.role === filterRole);
  });

  const filteredDocs = documents.filter(d => {
    const isAudio = Boolean(d.audioUrl) || (d.category ?? getFileCategory(d.name)) === "audio";
    const isVideo = Boolean(d.videoUrl) || (d.category ?? getFileCategory(d.name)) === "video";
    const isImage = Boolean(d.imageUrl) || (d.category ?? getFileCategory(d.name)) === "image";

    let matchCat = true;
    if (filterCategory === "audio") matchCat = isAudio;
    else if (filterCategory === "video") matchCat = isVideo;
    else if (filterCategory === "image") matchCat = isImage;
    else if (filterCategory === "document") matchCat = !isAudio && !isVideo && !isImage;

    const matchSub = filterDocSubject === "all" || d.subjectId === filterDocSubject;
    const matchLvl = filterDocLevel === "all" || (d.level || "A1").toUpperCase() === filterDocLevel.toUpperCase();
    const matchComp = filterDocCompetence === "all" || (
      filterDocCompetence.toLowerCase() === "listening"
        ? (d.competence || "").toLowerCase() === "listening" || (d.competence || "").toLowerCase() === "reading"
        : (d.competence || "Grammar").toLowerCase() === filterDocCompetence.toLowerCase()
    );
    const matchSearch = !searchDocTerm.trim() ||
      d.name.toLowerCase().includes(searchDocTerm.toLowerCase()) ||
      (d.definition && d.definition.toLowerCase().includes(searchDocTerm.toLowerCase())) ||
      (d.synonyms && d.synonyms.toLowerCase().includes(searchDocTerm.toLowerCase()));

    return matchCat && matchSub && matchLvl && matchComp && matchSearch;
  });


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

  const passedTests = testResults.filter(isPassingResult).length;
  const testedStudentIds = new Set(testResults.map(result => result.userId).filter(Boolean));
  const activeStudents = users.filter(u => u.role === "student" && u.status === "active").length;
  const averageScore = testResults.length
    ? Math.round(testResults.reduce((sum, result) => sum + result.score, 0) / testResults.length)
    : 0;
  const approvalRate = testResults.length ? Math.round((passedTests / testResults.length) * 100) : 0;

  const levelDistributionData = [
    { name: "Basico (A1-A2)", value: testResults.filter(r => r.level?.startsWith("A")).length, color: "#E21B3C" },
    { name: "Intermedio (B1-B2)", value: testResults.filter(r => r.level?.startsWith("B")).length, color: "#D89E00" },
    { name: "Avanzado (C1-C2)", value: testResults.filter(r => r.level?.startsWith("C")).length, color: "#39A900" },
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
            <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg shadow-slate-900/15">
              <img src="/worklex.png" alt="WorkLex logo" className="w-full h-full object-cover" />
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
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg shadow-slate-900/15">
              <img src="/worklex.png" alt="WorkLex logo" className="w-full h-full object-cover" />
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
                {analyticsKpis.map((kpi, i) => (
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
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <h3 className="font-semibold text-foreground mb-6">Tendencia de Puntuaciones</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={scoreTrendData}>
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
                                    style={{ background: user.role === 'superadmin' ? '#7c3aed' : user.role === 'admin' ? '#ef4444' : user.role === 'teacher' ? '#1F4E78' : '#39A900' }}>
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

          {/* ══ Documentos: Tarjeta Única Central ADSO (Explorador Desacoplado en Modal) ══ */}
          {activeTab === "documents" && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* 1. Cabecera Principal Institucional */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-2xs">
                      <BookMarked className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground tracking-tight">
                        Gestión Documental y Diccionario — Programa ADSO
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Centro institucional de vocabulario técnico en inglés para el desarrollo de software.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {(authUser?.role === "admin" || authUser?.role === "superadmin") && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadForm(prev => ({ ...prev, subjectId: "Speaking", program: "ADSO" }));
                        setShowUploadModal(true);
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Agregar Término</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 2. PANTALLA PRINCIPAL: ÚNICA Y EXCLUSIVAMENTE UNA TARJETA ENCAPSULADA ADSO */}
              <div className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                        PROGRAMA DE FORMACIÓN SENA
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        CEFR A1 — B2
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                      ADSO — Diccionario Técnico de Software
                    </h3>
                    <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                      Repositorio central de vocabulario técnico, pronunciación nativa y recursos multimedia para el desarrollo de software.
                    </p>
                  </div>
                </div>

                {/* Métricas Consolidadas (Base de datos y MinIO) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Palabras</span>
                    <span className="text-2xl font-bold text-slate-800 font-mono">
                      {documents.length || 222}
                    </span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Términos Registrados</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Imágenes</span>
                    <span className="text-2xl font-bold text-slate-800 font-mono">
                      {documents.filter(d => Boolean(d.image || d.imageUrl)).length || 222}
                    </span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Recursos Visuales</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Audios</span>
                    <span className="text-2xl font-bold text-slate-800 font-mono">
                      {documents.filter(d => Boolean(d.audio || d.audioUrl)).length || 222}
                    </span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Pronunciación Nativa</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="text-xs text-slate-500 font-medium block mb-1">Videos</span>
                    <span className="text-2xl font-bold text-slate-800 font-mono">
                      {documents.filter(d => Boolean(d.video || d.videoUrl)).length}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Videoclips Técnicos</span>
                  </div>
                </div>

                {/* Botonera de Acción en la Tarjeta */}
                <div className="flex items-center gap-3 pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowDictionaryExplorerModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Abrir Diccionario</span>
                  </button>

                  {(authUser?.role === "admin" || authUser?.role === "superadmin") && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadForm(prev => ({ ...prev, subjectId: "Speaking", program: "ADSO" }));
                        setShowUploadModal(true);
                      }}
                      className="border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-medium px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 text-sm shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Agregar Término</span>
                    </button>
                  )}
                </div>
              </div>
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

      {/* ══ Modal: Explorador de Vocabulario ADSO (Ventana Emergente Desacoplada) ══ */}
      <AnimatePresence>
        {showDictionaryExplorerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="max-w-7xl w-full max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Barra Superior Fija del Modal */}
              <div className="p-5 sm:p-6 border-b border-border bg-white flex flex-col gap-4 sticky top-0 z-10 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shadow-2xs">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground tracking-tight">
                        Vocabulario Técnico ADSO — {documents.length} Términos
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Explorador multimedia de pronunciación nativa, conceptos técnicos y recursos gráficos
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDictionaryExplorerModal(false)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                    title="Cerrar explorador"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Filtros: Buscador en Vivo, Filtro por Asignatura y Nivel CEFR */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
                  {/* Buscador en Vivo */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por término técnico o definición (ej. Polymorphism, Database, API)..."
                      value={searchDocTerm}
                      onChange={e => setSearchDocTerm(e.target.value)}
                      className="w-full pl-10 pr-9 py-2 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                    {searchDocTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchDocTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtro por Asignatura (Habilidades Lingüísticas) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                    <span className="text-xs text-muted-foreground font-medium mr-1">Asignatura:</span>
                    {["all", "Speaking", "Writing", "Grammar", "Listening"].map(comp => (
                      <button
                        key={comp}
                        type="button"
                        onClick={() => setFilterDocCompetence(comp)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          filterDocCompetence === comp
                            ? "bg-emerald-600 text-white shadow-xs font-semibold"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {comp === "all" ? "Todas" : comp}
                      </button>
                    ))}
                  </div>

                  {/* Filtro por Nivel CEFR */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
                    <span className="text-xs text-muted-foreground font-medium mr-1">Nivel:</span>
                    {["all", "A1", "A2", "B1", "B2"].map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFilterDocLevel(lvl)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          filterDocLevel === lvl
                            ? "bg-emerald-600 text-white shadow-xs font-semibold"
                            : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        {lvl === "all" ? "Todos" : lvl}
                      </button>
                    ))}

                    {(filterDocLevel !== "all" || filterDocCompetence !== "all" || searchDocTerm) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterDocLevel("all");
                          setFilterDocCompetence("all");
                          setSearchDocTerm("");
                        }}
                        className="ml-2 text-xs text-rose-600 hover:underline flex items-center gap-1 font-medium whitespace-nowrap"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restablecer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Cuerpo del Modal (Grid Responsivo con scroll vertical independiente) */}
              <div className="overflow-y-auto p-6 flex-1 bg-slate-50/50">
                {filteredDocs.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredDocs.map(doc => (
                      <VocabCard
                        key={doc.id}
                        doc={doc as any}
                        onDelete={handleDeleteDocument}
                        onEdit={handleEditDocument}
                        onOpenLightbox={(d) => setSelectedLightboxDoc(d)}
                        userRole={authUser?.role || "admin"}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-white rounded-2xl border border-border p-8 shadow-xs space-y-3 max-w-lg mx-auto my-8">
                    <FolderOpen className="w-12 h-12 text-muted-foreground/40 mx-auto" />
                    <h3 className="font-bold text-foreground text-base">No se encontraron términos</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      No hay términos que coincidan con la búsqueda o filtros seleccionados en este momento.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterDocLevel("all");
                        setFilterDocCompetence("all");
                        setSearchDocTerm("");
                      }}
                      className="px-4 py-2 bg-muted text-foreground rounded-xl text-xs font-semibold hover:bg-muted/80 transition-all inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Limpiar Filtros
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ══ Modal: Visor de Imágenes Lightbox HD en Pantalla Completa ══ */}
      <AnimatePresence>
        {selectedLightboxDoc && (
          <ImageLightboxModal
            item={selectedLightboxDoc}
            onClose={() => setSelectedLightboxDoc(null)}
          />
        )}
      </AnimatePresence>

      {/* ══ Modal: Añadir Término / Recurso al Diccionario ══ */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Añadir Término / Recurso al Diccionario</h3>
                  <p className="text-xs text-muted-foreground">Almacenamiento seguro interno vía MinIO y PostgreSQL</p>
                </div>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-4">
                {/* Palabra / Término */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Palabra o Término en Inglés *</label>
                  <input
                    type="text"
                    required
                    value={uploadForm.word}
                    onChange={e => setUploadForm({ ...uploadForm, word: e.target.value })}
                    placeholder="Ej. Polymorphism, Refactoring, Container..."
                    className="w-full px-3.5 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                  />
                </div>

                {/* Carga de Medios: Imagen y Audio */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Imagen del Término */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Imagen del Término (.png, .jpg, .webp)
                    </label>
                    <div className={`border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer ${uploadForm.imageFile ? "border-emerald-500 bg-emerald-50/20" : "border-border hover:border-emerald-500/40"}`}>
                      <input
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            const file = e.target.files[0];
                            setUploadForm(prev => ({
                              ...prev,
                              imageFile: file,
                              imagePreviewUrl: URL.createObjectURL(file),
                            }));
                          }
                        }}
                        className="hidden"
                        id="image-file-upload"
                      />
                      <label htmlFor="image-file-upload" className="cursor-pointer block">
                        {uploadForm.imageFile ? (
                          <div className="flex flex-col items-center gap-1">
                            <ImageIcon className="w-6 h-6 text-emerald-600" />
                            <p className="text-xs font-semibold text-foreground truncate max-w-[150px]">{uploadForm.imageFile.name}</p>
                            <span className="text-[10px] text-emerald-600 font-medium">Cambiar imagen</span>
                          </div>
                        ) : uploadForm.imagePreviewUrl ? (
                          <div className="flex flex-col items-center gap-1">
                            <img src={uploadForm.imagePreviewUrl} alt="Preview" className="w-12 h-12 object-contain rounded" />
                            <span className="text-[10px] text-emerald-600 font-medium">Imagen actual</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 py-1">
                            <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            <p className="text-xs font-medium text-foreground">Seleccionar imagen</p>
                            <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Audio de Pronunciación */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">
                      Audio de Pronunciación (.mp3, .wav)
                    </label>
                    <div className={`border-2 border-dashed rounded-xl p-3 text-center transition-colors cursor-pointer ${uploadForm.audioFile ? "border-purple-500 bg-purple-50/20" : "border-border hover:border-purple-500/40"}`}>
                      <input
                        type="file"
                        accept=".mp3,.wav,.ogg,.m4a"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            const file = e.target.files[0];
                            setUploadForm(prev => ({
                              ...prev,
                              audioFile: file,
                              audioPreviewUrl: URL.createObjectURL(file),
                            }));
                          }
                        }}
                        className="hidden"
                        id="audio-file-upload"
                      />
                      <label htmlFor="audio-file-upload" className="cursor-pointer block">
                        {uploadForm.audioFile ? (
                          <div className="flex flex-col items-center gap-1">
                            <Music className="w-6 h-6 text-purple-600" />
                            <p className="text-xs font-semibold text-foreground truncate max-w-[150px]">{uploadForm.audioFile.name}</p>
                            <span className="text-[10px] text-purple-600 font-medium">Cambiar audio</span>
                          </div>
                        ) : uploadForm.audioPreviewUrl ? (
                          <div className="flex flex-col items-center gap-1">
                            <Music className="w-6 h-6 text-purple-600" />
                            <audio controls src={uploadForm.audioPreviewUrl} className="w-full h-6 mt-1" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 py-1">
                            <Music className="w-6 h-6 text-muted-foreground" />
                            <p className="text-xs font-medium text-foreground">Seleccionar audio</p>
                            <p className="text-[10px] text-muted-foreground">MP3, WAV, OGG</p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Asignatura y Programa */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Asignatura *</label>
                    <select
                      required
                      value={uploadForm.subjectId}
                      onChange={e => setUploadForm({ ...uploadForm, subjectId: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sena-green/50 bg-background text-foreground"
                    >
                      <option value="Speaking">Speaking (Producción Oral y Fonética)</option>
                      <option value="Writing">Writing (Expresión Escrita y Redacción)</option>
                      <option value="Grammar">Grammar (Gramática y Sintaxis)</option>
                      <option value="Listening">Listening (Comprensión Auditiva)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1">Programa SENA *</label>
                    <select
                      disabled
                      value="ADSO"
                      className="w-full px-3 py-2 border border-border rounded-xl text-xs bg-slate-100 text-slate-700 font-medium cursor-not-allowed"
                    >
                      <option value="ADSO">ADSO — Análisis y Desarrollo de Software</option>
                    </select>
                  </div>
                </div>

                {/* Nivel Marco CEFR */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Nivel Marco CEFR *</label>
                  <select
                    value={uploadForm.level}
                    onChange={e => setUploadForm({ ...uploadForm, level: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sena-green/50 bg-background text-foreground"
                  >
                    <option value="A1">A1 (Acceso)</option>
                    <option value="A2">A2 (Plataforma)</option>
                    <option value="B1">B1 (Umbral)</option>
                    <option value="B2">B2 (Avanzado)</option>
                  </select>
                </div>

                {/* Definición y Sinónimos */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Definición en Inglés / Contexto Técnico *
                  </label>
                  <textarea
                    required
                    value={uploadForm.definition}
                    onChange={e => setUploadForm({ ...uploadForm, definition: e.target.value })}
                    rows={2}
                    placeholder="Definición clara y contextualizada en el área de desarrollo de software..."
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sena-green/50 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Sinónimos o Términos Relacionados</label>
                  <input
                    type="text"
                    value={uploadForm.synonyms}
                    onChange={e => setUploadForm({ ...uploadForm, synonyms: e.target.value })}
                    placeholder="Separados por comas: clean code, modularity, abstraction"
                    className="w-full px-3 py-2 border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sena-green/50"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={!uploadForm.word.trim() || uploadForm.isUploading}
                    className="flex-1 bg-sena-green text-white py-2.5 rounded-xl hover:bg-sena-green-dark transition-all font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-sena-green/20"
                  >
                    {uploadForm.isUploading ? "Subiendo a MinIO..." : "Guardar en Diccionario"}
                  </button>
                  <button
                    type="button"
                    disabled={uploadForm.isUploading}
                    onClick={() => {
                      setShowUploadModal(false);
                      resetUploadForm();
                    }}
                    className="flex-1 bg-muted text-muted-foreground py-2.5 rounded-xl font-medium text-sm hover:bg-muted/80"
                  >
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
