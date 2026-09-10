import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  BookOpen, Image as ImageIcon, Music, Video, Search, X, ZoomIn,
  Layers,
} from "lucide-react";

import * as api from "../services/api";
import { IconBadge } from "./ui/icon-badge";

/**
 * Diccionario Multimedia Unificado.
 *
 * Empaqueta en UNA sola vista todas las palabras del diccionario junto con su
 * imagen, audio y video (cuando existan). Está pensado para usarse tanto en el
 * Panel del Estudiante (DashboardPage) como en la página de Medios (MediaPage).
 * Todas las URLs de multimedia se sirven desde MinIO a través del backend.
 *
 * Incluye:
 *  - Carga de imágenes optimizada: `loading="lazy"` + `decoding="async"` +
 *    skeleton animado y fade-in al terminar de cargar (la previsualización
 *    aparece de inmediato y no bloquea el resto de la página).
 *  - Reproductor de audio con <audio controls> con <source> y el tipo MIME
 *    correcto.
 *  - Buscador, filtros (Todos / Con audio / Con imagen / Con video) y contadores
 *    para visualizar rápidamente el estado del diccionario.
 */

type MediaType = "image" | "audio" | "video";

interface UnifiedMediaDictionaryProps {
  title?: string;
  subtitle?: string;
  /** Muestra el botón de eliminar sobre cada palabra enlazada (uso docente). */
  allowDelete?: boolean;
  /** Filtra por asignatura si se recibe un subjectId. */
  subjectId?: string | null;
  /** Se ejecuta después de eliminar una palabra. */
  onChanged?: () => void;
}

type MediaCard = {
  key: string;
  wordId: string;
  definition?: string;
  synonyms?: string;
  subjectName?: string;
  imageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  /** true = viene de una palabra del diccionario; false = archivo suelto del bucket. */
  linked: boolean;
};

const MIME_BY_EXT: Record<string, string> = {
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", flac: "audio/flac",
  m4a: "audio/mp4", webm: "audio/webm", aac: "audio/aac",
  mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
  mkv: "video/x-matroska", ogv: "video/ogg",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml", avif: "image/avif", bmp: "image/bmp",
};

