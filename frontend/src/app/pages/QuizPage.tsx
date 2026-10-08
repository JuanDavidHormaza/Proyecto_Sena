import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  Check,
  Clock,
  Mic,
  Square,
  Star,
  Trophy,
  Zap,
  X,
  Volume2,
  Loader2,
  Sparkles,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  Lightbulb,
  PenTool,
  FileText,
  Headphones,
  Languages,
} from "lucide-react";
import * as api from "../services/api";
import {
  ExamEngine,
  UnifiedQuestion,
  UserAnswerRecord,
} from "../services/examEngine";
import { SafeImage } from "../components/SafeImage";

type AnswerState = "idle" | "correct" | "incorrect" | "submitted";

function formatQuizTimer(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function QuizPage() {
  const navigate = useNavigate();

  // Instancia única del motor adaptativo desacoplado
  const engineRef = useRef<ExamEngine>(new ExamEngine());
  const [engineState, setEngineState] = useState(() =>
    engineRef.current.getSessionState()
  );

  const currentQuestion: UnifiedQuestion = engineState.currentQuestion;
  const currentLevel = engineState.currentLevel;

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(35);
  const [hasStartedExam, setHasStartedExam] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);

  // Multimedia states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [writingAnswer, setWritingAnswer] = useState<string>("");
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Estados dedicados de evaluación fonética (Speaking)
  const [speakingEvaluation, setSpeakingEvaluation] = useState<api.SpeakingEvaluationResponse | null>(null);
  const [speakingAttempts, setSpeakingAttempts] = useState<number>(0);
  const [isEvaluatingSpeaking, setIsEvaluatingSpeaking] = useState<boolean>(false);
  const [speechTranscript, setSpeechTranscript] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const quizStartedAtRef = useRef(Date.now());
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const advanceTimerRef = useRef<any>(null);

  const userId = localStorage.getItem("userId") || "";
  const userProgram = localStorage.getItem("userProgram") || "SENA";

  // Sincronizar estado del motor
  const refreshEngine = () => {
    setEngineState(engineRef.current.getSessionState());
  };

  const handleStartExam = () => {
    quizStartedAtRef.current = Date.now();
    setHasStartedExam(true);
    setTimeLeft(35);
    if (currentQuestion?.type === "listening") {
      setTimeout(() => {
        handlePlayAudioPrompt();
      }, 400);
    }
  };

  // Limpieza de grabaciones locales
  const cleanupRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    mediaRecorderRef.current = null;
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
    audioChunksRef.current = [];
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setRecordedAudioBlob(null);
    setWritingAnswer("");
    setMediaError(null);
    setSpeakingEvaluation(null);
    setSpeechTranscript("");
    setIsEvaluatingSpeaking(false);
  };

  useEffect(() => {
    return () => {
      cleanupRecording();
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Cargar preguntas dinámicas adaptativas del Diccionario ADSO desde el backend
  useEffect(() => {
    let isMounted = true;
    const fetchDictionaryExamQuestions = async () => {
      try {
        const startData = await api.startAdaptiveExam(userId || undefined);
        if (isMounted && startData?.questions && startData.questions.length > 0) {
          engineRef.current.loadDictionaryQuestions(startData.questions);
          setEngineState(engineRef.current.getSessionState());
        }
      } catch (err) {
        console.warn("Iniciando evaluación con banco local:", err);
      }
    };

    fetchDictionaryExamQuestions();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    cleanupRecording();
    setTimeLeft(35);
    setSelectedAnswer(null);
    setAnswerState("idle");
    setSpeakingAttempts(0);

    if (currentQuestion && hasStartedExam) {
      console.log("Cargando recurso de examen:", {
        word: currentQuestion.wordId || (currentQuestion as any).word,
        type: currentQuestion.type,
        imageKey: currentQuestion.image,
        resolvedImageUrl: api.getMediaUrl("dictionary-images", currentQuestion.image),
        audioKey: currentQuestion.audio,
        resolvedAudioUrl: api.getMediaUrl("dictionary-audios", currentQuestion.audio),
      });

      // Autoplay automático para Listening al cargar la pregunta solo si el examen ya inició
      if (currentQuestion.type === "listening") {
        const autoPlayTimer = setTimeout(() => {
          handlePlayAudioPrompt();
        }, 400);
        return () => clearTimeout(autoPlayTimer);
      }
    }
  }, [currentQuestion?.uniqueKey, hasStartedExam]);

  // Temporizador por pregunta (se pausa mientras graba, escucha o revisa feedback de speaking)
  useEffect(() => {
    if (!hasStartedExam) return;
    const isPaused = isRecording || isUploadingAudio || isEvaluatingSpeaking || isPlayingAudio || speakingEvaluation !== null;
    if (timeLeft > 0 && answerState === "idle" && !isPaused) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && answerState === "idle" && !isPaused) {
      handleTimeout();
    }
  }, [hasStartedExam, timeLeft, answerState, isRecording, isUploadingAudio, isEvaluatingSpeaking, isPlayingAudio, speakingEvaluation]);

  const handleTimeout = () => {
    if (!currentQuestion) return;
    if (currentQuestion.type === "multiple" || currentQuestion.type === "listening") {
      handleAnswerClick(-1);
    } else if (currentQuestion.type === "writing") {
      handleWritingComplete();
    } else if (currentQuestion.type === "speaking") {
      if (recordedAudioBlob && !speakingEvaluation) {
        handleEvaluateSpeaking();
      } else if (!recordedAudioBlob) {
        setMediaError("El tiempo para esta pregunta está por agotarse. Por favor graba tu pronunciación.");
      }
    }
  };

  // ── Grabación de Audio (Speaking) ──────────────────────────────────────────
  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMediaError("El navegador no soporta grabación de audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const localUrl = URL.createObjectURL(blob);
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(localUrl);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setMediaError(null);

      // Web Speech Recognition para transcripción en vivo si el navegador lo soporta
      if (typeof window !== "undefined") {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const recog = new SpeechRec();
            recog.lang = "en-US";
            recog.continuous = true;
            recog.interimResults = true;
            recog.onresult = (ev: any) => {
              let res = "";
              for (let i = 0; i < ev.results.length; i++) {
                res += ev.results[i][0].transcript + " ";
              }
              setSpeechTranscript(res.trim());
            };
            recog.onerror = () => {};
            recog.start();
            speechRecognitionRef.current = recog;
          } catch (e) {
            console.warn("SpeechRecognition no disponible:", e);
          }
        }
      }
    } catch (error) {
      setMediaError("No se ha podido acceder al micrófono. Por favor concede permisos.");
      console.error("Error accediendo al micrófono:", error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // ── Síntesis de Audio (ElevenLabs Backend Proxy con Fallback) ───────────────
  const handlePlayAudioPrompt = async () => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    setMediaError(null);

    const targetWord = (currentQuestion.wordId || currentQuestion.prompt || currentQuestion.question || "Encryption")
      .replace(/^.*?(?:pronuncia|diga|say|pronounce|el término|la palabra)\s*["':]?\s*([a-zA-Z\s_-]+)["']?.*$/i, "$1")
      .trim();

    const textToSpeak = targetWord || currentQuestion.prompt || currentQuestion.question;

    try {
      // 1. Si la pregunta tiene audio predeterminado
      if (currentQuestion.audio) {
        const fullUrl = api.resolveMediaUrl(currentQuestion.audio, "dictionary-audios");
        const audio = new Audio(fullUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => {
          fallbackToSpeechSynthesis(textToSpeak);
        };
        try {
          await audio.play();
          return;
        } catch (playErr) {
          console.warn("Reproducción automática bloqueada por política del navegador:", playErr);
          setIsPlayingAudio(false);
          return;
        }
      }

      // 2. Si tiene wordId, intentar audio del diccionario ADSO
      if (currentQuestion.wordId) {
        const audioKey = `${currentQuestion.wordId.toLowerCase().replace(/\s+/g, '_')}.mp3`;
        const fullUrl = api.resolveMediaUrl(audioKey, "dictionary-audios");
        const audio = new Audio(fullUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => fallbackToSpeechSynthesis(textToSpeak);
        try {
          await audio.play();
          return;
        } catch {
          // continuar a TTS
        }
      }

      // 3. Solicitar al backend Django generación/caché de ElevenLabs
      const ttsData = await api.generateExamTTS(textToSpeak, currentQuestion.id);
      if (ttsData?.audio_url) {
        const proxyAudioUrl = api.resolveMediaUrl(ttsData.audio_url, "exam-audios");
        const audio = new Audio(proxyAudioUrl);
        audioPlayerRef.current = audio;
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => fallbackToSpeechSynthesis(textToSpeak);
        await audio.play();
      } else {
        fallbackToSpeechSynthesis(textToSpeak);
      }
    } catch (err) {
      console.warn("Fallo al reproducir audio desde backend, usando fallback local:", err);
      fallbackToSpeechSynthesis(textToSpeak);
    }
  };

  const fallbackToSpeechSynthesis = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  // ── Manejo de Evaluación de Speaking (Motor Fonético Backend) ─────────────
  const handleEvaluateSpeaking = async () => {
    if (!recordedAudioBlob) {
      setMediaError("Graba tu respuesta oral antes de evaluar.");
      return;
    }

    setIsEvaluatingSpeaking(true);
    setMediaError(null);

    const rawTarget = currentQuestion.wordId || currentQuestion.prompt || currentQuestion.question || "Encryption";
    const cleanedTarget = rawTarget
      .replace(/^.*?(?:pronuncia|diga|say|pronounce|el término|la palabra)\s*["':]?\s*([a-zA-Z\s_-]+)["']?.*$/i, "$1")
      .trim();

    try {
      const evalResult = await api.evaluateSpeakingAudio(
        recordedAudioBlob,
        cleanedTarget || "Encryption",
        currentQuestion.id,
        currentLevel,
        speechTranscript
      );

      const nextAttempts = speakingAttempts + 1;
      setSpeakingAttempts(nextAttempts);
      setSpeakingEvaluation(evalResult);

      // Si aprueba (>= 70%) o alcanza 3 intentos, registramos formalmente en el motor
      if (evalResult.score >= 70 || nextAttempts >= 3) {
        engineRef.current.submitSpeakingAnswer(
          evalResult.audio_url || recordedAudioUrl || "",
          recordedAudioBlob,
          {
            score: evalResult.score,
            isCorrect: evalResult.is_correct,
            feedback: evalResult.feedback,
            transcription: evalResult.transcription,
          }
        );
        refreshEngine();
        if (evalResult.is_correct) {
          setScore((prev) => prev + 1);
        }
      }
    } catch (err: any) {
      console.error("Error al evaluar speaking:", err);
      setMediaError("No se pudo conectar con el servicio de evaluación fonética. Puedes reintentar la grabación.");
    } finally {
      setIsEvaluatingSpeaking(false);
    }
  };

  const handleRetrySpeaking = () => {
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setRecordedAudioBlob(null);
    setSpeakingEvaluation(null);
    setSpeechTranscript("");
    setMediaError(null);
  };

  const handleSpeakingNext = () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setAnswerState("submitted");
    setTimeout(() => {
      advanceStep();
    }, 400);
  };

  // ── Manejo de Respuestas de Opción Múltiple y Listening ───────────────────
  const handleAnswerClick = (optionIndex: number) => {
    if (answerState !== "idle" || (currentQuestion.type !== "multiple" && currentQuestion.type !== "listening")) return;

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    setSelectedAnswer(optionIndex);
    const record = engineRef.current.submitMultipleChoiceAnswer(optionIndex);
    refreshEngine();

    if (record.isCorrect) {
      setAnswerState("correct");
      setScore((prev) => prev + 1);
    } else {
      setAnswerState("incorrect");
    }

    advanceTimerRef.current = setTimeout(() => {
      advanceStep();
    }, 3000);
  };

  // ── Manejo de Respuestas de Writing (Rúbrica Semántica) ───────────────────
  const handleWritingComplete = () => {
    if (answerState !== "idle") return;
    if (!writingAnswer.trim()) {
      setMediaError("Por favor escribe tu respuesta antes de continuar.");
      return;
    }

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    const record = engineRef.current.submitWritingAnswer(writingAnswer);
    refreshEngine();
    setAnswerState("submitted");
    if (record.isCorrect) {
      setScore((prev) => prev + 1);
    }

    advanceTimerRef.current = setTimeout(() => {
      advanceStep();
    }, 3000);
  };

  // ── Manejo de Respuestas de Speaking (Fallback / Timeout) ───────────────
  const handleSpeakingComplete = async () => {
    if (answerState !== "idle") return;
    if (!recordedAudioBlob && !recordedAudioUrl) {
      setMediaError("Graba tu respuesta oral antes de continuar.");
      return;
    }

    setIsUploadingAudio(true);
    setMediaError(null);

    let savedProxyUrl = recordedAudioUrl || "";

    // Subir audio al backend de Django -> MinIO
    if (recordedAudioBlob) {
      try {
        const uploadRes = await api.uploadSpeakingAudio(
          recordedAudioBlob,
          currentQuestion.id,
          currentLevel,
          userId
        );
        if (uploadRes?.audio_url) {
          savedProxyUrl = uploadRes.audio_url;
        }
      } catch (uploadErr) {
        console.warn("No se pudo subir audio a MinIO, conservando referencia local:", uploadErr);
      }
    }

    setIsUploadingAudio(false);
    engineRef.current.submitSpeakingAnswer(savedProxyUrl, recordedAudioBlob || undefined);
    refreshEngine();
    setAnswerState("submitted");
    setScore((prev) => prev + 1);

    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    advanceTimerRef.current = setTimeout(() => {
      advanceStep();
    }, 2000);
  };

  // ── Progresión de Pasos y Finalización ────────────────────────────────────
  const advanceStep = async () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    const outcome = engineRef.current.nextStep();
    refreshEngine();

    if (outcome === "level_up") {
      const nextLvl = engineRef.current.getSessionState().currentLevel;
      setLevelUpMessage(`¡Excelente trabajo! Has desbloqueado el nivel ${nextLvl}.`);
      setTimeout(() => setLevelUpMessage(null), 3000);
      return;
    }

    if (outcome === "exam_completed") {
      await finalizeExam();
    }
  };

  const finalizeExam = async () => {
    const elapsedSeconds = Math.max(
      Math.round((Date.now() - quizStartedAtRef.current) / 1000),
      1
    );
    const summary = engineRef.current.generateFinalSummary(elapsedSeconds);

    const serializableAnswers = summary.answers.map(({ audioBlob, ...item }) => item);

    const payload: Record<string, unknown> = {
      score: summary.finalScore,
      level: summary.finalLevel,
      character: summary.character,
      correct_answers: summary.correctAnswers,
      total_questions: summary.totalQuestions,
      speaking_score: summary.speakingScore,
      writing_score: summary.writingScore,
      level_scores: summary.levelScores,
      feedback: null,
      duration: summary.duration,
      process: {
        userAnswers: serializableAnswers,
        masteredTerms: summary.masteredTerms,
        reinforceTerms: summary.reinforceTerms,
        competencyScores: summary.competencyScores,
      },
      answers: serializableAnswers.map((a) => ({
        questionId: a.questionId,
        difficulty: a.difficultyTier,
        is_correct: a.isCorrect,
      })),
    };

    const numUserId = Number(userId);
    if (Number.isFinite(numUserId) && numUserId > 0) {
      payload.user_id = numUserId;
    }

    try {
      const savedResult = await api.createTestResult(payload);
      localStorage.setItem("lastTestResult", JSON.stringify(savedResult));

      localStorage.setItem("lastTestSummary", JSON.stringify(summary));
      localStorage.setItem("quizAnswers", JSON.stringify(serializableAnswers));

      navigate("/results", {
        state: {
          score: summary.finalScore,
          correctAnswers: summary.correctAnswers,
          totalQuestions: summary.totalQuestions,
          levelReached: summary.finalLevel,
          levelScores: summary.levelScores,
          competencyScores: summary.competencyScores,
          answers: serializableAnswers,
          masteredTerms: summary.masteredTerms,
          reinforceTerms: summary.reinforceTerms,
          duration: summary.duration,
          passed: savedResult?.passed ?? summary.passed,
          threshold: savedResult?.threshold ?? 60,
          breakdown: savedResult?.breakdown,
          auto_feedback: savedResult?.auto_feedback || summary.autoFeedback,
        },
      });
    } catch (saveError) {
      console.error("Error guardando el resultado en base de datos:", saveError);
      localStorage.setItem("lastTestSummary", JSON.stringify(summary));
      localStorage.setItem("quizAnswers", JSON.stringify(serializableAnswers));

      navigate("/results", {
        state: {
          score: summary.finalScore,
          correctAnswers: summary.correctAnswers,
          totalQuestions: summary.totalQuestions,
          levelReached: summary.finalLevel,
          levelScores: summary.levelScores,
          competencyScores: summary.competencyScores,
          answers: serializableAnswers,
          masteredTerms: summary.masteredTerms,
          reinforceTerms: summary.reinforceTerms,
          duration: summary.duration,
          passed: summary.passed,
          threshold: 60,
          auto_feedback: summary.autoFeedback,
        },
      });
    }
  };

  // ── Estilos Corporativos SENA para Opciones ───────────────────────────────
  const getButtonStyle = (index: number) => {
    if (answerState === "idle") {
      return "bg-white hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-500 text-slate-800 font-medium shadow-xs";
    }
    if (index === currentQuestion.correctAnswer) {
      return "bg-emerald-50 border-2 border-emerald-600 text-emerald-950 font-semibold shadow-md ring-1 ring-emerald-600/30";
    }
    if (index === selectedAnswer && answerState === "incorrect") {
      return "bg-rose-50 border-2 border-rose-500 text-rose-950 font-semibold shadow-md";
    }
    return "bg-slate-50/80 border border-slate-200 text-slate-400 opacity-60";
  };

  const getBadgeStyle = (index: number) => {
    if (answerState === "idle") {
      return "bg-slate-100 text-slate-700 border border-slate-200/80";
    }
    if (index === currentQuestion.correctAnswer) {
      return "bg-emerald-600 text-white shadow-xs";
    }
    if (index === selectedAnswer && answerState === "incorrect") {
      return "bg-rose-600 text-white shadow-xs";
    }
    return "bg-slate-200 text-slate-400";
  };

  const getDifficultyStars = () => {
    const diff = currentQuestion.difficulty || 2;
    let stars = 1;
    if (diff >= 5) stars = 2;
    if (diff >= 8) stars = 3;
    return Array(stars).fill(0);
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sena-blue via-sena-blue-light to-sena-green flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
          <Loader2 className="w-12 h-12 text-sena-green animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Preparando Examen Adaptativo</h2>
          <p className="text-sm text-slate-600">Cargando preguntas y recursos del Diccionario Técnico SENA...</p>
        </div>
      </div>
    );
  }

  // ── Pantalla Previa Informativa (Instrucciones antes de iniciar el quiz) ──
  if (!hasStartedExam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sena-blue via-sena-blue-light to-sena-green flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-white/20"
        >
          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
            <img
              src="/worklex.png"
              alt="WorkLex"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-emerald-500/30 shadow-md transition-transform hover:scale-105 flex-shrink-0"
            />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-sena-green">Plataforma SENA</span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">
                Evaluación Diagnóstica y Formativa de Inglés
              </h1>
            </div>
          </div>

          {/* Cards informativas */}
          <div className="space-y-4 mb-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              Bienvenido a la prueba de nivel adaptativa de WorkLex. Antes de comenzar, por favor ten en cuenta las siguientes especificaciones técnicas e instrucciones pedagógicas:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Clock className="w-5 h-5 text-sena-blue flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Duración Estimada</p>
                  <p className="text-slate-500">15 a 20 minutos (35s por pregunta con cuenta regresiva).</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Trophy className="w-5 h-5 text-sena-green flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Niveles Evaluados</p>
                  <p className="text-slate-500">Evaluación progresiva MCER desde A1 hasta B2.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Headphones className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Audio y Video</p>
                  <p className="text-slate-500">Se requiere salida de audio para escuchar modelos y pronunciaciones.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                <Mic className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Micrófono (Speaking)</p>
                  <p className="text-slate-500">Podrás grabarte y escucharte antes de enviar tu evaluación oral.</p>
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
              <span>
                <strong>Importante:</strong> Si inicias la prueba y decides abandonarla sin responder preguntas, se registrará formalmente como <strong>"Sin Nivel / No Presentado"</strong> para no alterar tus estadísticas.
              </span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full sm:w-auto px-5 py-3.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-sm transition cursor-pointer"
            >
              Volver al Dashboard
            </button>
            <button
              type="button"
              onClick={handleStartExam}
              className="w-full flex-1 py-3.5 px-6 rounded-xl bg-sena-green hover:bg-sena-green/90 text-white font-bold text-sm shadow-lg shadow-sena-green/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Comenzar Examen de Nivel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const progress = Math.min(
    Math.round(((engineState.currentQuestionIndexInLevel + 1) / 6) * 100),
    100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sena-blue via-sena-blue-light to-sena-green relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMi4yMDkgMS43OTEtNCA0LTRzNCAxLjc5MSA0IDQtMS43OTEgNC00IDQtNC0xLjc5MS00LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

      <div className="container mx-auto max-w-4xl px-4 py-6 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center gap-3">
            <img
              src="/worklex.png"
              alt="WorkLex"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/40 shadow-lg drop-shadow-xs flex-shrink-0"
            />
            <div>
              <span className="text-white font-bold text-lg block leading-tight">WorkLex English Test</span>
              <span className="text-white/80 text-xs font-medium">Evaluación Progresiva CEFR A1 → B2</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowExitConfirm(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/15 hover:bg-white/25 border border-white/25 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Salir del examen y consolidar progreso actual"
            aria-label="Salir del examen"
          >
            <X className="w-4 h-4 text-rose-300" />
            <span className="hidden sm:inline">Salir del Examen</span>
          </button>
        </motion.div>

        {/* Level Up Banner Alert */}
        <AnimatePresence>
          {levelUpMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="mb-6 rounded-2xl bg-white/95 backdrop-blur-md border border-sena-green p-4 text-center shadow-xl flex items-center justify-center gap-3"
            >
              <Sparkles className="w-6 h-6 text-sena-green animate-bounce" strokeWidth={1.8} />
              <span className="font-bold text-sena-blue text-base">{levelUpMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Bar & Clean Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shadow-sm"
        >
          <div className="flex items-center justify-between text-white text-sm mb-2.5 font-medium">
            <div className="inline-flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-xs">
                Nivel Actual: {currentLevel}
              </span>
              <span className="text-white/80 text-xs font-medium">
                Pregunta {engineState.currentQuestionIndexInLevel + 1} de 6
              </span>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border backdrop-blur-md transition-all ${
                timeLeft <= 10
                  ? "bg-rose-500/25 border-rose-400/60 text-rose-200 animate-pulse shadow-md shadow-rose-950/20"
                  : "bg-black/35 border-white/20 text-white"
              }`}
              title="Tiempo restante para esta pregunta"
            >
              <Clock
                className={`w-4 h-4 sm:w-5 sm:h-5 ${timeLeft <= 10 ? "text-rose-400" : "text-emerald-300"}`}
                strokeWidth={2}
              />
              <span className="font-mono text-base sm:text-lg font-black tracking-wider">
                {formatQuizTimer(timeLeft)}
              </span>
            </div>
          </div>
          <div className="h-2 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full shadow-sm"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </motion.div>

        {/* Main Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.uniqueKey}
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header de Pregunta */}
            <div className="px-6 lg:px-8 pt-6 lg:pt-8">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  {currentQuestion.type === "listening" ? (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5" strokeWidth={1.8} /> Comprensión Auditiva (Listening)
                    </span>
                  ) : currentQuestion.type === "speaking" ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5" strokeWidth={1.8} /> Producción Oral (Speaking)
                    </span>
                  ) : currentQuestion.type === "writing" ? (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5" strokeWidth={1.8} /> Expresión Escrita (Writing)
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" strokeWidth={1.8} /> {currentQuestion.competency === "Reading" ? "Lectura Técnica (Reading)" : "Gramática y Léxico (Grammar)"}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-medium">
                    {currentQuestion.category}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {getDifficultyStars().map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-warning text-warning" strokeWidth={1.8} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1 font-medium">
                    {currentQuestion.difficultyTier}
                  </span>
                </div>
              </div>

              <h2 className="text-xl lg:text-2xl font-bold text-foreground leading-relaxed mb-4">
                {currentQuestion.question}
              </h2>

              {/* Video Embebido si la pregunta contiene recurso audiovisual */}
              {Boolean(currentQuestion.video || (currentQuestion as any).videoUrl) && (
                <div className="mb-5 rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video max-h-72 w-full flex items-center justify-center shadow-md">
                  {String(currentQuestion.video || (currentQuestion as any).videoUrl).includes("youtube.com") ||
                  String(currentQuestion.video || (currentQuestion as any).videoUrl).includes("youtu.be") ? (
                    <iframe
                      src={String(currentQuestion.video || (currentQuestion as any).videoUrl).replace("watch?v=", "embed/")}
                      title="Video embebido de evaluación"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      controls
                      src={api.resolveMediaUrl(
                        currentQuestion.video || (currentQuestion as any).videoUrl,
                        "dictionary-videos"
                      )}
                      className="w-full h-full max-h-72 object-contain"
                    />
                  )}
                </div>
              )}

              {/* En listening no mostrar prompt ni imagen para evitar revelar la respuesta antes de escuchar */}
              {currentQuestion.type !== "listening" && currentQuestion.prompt && (
                <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl mb-5">
                  {currentQuestion.prompt}
                </p>
              )}

              {/* La imagen solo debe aparecer cuando la pregunta realmente lo requiera (Speaking o identificación visual) */}
              {currentQuestion.type === "speaking" && currentQuestion.image && (
                <div className="mb-5 rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-50 flex items-center justify-center shadow-inner pointer-events-none select-none">
                  <SafeImage
                    src={api.resolveMediaUrl(currentQuestion.image, "dictionary-images")}
                    alt="Ilustración técnica"
                    fallbackText="SENA"
                    showHoverZoom={false}
                    className="h-40 object-contain pointer-events-none select-none"
                    containerClassName="h-44 pointer-events-none select-none"
                  />
                </div>
              )}
            </div>

            {/* Modalidades Separadas de Pregunta (Una Habilidad por Turno) */}
            {currentQuestion.type === "listening" ? (
              <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                {/* 1. Reproductor Central Limpio (Botón Circular Verde Esmeralda Institucional) */}
                <div className="py-6 sm:py-8 flex flex-col items-center justify-center text-center">
                  <motion.button
                    type="button"
                    onClick={handlePlayAudioPrompt}
                    disabled={isPlayingAudio}
                    className={`w-20 h-20 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer ${
                      isPlayingAudio ? "ring-4 ring-emerald-300 animate-pulse" : ""
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="Reproducir o volver a escuchar la pronunciación"
                  >
                    {isPlayingAudio ? (
                      <div className="flex items-center gap-1 h-6">
                        <span className="w-1.5 bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3"></span>
                        <span className="w-1.5 bg-white rounded-full animate-[pulse_0.4s_ease-in-out_infinite] h-6"></span>
                        <span className="w-1.5 bg-white rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-4"></span>
                        <span className="w-1.5 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-3"></span>
                      </div>
                    ) : (
                      <Volume2 className="w-9 h-9" strokeWidth={1.8} />
                    )}
                  </motion.button>
                  <p className="text-xs text-slate-500 font-medium mt-3">
                    {isPlayingAudio ? "Escuchando pronunciación técnica..." : "Toca el botón para escuchar nuevamente"}
                  </p>
                </div>

                {/* 2. Opciones de Selección Múltiple Sobrias con Borde Neutro */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options?.map((option, index) => (
                    <motion.button
                      key={index}
                      onClick={() => handleAnswerClick(index)}
                      disabled={answerState !== "idle"}
                      className={`${getButtonStyle(index)} p-4 sm:p-5 rounded-xl text-left transition-all disabled:cursor-not-allowed`}
                      whileHover={answerState === "idle" ? { scale: 1.01, y: -1 } : {}}
                      whileTap={answerState === "idle" ? { scale: 0.99 } : {}}
                      animate={
                        selectedAnswer === index && answerState === "incorrect"
                          ? { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.35 } }
                          : selectedAnswer === index && answerState === "correct"
                          ? { scale: [1, 1.03, 1], transition: { duration: 0.3 } }
                          : {}
                      }
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${getBadgeStyle(index)}`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="font-semibold text-base sm:text-lg leading-snug">{option}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : currentQuestion.type === "speaking" ? (
              <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                {mediaError && (
                  <div className="mb-4 rounded-2xl bg-destructive/10 border border-destructive text-destructive px-4 py-3 text-sm flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={1.8} />
                    <span>{mediaError}</span>
                  </div>
                )}

                {/* 1. Módulo de Audio Modelo de Referencia (ElevenLabs / MinIO) */}
                <div className="mb-6 rounded-2xl border border-sena-blue/20 bg-gradient-to-r from-blue-50/70 to-slate-50 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-sena-blue text-white flex items-center justify-center shadow-md flex-shrink-0">
                      <Volume2 className={`w-6 h-6 ${isPlayingAudio ? "animate-bounce" : ""}`} strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-sena-blue bg-sena-blue/10 px-2 py-0.5 rounded-full">
                          Modelo Nativo
                        </span>
                        <span className="text-xs text-slate-500 font-medium">Pronunciación {userProgram}</span>
                      </div>
                      <p className="font-bold text-slate-800 text-sm mt-0.5">
                        {currentQuestion.wordId ? `Término Técnico: "${currentQuestion.wordId}"` : "Escucha la pronunciación oficial"}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePlayAudioPrompt}
                    disabled={isPlayingAudio}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-sena-blue hover:bg-sena-blue/90 text-white rounded-xl text-sm font-semibold shadow-md transition disabled:opacity-50 flex-shrink-0 cursor-pointer"
                  >
                    <Volume2 className={`w-4 h-4 ${isPlayingAudio ? "animate-pulse" : ""}`} strokeWidth={1.8} />
                    <span>{isPlayingAudio ? "Reproduciendo modelo..." : "Escuchar Pronunciación Modelo"}</span>
                  </button>
                </div>

                {/* 2. Área de Grabación / Grabadora del Aprendiz */}
                {!speakingEvaluation && (
                  <>
                    <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-8 mb-5 text-center">
                      <motion.button
                        type="button"
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        disabled={isEvaluatingSpeaking}
                        className={`relative h-20 w-20 rounded-full flex items-center justify-center text-white shadow-xl transition disabled:cursor-not-allowed disabled:bg-muted cursor-pointer ${
                          isRecording ? "bg-destructive" : "bg-sena-blue hover:bg-sena-blue/90"
                        }`}
                        animate={isRecording ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={isRecording ? { duration: 0.9, repeat: Infinity } : undefined}
                        aria-label={isRecording ? "Detener grabación" : "Grabar audio"}
                      >
                        {isRecording && (
                          <motion.span
                            className="absolute inset-0 rounded-full border-4 border-destructive/40"
                            animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                        )}
                        {isRecording ? <Square className="w-7 h-7 fill-current" strokeWidth={1.8} /> : <Mic className="w-8 h-8" strokeWidth={1.8} />}
                      </motion.button>

                      <div>
                        <p className="font-bold text-foreground text-base">
                          {isRecording
                            ? "🎙️ Grabando tu pronunciación en inglés..."
                            : recordedAudioUrl
                            ? "Audio capturado y listo para evaluar"
                            : "Presiona el micrófono y pronuncia el término técnico"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                          {isRecording
                            ? "Habla con claridad hacia el micrófono. Al finalizar, pulsa nuevamente para detener."
                            : "Se evaluará tu exactitud fonética y acentuación frente al modelo de referencia."}
                        </p>
                      </div>
                    </div>

                    {/* Reproductor de vista previa "Grabarse y escucharse" */}
                    {recordedAudioUrl && !isRecording && (
                      <div className="mb-5 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 p-4 shadow-sm text-left">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Headphones className="w-4 h-4 text-emerald-600" strokeWidth={1.8} />
                            <span>Grabarse y Escucharse: Valida tu pronunciación antes de enviar</span>
                          </p>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                            Audio capturado
                          </span>
                        </div>
                        <audio controls src={recordedAudioUrl} className="w-full h-10" />
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Escúchate con atención. Si crees que puedes mejorar, pulsa "Volver a grabar". Si estás conforme, haz clic en "Evaluar Pronunciación".
                        </p>
                      </div>
                    )}

                    {/* Botones de Acción (Evaluar / Regrabar) */}
                    {recordedAudioUrl && !isRecording && (
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <button
                          type="button"
                          onClick={handleRetrySpeaking}
                          disabled={isEvaluatingSpeaking}
                          className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
                          <span>Volver a grabar</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleEvaluateSpeaking}
                          disabled={isEvaluatingSpeaking}
                          className="w-full flex-1 bg-sena-blue hover:bg-sena-blue/90 text-white p-4 rounded-xl text-base font-semibold transition disabled:cursor-not-allowed disabled:bg-muted flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                        >
                          {isEvaluatingSpeaking ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.8} />
                              <span>Analizando fonética y pronunciación...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-5 h-5" strokeWidth={1.8} />
                              <span>Evaluar Pronunciación (Motor STT)</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* 3. Tarjeta Encapsulada de Feedback Inmediato */}
                {speakingEvaluation && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
                  >
                    {/* Cabecera del Feedback con Círculo de Porcentaje Dinámico */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-slate-100">
                      {/* Círculo de porcentaje */}
                      <div
                        className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-4 shadow-md flex-shrink-0 ${
                          speakingEvaluation.score >= 70
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : speakingEvaluation.score >= 40
                            ? "border-amber-500 bg-amber-50 text-amber-700"
                            : "border-rose-500 bg-rose-50 text-rose-700"
                        }`}
                      >
                        <span className="text-2xl font-black leading-none">{speakingEvaluation.score}%</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider mt-0.5">Precisión</span>
                      </div>

                      <div className="text-center sm:text-left flex-1">
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              speakingEvaluation.score >= 70
                                ? "bg-emerald-100 text-emerald-800"
                                : speakingEvaluation.score >= 40
                                ? "bg-amber-100 text-amber-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {speakingEvaluation.score >= 70
                              ? "✓ Aprobado (Umbral Superado)"
                              : "Requiere Práctica"}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Intento {speakingAttempts} de 3
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-slate-900">
                          {speakingEvaluation.feedback}
                        </h3>
                      </div>
                    </div>

                    {/* Comparación Fonética: Detectado vs Esperado */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
                      <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Transcripción Detectada:
                        </span>
                        <p className="text-base font-semibold text-slate-800 italic">
                          "{speakingEvaluation.transcription}"
                        </p>
                      </div>

                      <div className="bg-emerald-50/70 rounded-2xl p-3.5 border border-emerald-200">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                          Término Técnico Objetivo:
                        </span>
                        <p className="text-base font-bold text-emerald-900">
                          "{speakingEvaluation.target}"
                          {speakingEvaluation.ipa && (
                            <span className="ml-2 text-xs font-mono font-normal text-emerald-700">
                              [{speakingEvaluation.ipa}]
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Consejos Fonéticos Destacados */}
                    {speakingEvaluation.phonetic_tips && (
                      <div className="mb-5 rounded-2xl bg-amber-50/80 border border-amber-200/90 p-4 flex items-start gap-3 text-amber-900">
                        <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                            Consejo Fonético y Acentuación:
                          </p>
                          <p className="text-sm font-medium mt-0.5 text-amber-900 leading-relaxed">
                            {speakingEvaluation.phonetic_tips}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Reproductor del audio grabado */}
                    {recordedAudioUrl && (
                      <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-600">Tu respuesta grabada:</span>
                        <audio controls src={recordedAudioUrl} className="h-8 max-w-xs" />
                      </div>
                    )}

                    {/* Regla de Validación Estricta: Progresión Condicionada */}
                    {speakingEvaluation.score < 70 && speakingAttempts < 3 ? (
                      <div className="space-y-3">
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" strokeWidth={1.8} />
                          <span>
                            Para avanzar a la siguiente pregunta debes alcanzar un mínimo del <strong>70% de precisión</strong>.
                            Escucha nuevamente el modelo y reintenta.
                          </span>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            type="button"
                            onClick={handlePlayAudioPrompt}
                            className="w-full sm:w-auto px-5 py-3.5 bg-sena-blue/10 hover:bg-sena-blue/20 text-sena-blue rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Volume2 className="w-4 h-4" strokeWidth={1.8} />
                            <span>Reescuchar Modelo</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRetrySpeaking}
                            className="w-full flex-1 bg-sena-blue hover:bg-sena-blue/90 text-white p-3.5 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                          >
                            <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
                            <span>Reintentar Grabación (Intento {speakingAttempts + 1} de 3)</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {speakingEvaluation.score < 70 && speakingAttempts >= 3 && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-xl mb-3 text-center">
                            Has alcanzado el límite de 3 intentos para esta palabra. Tu evaluación se consolida para continuar.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={handleSpeakingNext}
                          className="w-full bg-sena-green hover:bg-sena-green/90 text-white p-4 rounded-xl text-base font-bold transition flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                        >
                          <span>Continuar a la siguiente pregunta</span>
                          <ArrowRight className="w-5 h-5" strokeWidth={1.8} />
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            ) : currentQuestion.type === "writing" ? (
              <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                {mediaError && (
                  <div className="mb-4 rounded-2xl bg-destructive/10 border border-destructive text-destructive px-4 py-3 text-sm">
                    {mediaError}
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 shadow-xs">
                  <div className="mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5">
                      <PenTool className="w-3.5 h-3.5 text-emerald-700" strokeWidth={1.8} />
                      Escribe el término técnico en inglés
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={writingAnswer}
                      onChange={(event) => {
                        setWritingAnswer(event.target.value);
                        setMediaError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && writingAnswer.trim() && answerState === "idle") {
                          handleWritingComplete();
                        }
                      }}
                      disabled={answerState !== "idle"}
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 disabled:bg-slate-100 text-base font-semibold shadow-inner"
                      placeholder="Escribe el término técnico exacto (ej. Input, Database...)"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleWritingComplete}
                      disabled={answerState !== "idle" || !writingAnswer.trim()}
                      className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer"
                    >
                      <Check className="w-4 h-4" strokeWidth={1.8} />
                      <span>Comprobar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Modalidad 2: Multiple Choice (Grammar / Reading) */
              <div className="px-6 lg:px-8 pb-6 lg:pb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options?.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerClick(index)}
                    disabled={answerState !== "idle"}
                    className={`${getButtonStyle(index)} p-4 sm:p-5 rounded-xl text-left transition-all disabled:cursor-not-allowed`}
                    whileHover={answerState === "idle" ? { scale: 1.01, y: -1 } : {}}
                    whileTap={answerState === "idle" ? { scale: 0.99 } : {}}
                    animate={
                      selectedAnswer === index && answerState === "incorrect"
                        ? { x: [0, -6, 6, -6, 6, 0], transition: { duration: 0.35 } }
                        : selectedAnswer === index && answerState === "correct"
                        ? { scale: [1, 1.03, 1], transition: { duration: 0.3 } }
                        : {}
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${getBadgeStyle(index)}`}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="font-semibold text-base sm:text-lg leading-snug">{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Feedback Banner */}
            <AnimatePresence>
              {answerState !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`px-6 lg:px-8 py-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4 ${
                    answerState === "correct" || answerState === "submitted"
                      ? "bg-sena-green"
                      : "bg-destructive"
                  }`}
                >
                  {answerState === "correct" ? (
                    <div className="flex items-center gap-3">
                      <Trophy className="w-6 h-6 flex-shrink-0" strokeWidth={1.8} />
                      <span className="text-base sm:text-lg font-bold">¡Respuesta Correcta! (+1 punto)</span>
                    </div>
                  ) : answerState === "submitted" ? (
                    <div className="flex items-center gap-3">
                      <Check className="w-6 h-6 flex-shrink-0" strokeWidth={1.8} />
                      <span className="text-base sm:text-lg font-bold">Respuesta guardada con éxito en el sistema.</span>
                    </div>
                  ) : (
                    <div className="text-left">
                      <p className="font-bold text-sm sm:text-base mb-0.5">Respuesta incorrecta</p>
                      <p className="text-white/90 text-xs sm:text-sm">
                        La opción correcta era:{" "}
                        <strong className="underline underline-offset-2">
                          {currentQuestion.options && currentQuestion.correctAnswer !== undefined
                            ? currentQuestion.options[currentQuestion.correctAnswer]
                            : "Opción válida"}
                        </strong>
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => advanceStep()}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-100 transition shadow-md flex items-center justify-center gap-2 flex-shrink-0 text-sm"
                  >
                    <span>Siguiente Pregunta</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl text-center"
          >
            <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6" strokeWidth={1.8} />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">¿Deseas salir del examen?</h3>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              {engineState.totalAnswered === 0
                ? "Aún no has respondido preguntas. Si sales en este momento, la prueba se registrará explícitamente como 'Sin Nivel / No Presentado' para no alterar tus promedios ni asignarte un nivel incorrecto."
                : `Has contestado ${engineState.totalAnswered} preguntas. Tu resultado se consolidará con las respuestas registradas hasta el momento.`}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 px-4 bg-muted hover:bg-muted/80 text-foreground rounded-xl font-semibold transition cursor-pointer"
              >
                Continuar examen
              </button>
              <button
                type="button"
                onClick={() => finalizeExam()}
                className="flex-1 py-3 px-4 bg-destructive hover:bg-destructive/90 text-white rounded-xl font-semibold transition cursor-pointer"
              >
                Finalizar y salir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default QuizPage;
