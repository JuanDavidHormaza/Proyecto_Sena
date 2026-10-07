// frontend/src/app/components/ImageLightboxModal.tsx
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, Volume2 } from "lucide-react";

export interface LightboxDocItem {
  id?: string;
  name?: string;
  word?: string;
  word_id?: string;
  level?: string;
  competence?: string;
  subjectId?: string;
  subjectName?: string;
  image?: string;
  imageUrl?: string;
  audio?: string;
  audioUrl?: string;
  definition?: string;
  synonyms?: string;
}

export function ImageLightboxModal({
  item,
  onClose,
}: {
  item: LightboxDocItem | null;
  onClose: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const wordName = item.name || item.word || item.word_id || "Término Técnico";
  const level = (item.level || "A1").toUpperCase();
  const competence = item.competence || item.subjectId || item.subjectName || "Speaking";

  // Badges por Nivel CEFR
  const levelColors: Record<string, string> = {
    A1: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    A2: "bg-teal-500/20 text-teal-300 border-teal-500/40",
    B1: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    B2: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
  };
  const levelBadge = levelColors[level] || "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";

  // Resolver imagen y audio a través del streaming proxy
  const rawImage =
    item.image ||
    (item.imageUrl
      ? item.imageUrl.replace(/^\/api\/media\/dictionary-images\//, "")
      : `${wordName.toLowerCase().replace(/\s+/g, "_")}.png`);
  const cleanImageKey = rawImage.replace(/^\/api\/media\/dictionary-images\//, "");
  const imageSrc = `/api/media/dictionary-images/${cleanImageKey}`;

  const rawAudio =
    item.audio ||
    (item.audioUrl
      ? item.audioUrl.replace(/^\/api\/media\/dictionary-audios\//, "")
      : `${wordName.toLowerCase().replace(/\s+/g, "_")}.mp3`);
  const cleanAudioKey = rawAudio.replace(/^\/api\/media\/dictionary-audios\//, "");
  const audioUrl = `/api/media/dictionary-audios/${cleanAudioKey}`;

  const handlePlayAudio = () => {
    setIsPlaying(true);
    const audio = new Audio(audioUrl);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(wordName);
        u.lang = "en-US";
        u.rate = 0.85;
        u.onend = () => setIsPlaying(false);
        u.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(u);
      } else {
        setIsPlaying(false);
      }
    };
    audio.play().catch(() => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(wordName);
        u.lang = "en-US";
        u.rate = 0.85;
        u.onend = () => setIsPlaying(false);
        u.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(u);
      } else {
        setIsPlaying(false);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.2 }}
        className="relative max-w-4xl w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botón de Cierre Superior Derecho */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 sm:right-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all backdrop-blur-xs shadow-lg cursor-pointer"
          title="Cerrar visor (Esc)"
        >
          <X className="w-6 h-6" strokeWidth={1.8} />
        </button>

        {/* Contenedor Central con la Imagen HD */}
        <div className="w-full flex items-center justify-center bg-black/40 border border-white/10 rounded-2xl shadow-2xl p-4 overflow-hidden">
          <img
            src={imageSrc}
            alt={wordName}
            className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-2xl transition-transform duration-300 hover:scale-[1.02]"
          />
        </div>

        {/* Pie de Foto en el Visor */}
        <div className="w-full mt-4 bg-slate-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 text-white backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${levelBadge}`}>
                Nivel {level}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 border border-white/15">
                {competence}
              </span>
              <span className="text-xs text-emerald-400 font-mono">
                {item.program || "ADSO — SENA"}
              </span>
            </div>
            <h3 className="text-2xl font-black text-white tracking-tight">{wordName}</h3>
            {item.definition && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl line-clamp-2">
                {item.definition}
              </p>
            )}
          </div>

          {/* Botón de Audio en el Lightbox */}
          <button
            type="button"
            onClick={handlePlayAudio}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg flex-shrink-0 cursor-pointer ${
              isPlaying
                ? "bg-emerald-500 text-white shadow-emerald-500/40 ring-4 ring-emerald-400/30 scale-105"
                : "bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105"
            }`}
            title={`Escuchar pronunciación de ${wordName}`}
          >
            {isPlaying ? (
              <div className="flex items-center gap-0.5 h-4">
                <span className="w-1 bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-2"></span>
                <span className="w-1 bg-white rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-4"></span>
                <span className="w-1 bg-white rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-3"></span>
                <span className="w-1 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-2"></span>
              </div>
            ) : (
              <Volume2 className="w-6 h-6" strokeWidth={1.8} />
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