function mimeFromUrl(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "\u0026amp;")
    .replace(/</g, "\u0026lt;")
    .replace(/>/g, "\u0026gt;")
    .replace(/"/g, "\u0026quot;")
    .replace(/'/g, "\u0026#39;");
}

/** Imagen con carga optimizada: skeleton + fade-in mientras carga desde MinIO. */
function MediaImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div className="relative w-full h-40 bg-muted overflow-hidden">
      {!loaded && !errored && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-sena-green/10 to-sena-blue/10" />
      )}
      {errored ? (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
          <ImageIcon className="w-8 h-8" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
}

export function UnifiedMediaDictionary({
  title = "Diccionario ",
  subtitle = "Palabra, imagen y audio empaquetados en una sola vista",
  allowDelete = false,
  subjectId = null,
  onChanged,
}: UnifiedMediaDictionaryProps) {
  const [cards, setCards] = useState<MediaCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "audio" | "image" | "video">("all");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let words: api.ApiDocument[] = [];
      try {
        words = await api.getDocuments();
      } catch {
        words = [];
      }

      const built: MediaCard[] = words
        .filter((w) => !subjectId || w.subjectId === subjectId)
        .map((w) => ({
          key: `word-${w.id}`,
          wordId: w.wordId || w.name,
          definition: w.definition,
          synonyms: w.synonyms,
          subjectName: w.subjectName,
          imageUrl: w.imageUrl || undefined,
          audioUrl: w.audioUrl || undefined,
          videoUrl: w.videoUrl || undefined,
          linked: true,
        }));

      setCards(built);
    } catch {
      setError("No se pudo cargar el diccionario multimedia. Verifica tu conexión o inicia sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  // Log para debugging de imágenes
  useEffect(() => {
    const images = cards.filter(c => c.imageUrl);
    const audios = cards.filter(c => c.audioUrl);
    console.log(`[UnifiedMediaDictionary] Total cards: ${cards.length}, Images: ${images.length}, Audios: ${audios.length}`);
    if (images.length > 0) {
      console.log('[UnifiedMediaDictionary] Sample image URL:', images[0].imageUrl);
    }
  }, [cards]);

  const counts = useMemo(
    () => ({
      words: cards.filter((c) => c.linked).length,
      total: cards.length,
      images: cards.filter((c) => c.imageUrl).length,
      audios: cards.filter((c) => c.audioUrl).length,
      videos: cards.filter((c) => c.videoUrl).length,
    }),
    [cards]
  );

  const filteredCards = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return cards.filter((card) => {
      if (filter !== "all" && !card[`${filter}Url`]) return false;
      if (!term) return true;
      return (
        card.wordId.toLowerCase().includes(term) ||
        (card.definition || "").toLowerCase().includes(term) ||
        (card.synonyms || "").toLowerCase().includes(term)
      );
    });
  }, [cards, searchTerm, filter]);

  const handleDelete = async (card: MediaCard) => {
    const id = card.key.replace("word-", "");
    if (!card.linked || !window.confirm(`¿Eliminar la palabra "${card.wordId}"?`)) return;
    setDeletingKey(card.key);
    try {
      await api.deleteDocument(id);
      setCards((prev) => prev.filter((c) => c.key !== card.key));
      onChanged?.();
    } catch {
      window.alert("No se pudo eliminar la palabra. Intenta de nuevo.");
    } finally {
      setDeletingKey(null);
    }
  };

  const tabs: { key: "all" | "audio" | "image" | "video"; label: string; icon: React.ElementType }[] = [
    { key: "all", label: "Todos", icon: Layers },
    { key: "image", label: `Imágenes (${counts.images})`, icon: ImageIcon },
    { key: "audio", label: `Audios (${counts.audios})`, icon: Music },
    { key: "video", label: `Videos (${counts.videos})`, icon: Video },
  ];

  return (
    <section className="surface-card p-6">
      {/* Encabezado + contadores */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <IconBadge tone="green" size="md">
            <BookOpen />
          </IconBadge>
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-sena-green/10 text-sena-green">
            {counts.words} palabras
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-sena-blue/10 text-sena-blue">
            {counts.images} imágenes
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-worklex-orange/10 text-worklex-orange-dark">
            {counts.audios} audios
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-sena-blue-light/10 text-sena-blue-light">
            {counts.videos} videos
          </span>
        </div>
      </div>

      {/* Buscador + filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar palabra, definición o sinónimo..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-sena-blue/40"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? "bg-sena-green text-white shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div key={item} className="rounded-2xl border border-border overflow-hidden">
              <div className="w-full h-40 bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
                <div className="h-3 bg-muted rounded w-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10 text-sm text-destructive">{error}</div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-10 bg-muted/30 rounded-2xl">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {cards.length === 0
              ? "Todavía no hay multimedia en el diccionario."
              : "No hay resultados para tu búsqueda o filtro."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card, index) => (
            <motion.article
              key={card.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
              className="rounded-2xl border border-border overflow-hidden hover:shadow-soft transition-shadow bg-white"
            >
              {/* Imagen */}
              <div className="relative">
                {card.imageUrl ? (
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => setLightbox({ src: card.imageUrl!, title: card.wordId })}
                  >
                    <MediaImage src={card.imageUrl} alt={card.wordId} />
                    <span className="absolute bottom-2 right-2 bg-black/60 text-white rounded-full p-1.5">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ) : (
                  <div className="w-full h-40 bg-muted flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
                {!card.linked && (
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                    Multimedia
                  </span>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-foreground capitalize">{card.wordId}</h4>
                  {allowDelete && card.linked && (
                    <button
                      type="button"
                      onClick={() => handleDelete(card)}
                      disabled={deletingKey === card.key}
                      className="p-1.5 rounded-full text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      aria-label={`Eliminar ${card.wordId}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {card.subjectName && (
                  <p className="text-xs text-sena-blue font-medium mb-2">{card.subjectName}</p>
                )}

                {card.definition && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{card.definition}</p>
                )}

                {card.synonyms && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {card.synonyms
                      .split(",")
                      .map((syn) => syn.trim())
                      .filter(Boolean)
                      .map((syn) => (
                        <span
                          key={syn}
                          className="text-xs bg-sena-blue/10 text-sena-blue px-2 py-0.5 rounded-full"
                        >
                          {syn}
                        </span>
                      ))}
                  </div>
                )}

                {card.audioUrl && (
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="w-3.5 h-3.5 text-worklex-orange flex-shrink-0" />
                    <audio controls preload="none" className="w-full h-9">
                      <source src={card.audioUrl} type={mimeFromUrl(card.audioUrl)} />
                      Tu navegador no soporta audio.
                    </audio>
                  </div>
                )}

                {card.videoUrl && (
                  <video controls preload="none" className="w-full rounded-lg bg-black mt-2">
                    <source src={card.videoUrl} type={mimeFromUrl(card.videoUrl)} />
                  </video>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      )}

      {/* Lightbox de imagen */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={lightbox.src} alt={lightbox.title} className="w-full object-contain max-h-[70vh]" />
            <div className="p-5 flex items-center justify-between">
              <p className="font-semibold text-foreground text-lg capitalize">{lightbox.title}</p>
              <button
                onClick={() => setLightbox(null)}
                className="w-10 h-10 bg-muted rounded-full flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default UnifiedMediaDictionary;