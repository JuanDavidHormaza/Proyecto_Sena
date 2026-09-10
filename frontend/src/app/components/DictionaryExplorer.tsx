import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Image,
  Music,
  Video,
  Trash2,
  Pencil,
  X,
  BookOpen,
} from "lucide-react";

import {
  DictionaryWord,
} from "../../types/dictionary";

import {
  deleteDictionaryWord,
  getDictionaryWordsBySubject,
} from "../services/dictionaryService";

interface Props {

  subject: string;

  open: boolean;

  onClose: () => void;

  /** Modo solo lectura (estudiante): oculta acciones de editar/eliminar. */
  readOnly?: boolean;

}

export default function DictionaryExplorer({

  subject,

  open,

  onClose,

  readOnly = false,

}: Props) {

function mimeFromUrl(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", flac: "audio/flac",
    m4a: "audio/mp4", webm: "audio/webm", aac: "audio/aac",
    mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
    mkv: "video/x-matroska", ogv: "video/ogg",
  };
  return map[ext] ?? "";
}

  const [loading, setLoading] = useState(false);

  const [words, setWords] = useState<DictionaryWord[]>([]);

  const [search, setSearch] = useState("");

  const [selectedWord, setSelectedWord] =
    useState<DictionaryWord | null>(null);

  useEffect(() => {

    if (!open) return;

    loadDictionary();

  }, [open, subject]);

  async function loadDictionary() {

    try {

      setLoading(true);

      const data =
        await getDictionaryWordsBySubject(subject);

      setWords(data);

    } catch (e) {

      console.error(e);

    } finally {

      setLoading(false);

    }

  }

  async function handleDeleteWord(word: DictionaryWord) {
    if (!confirm(`Eliminar la palabra ${word.word_id}?`)) return;

    try {
      await deleteDictionaryWord(word.id);
      setSelectedWord(null);
      await loadDictionary();
    } catch (error) {
      console.error(error);
    }
  }

  const filteredWords = useMemo(() => {

    return words.filter((word) =>

      word.word_id
        .toLowerCase()
        .includes(search.toLowerCase())

    );

  }, [search, words]);

  if (!open) return null;

  return (

    <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center">

      <div className="bg-white w-[95%] h-[90%] rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        {/* Header */}

        <div className="border-b p-6 flex items-center justify-between">

          <div>

            <h1 className="text-2xl font-bold text-foreground">

              Diccionario {subject}

            </h1>

            <p className="text-muted-foreground">

              {filteredWords.length} palabras

            </p>

            <p className="text-xs text-muted-foreground mt-1">

              Las imagenes, audios y videos se almacenan en MinIO, organizados por programa y ficha.

            </p>

          </div>

          <button

            onClick={onClose}

            className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"

          >

            <X size={22} />

          </button>

        </div>

        {/* Buscador */}

        <div className="p-5">

          <div className="relative">

            <Search

              className="absolute left-3 top-3 text-muted-foreground"

              size={18}

            />

            <input

              type="text"

              placeholder="Buscar palabra..."

              value={search}

              onChange={(e) =>

                setSearch(e.target.value)

              }

              className="w-full border border-border rounded-2xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-sena-green/40 bg-muted/40"

            />

          </div>

        </div>

        {/* Tabla */}

        <div className="flex-1 overflow-auto px-5">

          {loading ? (

            <div className="text-center py-20 text-muted-foreground">

              Cargando...

            </div>

          ) : (

            <table className="w-full">

              <thead>

                <tr className="border-b border-border">

                  <th className="text-left py-3 text-sm font-medium text-muted-foreground">

                    Palabra

                  </th>

                  <th className="text-center py-3 text-sm font-medium text-muted-foreground">

                    Imagen

                  </th>

                  <th className="text-center py-3 text-sm font-medium text-muted-foreground">

                    Audio

                  </th>

                  <th className="text-center py-3 text-sm font-medium text-muted-foreground">

                    Video

                  </th>

                  {!readOnly && (

                  <th className="text-center py-3 text-sm font-medium text-muted-foreground">

                    Acciones

                  </th>

                  )}

                </tr>

              </thead>

              <tbody>

                {filteredWords.map((word) => (

                  <tr

                    key={word.id}

                    className="border-b border-border hover:bg-muted/30 transition-colors"

                  >

                    <td className="py-4 font-medium text-foreground">

                      {word.word_id}

                    </td>

                    <td align="center">

                      {word.image ? (

                        <img
                          src={word.image}
                          alt={word.word_id}
                          loading="lazy"
                          decoding="async"
                          className="w-12 h-12 object-cover rounded-full mx-auto border border-border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />

                      ) : (

                        "-"

                      )}

                    </td>

                    <td align="center">

                      {word.audio ? (

                        <audio controls preload="none" className="h-8 w-40 max-w-[180px]">
                          <source src={word.audio} type={mimeFromUrl(word.audio)} />
                        </audio>

                      ) : (

                        "-"

                      )}

                    </td>

                    <td align="center">

                      {word.video ? (

                        <a
                          href={word.video}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sena-blue-light hover:underline text-xs"
                        >
                          <Video size={16} />
                          Ver
                        </a>

                      ) : (

                        "-"

                      )}

                    </td>

                    {!readOnly && (

                    <td>

                      <div className="flex justify-center gap-2">

                        <button

                          className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-sena-blue transition-colors"

                          onClick={() =>

                            setSelectedWord(word)

                          }

                        >

                          <Pencil size={18} />

                        </button>

                        <button

                          className="p-2 rounded-full hover:bg-destructive/10 text-destructive transition-colors"

                          onClick={() =>

                            handleDeleteWord(word)

                          }

                        >

                          <Trash2 size={18} />

                        </button>

                      </div>

                    </td>

                    )}

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>

        {selectedWord && (

          <div className="border-t border-border bg-muted/30 p-5">

            <div className="flex items-start justify-between gap-4 mb-4">

              <div>

                <h2 className="text-lg font-bold text-foreground">

                  {selectedWord.word_id}

                </h2>

                <p className="text-sm text-muted-foreground">

                  {selectedWord.definition || "Sin definicion registrada"}

                </p>

              </div>

              <button

                onClick={() => setSelectedWord(null)}

                className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"

              >

                <X size={18} />

              </button>

            </div>

            <div className="grid gap-4 md:grid-cols-3">

              <div className="rounded-2xl border border-border bg-white p-3 min-h-32 flex items-center justify-center">

                {selectedWord.image ? (

                  <img
                    src={selectedWord.image}
                    alt={selectedWord.word_id}
                    className="max-h-32 w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />

                ) : (

                  <span className="text-sm text-muted-foreground">Sin imagen</span>

                )}

              </div>

              <div className="rounded-2xl border border-border bg-white p-3">

                <p className="text-xs font-semibold text-muted-foreground mb-2">Audio</p>

                {selectedWord.audio ? (

                  <audio controls preload="none" src={selectedWord.audio} className="w-full">
                    <source src={selectedWord.audio} type={mimeFromUrl(selectedWord.audio)} />
                  </audio>

                ) : (

                  <span className="text-sm text-muted-foreground">Sin audio</span>

                )}

              </div>

              <div className="rounded-2xl border border-border bg-white p-3">

                <p className="text-xs font-semibold text-muted-foreground mb-2">Video</p>

                {selectedWord.video ? (

                  <video controls preload="none" src={selectedWord.video} className="max-h-32 w-full rounded-lg bg-black object-contain">
                    <source src={selectedWord.video} type={mimeFromUrl(selectedWord.video)} />
                  </video>

                ) : (

                  <span className="text-sm text-muted-foreground">Sin video</span>

                )}

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}
