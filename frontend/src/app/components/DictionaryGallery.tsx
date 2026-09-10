import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Image as ImageIcon, Music, Search, Video, Trash2 } from "lucide-react";
import * as api from "../services/api";
import { IconBadge } from "./ui/icon-badge";

/**
 * Galeria del Diccionario Digital.
 *
 * Muestra las palabras guardadas en la base de datos (tabla DigitalDictionary)
 * con la imagen, el audio y el video que viven en los buckets publicos de
 * Supabase (dictionary-images, dictionary-audios, dictionary-videos).
 *
 * Se usa tanto en el Dashboard del estudiante (solo lectura) como en la
 * pagina de Diccionarios del Docente (con opcion de eliminar), sin crear
 * rutas nuevas ni reemplazar lo que ya existia en esas pantallas.
 */

interface DictionaryGalleryProps {
  /** Muestra el boton de eliminar sobre cada tarjeta (uso docente). */
  allowDelete?: boolean;
  /** Titulo de la seccion. */
  title?: string;
  /** Subtitulo/descripcion de la seccion. */
  subtitle?: string;
  /** Filtra por asignatura si se recibe un subjectId. */
  subjectId?: string | null;
  /** Se ejecuta despues de eliminar una palabra, por si el padre necesita refrescar algo. */
  onChanged?: () => void;
}

export function DictionaryGallery({
  allowDelete = false,
  title = "Diccionario Digital",
  subtitle = "Palabras con imagen, audio y video guardadas en Supabase",
  subjectId = null,
  onChanged,
}: DictionaryGalleryProps) {
  const [words, setWords] = useState<api.ApiDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadWords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await api.getDocuments();
      setWords(Array.isArray(docs) ? docs : []);
    } catch (err) {
      console.error("No se pudo cargar el diccionario:", err);
      setError("No se pudo cargar el diccionario. Verifica tu conexion o vuelve a iniciar sesion.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredWords = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return words.filter((word) => {
      const matchesSubject = !subjectId || word.subjectId === subjectId;
      const matchesSearch =
        !term ||
        (word.wordId || word.name || "").toLowerCase().includes(term) ||
        (word.definition || "").toLowerCase().includes(term) ||
        (word.synonyms || "").toLowerCase().includes(term);

      return matchesSubject && matchesSearch;
    });
  }, [words, searchTerm, subjectId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Vas a eliminar esta palabra del diccionario. Continuar?")) return;

    setDeletingId(id);
    try {
      await api.deleteDocument(id);
      setWords((prev) => prev.filter((word) => word.id !== id));
      onChanged?.();
    } catch (err) {
      console.error("No se pudo eliminar la palabra:", err);
      window.alert("No se pudo eliminar la palabra. Intenta de nuevo.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="surface-card p-6">
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

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar palabra o definicion..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-muted/40 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-sena-blue/40"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl border border-border p-4 animate-pulse">
              <div className="w-full h-32 bg-muted rounded-xl mb-3" />
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10 text-sm text-destructive">{error}</div>
      ) : filteredWords.length === 0 ? (
        <div className="text-center py-10 bg-muted/30 rounded-2xl">
          <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {words.length === 0
              ? "Todavia no hay palabras en el diccionario."
              : "No hay palabras que coincidan con tu busqueda."}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredWords.map((word, index) => (
            <motion.article
              key={word.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-border overflow-hidden hover:shadow-soft transition-shadow bg-white"
            >
              <div className="w-full h-32 bg-muted flex items-center justify-center overflow-hidden relative">
                {word.imageUrl ? (
                  <img
                    src={word.imageUrl}
                    alt={word.wordId || word.name}
                    className="w-full h-full object-cover transition-opacity duration-300"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = "none";
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement("div");
                        fallback.className = "flex items-center justify-center w-full h-full";
                        fallback.innerHTML = '<svg class="w-8 h-8 text-muted-foreground/40" stroke="currentColor" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="font-semibold text-foreground capitalize">
                    {word.wordId || word.name}
                  </h4>
                  {allowDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(word.id)}
                      disabled={deletingId === word.id}
                      className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      aria-label={`Eliminar ${word.wordId || word.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-sena-blue font-medium mb-2">{word.subjectName}</p>

                {word.definition && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{word.definition}</p>
                )}

                {word.synonyms && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {word.synonyms.split(",").map((syn) => (
                      <span
                        key={syn.trim()}
                        className="text-xs bg-sena-blue/10 text-sena-blue px-2 py-0.5 rounded-full"
                      >
                        {syn.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {word.audioUrl && (
                  <div className="flex items-center gap-2 mb-2">
                    <Music className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                    <audio controls src={word.audioUrl} className="w-full h-8" />
                  </div>
                )}

                {word.videoUrl && (
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-sena-blue flex-shrink-0" />
                    <a
                      href={word.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-sena-blue hover:underline"
                    >
                      Ver video
                    </a>
                  </div>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </section>
  );
}