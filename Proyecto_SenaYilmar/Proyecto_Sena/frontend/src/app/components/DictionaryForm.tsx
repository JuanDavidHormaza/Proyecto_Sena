import { useState } from "react";
import { createDictionaryWord } from "@/app/services/dictionaryService";

export default function DictionaryForm() {

  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setLoading(true);

      await createDictionaryWord(
        {
          word,
          definition,
          category,
          level,
        },
        imageFile ?? undefined,
        audioFile ?? undefined,
        videoFile ?? undefined
      );

      alert("Palabra creada correctamente");

      setWord("");
      setDefinition("");
      setCategory("");
      setLevel("");

      setImageFile(null);
      setAudioFile(null);
      setVideoFile(null);

    } catch (error) {
      console.error(error);
      alert("Error al crear la palabra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>

      <h2>Nuevo Diccionario</h2>

      <input
        placeholder="Palabra"
        value={word}
        onChange={(e) => setWord(e.target.value)}
      />

      <textarea
        placeholder="Definición"
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
      />

      <input
        placeholder="Categoría"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      />

      <input
        placeholder="Nivel"
        value={level}
        onChange={(e) => setLevel(e.target.value)}
      />

      <br />

      <label>Imagen</label>

     <div className="space-y-4 mt-5">

  <div>
    <label className="block text-sm font-medium mb-2">
      Imagen
    </label>

    <input
      type="file"
      accept="image/*"
      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
    />
  </div>

  <div>
    <label className="block text-sm font-medium mb-2">
      Audio
    </label>

    <input
      type="file"
      accept="audio/*"
      onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
    />
  </div>

  <div>
    <label className="block text-sm font-medium mb-2">
      Video
    </label>

    <input
      type="file"
      accept="video/*"
      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
    />
  </div>

</div>