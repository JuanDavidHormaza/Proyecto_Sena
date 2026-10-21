import React, { useState, useRef } from 'react';
import { IconSettings, IconCode, IconMovie, IconVolume, IconPlayerPause } from '@tabler/icons-react';
import { resolveMediaUrl } from '../services/api';

export const getProgramTitle = (termProg?: string, selected?: string) => {
  const p = (termProg || selected || '').toLowerCase();
  if (p.includes('mecanic') || p.includes('mecánica')) return 'Mecánica Industrial';
  if (p.includes('multi') || p.includes('multimedia')) return 'Producción Multimedia';
  return 'ADSO';
};

export interface DictionaryCardProps {
  term: {
    id?: string | number;
    word?: string;
    wordId?: string;
    name?: string;
    definition?: string;
    spanish_translation?: string;
    spanishTranslation?: string;
    synonyms?: string;
    level?: string;
    competence?: string;
    skill?: string;
    program?: string;
    ficha?: string;
    image?: string;
    imageUrl?: string;
    image_url?: string;
    audio?: string;
    audioUrl?: string;
    audio_url?: string;
  };
  activeProgram?: string;
  index?: number;
  onPlayPronunciation?: (term: any) => void;
  onVoicePractice?: (term: any) => void;
  onOpenLightbox?: (term: any) => void;
  className?: string;
}

export const DictionaryCard: React.FC<DictionaryCardProps> = ({
  term,
  activeProgram,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Determinar especialidad técnica según el programa real del término o del filtro activo
  const progLower = (term.program || activeProgram || '').toLowerCase();
  const isMecanica = progLower.includes('mecánica') || progLower.includes('mecanic') || progLower.includes('3520681');
  const isMultimedia = progLower.includes('multimedia') || progLower.includes('2554901') || progLower.includes('diseño') || progLower.includes('medios');

  const wordText = term.word || term.wordId || term.name || '';
  const rawImage = term.image_url || term.imageUrl || term.image;
  const imageSrc = rawImage ? resolveMediaUrl(rawImage, 'dictionary-images') : '';
  const rawAudio = term.audio_url || term.audioUrl || term.audio;

  // Fallback de pronunciación nativa inmediata con SpeechSynthesis (en-US, rate = 0.88)
  const triggerNativeTTS = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsPlaying(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handlePlayAudio = () => {
    // Si ya está reproduciendo, pausar inmediatamente (toggle de audio)
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      return;
    }

    if (rawAudio) {
      try {
        const resolvedAudio = resolveMediaUrl(rawAudio, 'dictionary-audios');
        const audio = new Audio(resolvedAudio);
        audioRef.current = audio;
        setIsPlaying(true);
        audio.onended = () => setIsPlaying(false);
        audio.onerror = () => {
          setIsPlaying(false);
          triggerNativeTTS(wordText);
        };
        audio.play().catch(() => {
          setIsPlaying(false);
          triggerNativeTTS(wordText);
        });
        return;
      } catch {
        triggerNativeTTS(wordText);
        return;
      }
    }
    triggerNativeTTS(wordText);
  };

  // Avatar SVG estilizado con degradado inmediato según la especialidad técnica del SENA
  const avatarTheme = isMecanica
    ? {
        bg: 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-orange-500/20 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        icon: <IconSettings size={36} stroke={1.8} className="text-amber-600 dark:text-amber-400" />,
        border: 'border-amber-200/80',
      }
    : isMultimedia
    ? {
        bg: 'bg-gradient-to-br from-indigo-500/15 via-indigo-500/5 to-purple-500/20 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
        icon: <IconMovie size={36} stroke={1.8} className="text-indigo-600 dark:text-indigo-400" />,
        border: 'border-indigo-200/80',
      }
    : {
        bg: 'bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-teal-500/20 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        icon: <IconCode size={36} stroke={1.8} className="text-emerald-600 dark:text-emerald-400" />,
        border: 'border-emerald-200/80',
      };

  const initialLetter = (wordText || 'T').charAt(0).toUpperCase();
  const currentProgram = term.program || 'Formación Técnica';

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${className}`}>
      <div>
        {/* Contenedor de Imagen con Cero Bloqueos por 404 de MinIO (Fallback en 0ms) */}
        <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-4 relative select-none">
          {!imgFailed && imageSrc ? (
            <img
              src={imageSrc}
              alt={wordText}
              loading="lazy"
              decoding="async"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 ${avatarTheme.bg}`}>
              <div className="w-12 h-12 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-xs flex items-center justify-center border border-current/20">
                {avatarTheme.icon}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-white/95 dark:bg-slate-900 text-current font-bold text-[11px] flex items-center justify-center font-mono shadow-xs">
                  {initialLetter}
                </span>
                <span className="text-xs font-bold tracking-wider uppercase opacity-90 truncate max-w-[130px]">
                  {term.skill || term.competence || 'Vocabulary'}
                </span>
              </div>
            </div>
          )}

          {/* Badge de Nivel CEFR flotante */}
          <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-xs bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200 border-slate-200/80 dark:border-slate-700 backdrop-blur-xs">
              {term.level || 'A1'}
            </span>
          </div>
        </div>

        {/* Título y Pronunciación en 1 Clic con Opción de Pausa */}
        <div className="flex items-center justify-between mb-2 gap-2">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight truncate" title={wordText}>
            {wordText}
          </h3>
          <button
            type="button"
            onClick={handlePlayAudio}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              isPlaying
                ? 'bg-amber-500 text-white animate-pulse shadow-xs ring-2 ring-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400'
            }`}
            title={isPlaying ? "Pausar pronunciación" : "Escuchar pronunciación"}
          >
            {isPlaying ? <IconPlayerPause size={18} /> : <IconVolume size={18} />}
          </button>
        </div>

        {/* Definición */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 mb-3 leading-relaxed">
          {term.definition || `Concepto técnico clave para formación ${currentProgram}.`}
        </p>

        {/* Traducción al Español */}
        {(term.spanish_translation || term.spanishTranslation) && (
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mb-2">
            ES: {term.spanish_translation || term.spanishTranslation}
          </p>
        )}
      </div>

      {/* Pie dinámico: NUNCA texto quemado */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span>Programa: <strong className="text-slate-700 dark:text-slate-300">{term.program || 'Formación Técnica'}</strong></span>
        <span className="font-mono text-[10px] text-slate-400">SENA CEFR</span>
      </div>
    </div>
  );
};

export default DictionaryCard;
