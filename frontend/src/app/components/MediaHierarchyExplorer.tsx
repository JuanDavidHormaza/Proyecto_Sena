// =======================================================================
// MediaHierarchyExplorer
// Explora los archivos multimedia guardados en MinIO en DOS formas:
//
//   1) Normal:  Programa -> Ficha -> Tipo (Imágenes / Audios / Videos)
//   2) Inversa: Tipo (Imágenes / Audios / Videos) -> Programa -> Ficha
//
// Optimizado para carga rápida:
//   - Solo pide los conteos (árbol) al entrar, NUNCA todos los archivos.
//   - Los archivos reales (imágenes/audios) se piden solo cuando el
//     usuario abre una carpeta puntual (lazy loading).
//   - Las imágenes usan loading="lazy" + decoding="async".
// =======================================================================

import { useEffect, useMemo, useState } from "react";
import {
  FolderOpen,
  Image as ImageIcon,
  Music,
  Video,
  ChevronRight,
  ChevronDown,
  Layers,
  GitCompareArrows,
  Loader2,
} from "lucide-react";
import {
  getMediaTree,
  getMediaTreeByType,
  listMedia,
  ProgramNode,
  InverseTree,
  MediaAsset,
  MediaType,
} from "../services/mediaService";

type ViewMode = "byProgram" | "byType";

const TYPE_LABELS: Record<MediaType, string> = {
  image: "Imágenes",
  audio: "Audios",
  video: "Videos",
};

const TYPE_ICONS: Record<MediaType, typeof ImageIcon> = {
  image: ImageIcon,
  audio: Music,
  video: Video,
};

interface Props {
  /** Si se define, limita todo el explorador a un solo programa (ej. docente). */
  fixedProgram?: string;
  /** Modo solo lectura (oculta acciones de borrado, etc.) — reservado para uso futuro. */
  readOnly?: boolean;
}

