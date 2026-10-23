/**
 * Utilidad unificada de Text-to-Speech (TTS) en inglés para Worklex SENA.
 * Garantiza que se seleccione una voz nativa en inglés (en-US, en-GB, etc.),
 * evitando que los sintetizadores del navegador recurran a voces locales en español.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
  };
}

export function getEnglishVoice(): SpeechSynthesisVoice | null {
  const voices = cachedVoices.length > 0 ? cachedVoices : loadVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Preferir voz nativa/natural en-US de alta fidelidad
  const naturalUs = voices.find((v) => {
    const lang = v.lang.toLowerCase();
    const isUs = lang === "en-us" || lang === "en_us";
    const name = v.name.toLowerCase();
    return isUs && (name.includes("natural") || name.includes("google") || name.includes("samantha") || name.includes("zira") || name.includes("jenny") || name.includes("guy"));
  });
  if (naturalUs) return naturalUs;

  // 2. Cualquier voz en-US
  const enUs = voices.find((v) => {
    const lang = v.lang.toLowerCase();
    return lang === "en-us" || lang === "en_us";
  });
  if (enUs) return enUs;

  // 3. Cualquier voz en inglés (en-GB, en-AU, en-CA, etc.)
  const anyEnglish = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  if (anyEnglish) return anyEnglish;

  return null;
}

export interface PlayEnglishSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function playEnglishSpeech(
  text: string,
  options?: PlayEnglishSpeechOptions
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options?.onError?.(new Error("SpeechSynthesis no está soportado en este navegador."));
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = options?.rate ?? 0.88;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    const voice = getEnglishVoice();
    if (voice) {
      utterance.voice = voice;
    }

    if (options?.onStart) utterance.onstart = options.onStart;
    if (options?.onEnd) utterance.onend = options.onEnd;
    if (options?.onError) utterance.onerror = options.onError;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    options?.onError?.(err);
  }
}