export default function MediaHierarchyExplorer({ fixedProgram }: Props) {
  const [mode, setMode] = useState<ViewMode>("byProgram");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tree, setTree] = useState<ProgramNode[]>([]);
  const [inverseTree, setInverseTree] = useState<InverseTree | null>(null);

  // Carpeta actualmente expandida (para lazy-load de sus archivos).
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<MediaAsset[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([getMediaTree(), getMediaTreeByType()])
      .then(([normalTree, byType]) => {
        if (!active) return;
        setTree(normalTree);
        setInverseTree(byType);
      })
      .catch(() => {
        if (active) setError("No fue posible cargar el contenido multimedia.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleTree = useMemo(() => {
    if (!fixedProgram) return tree;
    return tree.filter((node) => node.program === fixedProgram);
  }, [tree, fixedProgram]);

  const visibleInverse = useMemo(() => {
    if (!inverseTree) return null;
    if (!fixedProgram) return inverseTree;
    const filtered: InverseTree = { image: [], audio: [], video: [] };
    (Object.keys(inverseTree) as MediaType[]).forEach((type) => {
      filtered[type] = inverseTree[type].filter((p) => p.program === fixedProgram);
    });
    return filtered;
  }, [inverseTree, fixedProgram]);

  const toggleFolder = async (key: string, program: string, ficha: string, mediaType?: MediaType) => {
    if (expanded === key) {
      setExpanded(null);
      setExpandedFiles([]);
      return;
    }
    setExpanded(key);
    setFilesLoading(true);
    try {
      const files = await listMedia({
        program,
        ficha: ficha === "Sin ficha" ? "" : ficha,
        media_type: mediaType,
      });
      setExpandedFiles(files);
    } catch {
      setExpandedFiles([]);
    } finally {
      setFilesLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border p-5 animate-pulse">
            <div className="h-4 bg-muted rounded w-2/3 mb-3" />
            <div className="h-3 bg-muted rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 bg-muted/30 rounded-xl">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const isEmpty = visibleTree.length === 0;

  return (
    <div>
      {/* Selector de las 2 formas de jerarquía */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setMode("byProgram")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            mode === "byProgram"
              ? "bg-sena-green text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <Layers className="w-4 h-4" />
          Programa → Ficha → Tipo
        </button>
        <button
          onClick={() => setMode("byType")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            mode === "byType"
              ? "bg-sena-blue text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          <GitCompareArrows className="w-4 h-4" />
          Tipo → Programa → Ficha
        </button>
      </div>

      {isEmpty ? (
        <div className="text-center py-10 bg-muted/30 rounded-2xl">
          <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Todavía no hay archivos multimedia disponibles.
          </p>
        </div>
      ) : mode === "byProgram" ? (
        <div className="space-y-4">
          {visibleTree.map((programNode) => (
            <div key={programNode.program} className="surface-card overflow-hidden">
              <div className="px-5 py-4 bg-sena-green/5 border-b border-border flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-sena-green" />
                <h3 className="font-semibold text-foreground">{programNode.program}</h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  {programNode.fichas.length} ficha(s)
                </span>
              </div>
              <div className="divide-y divide-border">
                {programNode.fichas.map((fichaNode) => {
                  const key = `${programNode.program}::${fichaNode.ficha}`;
                  const isOpen = expanded === key;
                  return (
                    <div key={fichaNode.ficha}>
                      <button
                        onClick={() => toggleFolder(key, programNode.program, fichaNode.ficha)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors text-left"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-foreground">
                          Ficha {fichaNode.ficha === "Sin ficha" ? "(sin ficha)" : fichaNode.ficha}
                        </span>
                        <div className="flex items-center gap-3 ml-auto text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" /> {fichaNode.images}
                          </span>
                          <span className="flex items-center gap-1">
                            <Music className="w-3.5 h-3.5" /> {fichaNode.audios}
                          </span>
                          <span className="flex items-center gap-1">
                            <Video className="w-3.5 h-3.5" /> {fichaNode.videos}
                          </span>
                        </div>
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4">
                          <FileGrid files={expandedFiles} loading={filesLoading} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {(["image", "audio", "video"] as MediaType[]).map((type) => {
            const TypeIcon = TYPE_ICONS[type];
            const programs = visibleInverse?.[type] ?? [];
            if (programs.length === 0) return null;
            return (
              <div key={type} className="surface-card overflow-hidden">
                <div className="px-5 py-4 bg-sena-blue/5 border-b border-border flex items-center gap-3">
                  <TypeIcon className="w-5 h-5 text-sena-blue" />
                  <h3 className="font-semibold text-foreground">{TYPE_LABELS[type]}</h3>
                </div>
                <div className="divide-y divide-border">
                  {programs.map((programNode) => (
                    <div key={programNode.program} className="px-5 py-3">
                      <p className="text-sm font-medium text-foreground mb-2">{programNode.program}</p>
                      <div className="space-y-1">
                        {programNode.fichas.map((fichaNode) => {
                          const key = `${type}::${programNode.program}::${fichaNode.ficha}`;
                          const isOpen = expanded === key;
                          return (
                            <div key={fichaNode.ficha}>
                              <button
                                onClick={() => toggleFolder(key, programNode.program, fichaNode.ficha, type)}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/40 transition-colors text-left"
                              >
                                {isOpen ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Ficha {fichaNode.ficha === "Sin ficha" ? "(sin ficha)" : fichaNode.ficha}
                                </span>
                                <span className="text-xs font-medium text-foreground ml-auto">
                                  {fichaNode.count}
                                </span>
                              </button>
                              {isOpen && (
                                <div className="px-3 pb-3">
                                  <FileGrid files={expandedFiles} loading={filesLoading} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Grilla de archivos de una carpeta (lazy-loaded), con carga optimizada. */
function FileGrid({ files, loading }: { files: MediaAsset[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        Cargando archivos...
      </div>
    );
  }

  if (files.length === 0) {
    return <p className="text-sm text-muted-foreground py-3">Sin archivos en esta carpeta.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
      {files.map((file) => (
        <div key={file.id} className="rounded-2xl border border-border overflow-hidden bg-muted/20">
          {file.media_type === "image" ? (
            <img
              src={file.url}
              alt={file.word_id || file.original_filename}
              loading="lazy"
              decoding="async"
              className="w-full h-24 object-cover"
            />
          ) : file.media_type === "audio" ? (
            <div className="p-2">
              <p className="text-xs font-medium text-foreground truncate mb-1">
                {file.word_id || file.original_filename}
              </p>
              <audio controls preload="none" src={file.url} className="w-full h-8" />
            </div>
          ) : (
            <video controls preload="none" src={file.url} className="w-full h-24 object-cover" />
          )}
          {file.media_type === "image" && (
            <p className="text-xs text-foreground truncate px-2 py-1.5">
              {file.word_id || file.original_filename}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
