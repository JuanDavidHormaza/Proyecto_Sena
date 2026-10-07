import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useLocation, useNavigate } from "react-router";
import {
  Trophy,
  Download,
  RotateCcw,
  Home,
  Clock,
  Target,
  MessageSquare,
  Award,
  CheckCircle,
  XCircle,
  Sparkles,
  Mic,
  PenTool,
  BookOpen,
  Volume2,
  ChevronDown,
  ChevronUp,
  Layers,
  Check,
  X,
  FileCheck,
  Headphones,
  BookMarked,
  GraduationCap,
  ArrowRight,
  Search,
  History,
  Calendar,
} from "lucide-react";
import confetti from "canvas-confetti";
import { getLevelFromScore } from "../data/questionsA1";
import * as api from "../services/api";
import { resolveMediaUrl } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "../components/Toast";

type ResultAnswer = {
  questionId: number;
  question: string;
  userAnswer?: number;
  correctAnswer?: number;
  isCorrect: boolean;
  category: string;
  level?: string;
  competency?: string;
  type?: string;
  audioUrl?: string;
  writingAnswer?: string;
  scoreAwarded?: number;
  rubricFeedback?: string;
  wordId?: string;
  definition?: string;
  options?: string[];
};

type ReinforceTerm = {
  wordId: string;
  level: string;
  definition: string;
  audioUrl?: string;
};

const CEFR_THRESHOLDS: Record<string, number> = {
  A1: 60,
  A2: 65,
  B1: 70,
  B2: 75,
};

export function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [activeTab, setActiveTab] = useState<"summary" | "vocabulary" | "review" | "speaking" | "writing" | "history">("summary");
  const [filterReview, setFilterReview] = useState<"all" | "correct" | "incorrect">("all");
  const [vocabFilter, setVocabFilter] = useState<"all" | "mastered" | "reinforce">("all");
  const [playingTerm, setPlayingTerm] = useState<string | null>(null);
  const [pastTests, setPastTests] = useState<api.ApiTestResult[]>([]);

  const resultsState = location.state as
    | {
        score?: number;
        correctAnswers?: number;
        totalQuestions?: number;
        levelReached?: string;
        levelScores?: Record<string, number>;
        competencyScores?: Record<string, number>;
        answers?: ResultAnswer[];
        masteredTerms?: string[];
        reinforceTerms?: ReinforceTerm[];
        duration?: string;
        passed?: boolean;
        threshold?: number;
        breakdown?: any;
        auto_feedback?: string;
      }
    | null;

  const lastTestResultStr = localStorage.getItem("lastTestResult");
  const lastTestResult = lastTestResultStr ? JSON.parse(lastTestResultStr) : null;
  const lastTestSummaryStr = localStorage.getItem("lastTestSummary");
  const lastTestSummary = lastTestSummaryStr ? JSON.parse(lastTestSummaryStr) : null;
  const storedAnswersStr = localStorage.getItem("quizAnswers");
  const storedAnswers = storedAnswersStr ? JSON.parse(storedAnswersStr) : [];

  const finalScore = resultsState?.score ?? lastTestSummary?.finalScore ?? parseInt(localStorage.getItem("quizScore") || "0");
  const correctAnswers =
    resultsState?.correctAnswers ?? lastTestSummary?.correctAnswers ?? parseInt(localStorage.getItem("correctAnswers") || "0");
  const totalQuestions =
    resultsState?.totalQuestions ?? lastTestSummary?.totalQuestions ?? parseInt(localStorage.getItem("totalQuestions") || "0");
  const answers: ResultAnswer[] = (resultsState?.answers && resultsState.answers.length > 0)
    ? resultsState.answers
    : (storedAnswers.length > 0 ? storedAnswers : []);
  const duration = resultsState?.duration ?? lastTestSummary?.duration ?? localStorage.getItem("quizDuration") ?? "00:00";
  const levelReached = resultsState?.levelReached ?? lastTestSummary?.finalLevel ?? lastTestResult?.level ?? "A1";

  const levelInfo = getLevelFromScore(finalScore);
  const passed = resultsState?.passed ?? lastTestSummary?.passed ?? (finalScore >= 60);
  const threshold = resultsState?.threshold ?? 60;
  const breakdown = resultsState?.breakdown ?? lastTestResult?.breakdown;
  const autoFeedback = resultsState?.auto_feedback ?? lastTestSummary?.autoFeedback;

  const { user } = useAuth();
  const isInstructor = Boolean(
    user?.role === "teacher" ||
    user?.role === "admin" ||
    user?.role === "superadmin" ||
    user?.permissions?.canGiveFeedback
  );

  const [currentInstructorFeedback, setCurrentInstructorFeedback] = useState<string | null>(
    (resultsState as any)?.feedback || lastTestResult?.feedback || null
  );
  const [instructorDraft, setInstructorDraft] = useState<string>(
    currentInstructorFeedback || ""
  );
  const [isSavingFeedback, setIsSavingFeedback] = useState<boolean>(false);

  const handleSaveInstructorFeedback = async () => {
    const resultId = lastTestResult?.id;
    if (!resultId) {
      toast.error("No se encontró el identificador de la prueba para guardar feedback.");
      return;
    }
    setIsSavingFeedback(true);
    try {
      await api.addFeedback(String(resultId), instructorDraft);
      setCurrentInstructorFeedback(instructorDraft);
      if (lastTestResult) {
        lastTestResult.feedback = instructorDraft;
        localStorage.setItem("lastTestResult", JSON.stringify(lastTestResult));
      }
      toast.success("Retroalimentación guardada con éxito");
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar la retroalimentación");
    } finally {
      setIsSavingFeedback(false);
    }
  };

  // Vocabulario técnico evaluado del programa activo (Mastered & Reinforce)
  const activeProgram = localStorage.getItem("userProgram") || "Programa Formativo";
  const masteredTerms: string[] =
    resultsState?.masteredTerms ??
    lastTestSummary?.masteredTerms ??
    lastTestResult?.process?.masteredTerms ??
    [];

  const reinforceTerms: ReinforceTerm[] =
    resultsState?.reinforceTerms ??
    lastTestSummary?.reinforceTerms ??
    lastTestResult?.process?.reinforceTerms ??
    [];

  // Reproductor de pronunciación con fallback a síntesis de voz en inglés
  const handlePlayPronunciation = (termText: string, audioUrl?: string) => {
    setPlayingTerm(termText);
    if (audioUrl) {
      const url = resolveMediaUrl(audioUrl);
      const audio = new Audio(url);
      audio.onended = () => setPlayingTerm(null);
      audio.onerror = () => {
        speakWord(termText);
        setPlayingTerm(null);
      };
      audio.play().catch(() => {
        speakWord(termText);
        setPlayingTerm(null);
      });
    } else {
      speakWord(termText);
      setTimeout(() => setPlayingTerm(null), 1200);
    }
  };

  const speakWord = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Level scores calculation or fallback
  const rawLevelScores: Record<string, number> = resultsState?.levelScores ?? lastTestSummary?.levelScores ?? {};
  const cefrLevels = ["A1", "A2", "B1", "B2"] as const;
  const levelScores: Record<string, { score: number; answered: number; correct: number; passed: boolean; attempted: boolean }> = {};

  cefrLevels.forEach((lvl) => {
    const lvlAnswers = answers.filter((a) => (a.level || "").toUpperCase() === lvl);
    const answered = lvlAnswers.length;
    const correct = lvlAnswers.filter((a) => a.isCorrect).length;
    const computedScore = answered > 0 ? Math.round((correct / answered) * 100) : (rawLevelScores[lvl] ?? 0);
    const reqThreshold = CEFR_THRESHOLDS[lvl] || 60;
    const attempted = answered > 0 || (rawLevelScores[lvl] !== undefined && rawLevelScores[lvl] > 0);
    const isLvlPassed = computedScore >= reqThreshold && attempted;

    levelScores[lvl] = {
      score: computedScore,
      answered,
      correct,
      passed: isLvlPassed,
      attempted,
    };
  });

  // Competency scores calculation or fallback (5 competencias CEFR)
  const rawCompScores: Record<string, number> = resultsState?.competencyScores ?? lastTestSummary?.competencyScores ?? {};
  const competencies = ["Grammar", "Reading", "Writing", "Speaking", "Listening"] as const;
  const compPerformance = competencies.map((comp) => {
    const compAnswers = answers.filter((a) => (a.competency || "").toLowerCase() === comp.toLowerCase());
    const count = compAnswers.length;
    let score = rawCompScores[comp] ?? 0;
    if (count > 0) {
      const sum = compAnswers.reduce((acc, curr) => acc + (curr.scoreAwarded !== undefined ? curr.scoreAwarded : (curr.isCorrect ? 100 : 0)), 0);
      score = Math.round(sum / count);
    }
    return { name: comp, score, count };
  });

  // Confetti effect
  useEffect(() => {
    if (finalScore >= 60) {
      const durationMs = 3000;
      const end = Date.now() + durationMs;
      const colors = ["#39A900", "#1F4E78", "#D89E00", "#ffffff"];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }

    // Animate score counter
    let current = 0;
    const increment = Math.max(finalScore / 50, 1);
    const interval = setInterval(() => {
      current += increment;
      if (current >= finalScore) {
        setAnimatedScore(finalScore);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, 25);

    return () => clearInterval(interval);
  }, [finalScore]);

  // Cargar historial consolidado de pruebas anteriores
  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    api.getTestResults(userId)
      .then((res) => {
        if (Array.isArray(res)) {
          setPastTests(res);
        }
      })
      .catch((err) => console.warn("No fue posible cargar historial anterior:", err));
  }, []);

  const handleDownloadCertificate = () => {
    return;
  };

  const getGradientColors = () => {
    if (finalScore >= 80) return "from-sena-green to-sena-green-dark";
    if (finalScore >= 60) return "from-warning to-amber-600";
    return "from-destructive to-red-700";
  };

  const speakingAnswers = answers.filter((a) => a.audioUrl || a.type === "speaking");
  const writingAnswers = answers.filter((a) => a.writingAnswer || a.type === "writing");

  const filteredAnswers = answers.filter((a) => {
    if (filterReview === "correct") return a.isCorrect;
    if (filterReview === "incorrect") return !a.isCorrect;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${getGradientColors()} py-16 lg:py-20`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOSAxLjc5MS00IDQtNHM0IDEuNzkxIDQgNC0xLjc5MSA0LTQgNC00LTEuNzkxLTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />

        <div className="container mx-auto max-w-4xl px-4 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center text-white"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-lg rounded-full text-sm font-medium mb-6"
            >
              <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white">
                <CheckCircle className="w-4 h-4 text-emerald-200" strokeWidth={2} />
              </div>
              Evaluación enviada con éxito
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-32 h-32 lg:w-40 lg:h-40 mx-auto bg-white/10 backdrop-blur-lg rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                <span className="text-5xl lg:text-6xl font-bold">{animatedScore}%</span>
              </div>

              <div className="flex items-center justify-center gap-2 mb-3">
                <Award className="w-7 h-7 text-amber-300" strokeWidth={1.8} />
                <span className="text-2xl lg:text-3xl font-bold">Nivel Obtenido: {levelReached}</span>
              </div>

              <p className="text-lg text-white/90 mb-2">{levelInfo.description}</p>
              <p className="text-white/80 max-w-md mx-auto">{levelInfo.message}</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="container mx-auto max-w-4xl px-4 -mt-8 pb-16 relative z-10">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "Puntuación Global", value: `${finalScore}%`, icon: Target, color: "text-warning", bg: "bg-warning/10" },
            { label: "Nivel Asignado", value: levelReached, icon: Award, color: "text-sena-green", bg: "bg-sena-green/10" },
            { label: "Tiempo Total", value: duration, icon: Clock, color: "text-sena-blue", bg: "bg-sena-blue/10" },
            { label: "Preguntas Evaluadas", value: `${totalQuestions}`, icon: FileCheck, color: "text-purple-600", bg: "bg-purple-100" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="bg-white rounded-2xl p-5 border border-border shadow-lg"
            >
              <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} strokeWidth={1.8} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* CEFR Progression Cards (A1, A2, B1, B2) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-lg mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-sena-green" strokeWidth={1.8} />
            <h3 className="font-semibold text-lg text-foreground">Progresión por Niveles Marco CEFR (A1 → B2)</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Evaluación adaptativa continua: el avance hacia niveles superiores depende de la consistencia y porcentaje mínimo requerido.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cefrLevels.map((lvl) => {
              const info = levelScores[lvl];
              const isCurrent = levelReached === lvl;
              const req = CEFR_THRESHOLDS[lvl];

              let badgeStyle = "bg-muted text-muted-foreground border-muted";
              let statusText = "No alcanzado";
              if (info.attempted) {
                if (info.passed) {
                  badgeStyle = "bg-sena-green/10 text-sena-green border-sena-green/30";
                  statusText = "Aprobado";
                } else {
                  badgeStyle = "bg-destructive/10 text-destructive border-destructive/30";
                  statusText = "No superado";
                }
              }

              return (
                <div
                  key={lvl}
                  className={`rounded-2xl border p-4 transition-all ${
                    isCurrent ? "ring-2 ring-sena-green shadow-md bg-sena-green/5" : "bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xl font-bold text-foreground">{lvl}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${badgeStyle}`}>
                      {statusText}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Puntuación:</span>
                      <span className="font-semibold text-foreground">{info.score}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(info.score, 100)}%` }}
                        transition={{ duration: 0.6 }}
                        className={`h-full rounded-full ${
                          info.passed ? "bg-sena-green" : info.attempted ? "bg-destructive" : "bg-muted-foreground/30"
                        }`}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>Mínimo: {req}%</span>
                      {info.answered > 0 && <span>{info.correct}/{info.answered} corr.</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Competencies Performance Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-lg mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-sena-blue" strokeWidth={1.8} />
            <h3 className="font-semibold text-lg text-foreground">Desempeño por Competencias Lingüísticas</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {compPerformance.map((comp) => {
              const icons: Record<string, any> = {
                Grammar: BookOpen,
                Reading: FileCheck,
                Writing: PenTool,
                Speaking: Mic,
                Listening: Headphones,
              };
              const CompIcon = icons[comp.name] || Target;
              const colorClass =
                comp.score >= 70 ? "text-sena-green" : comp.score >= 50 ? "text-warning" : "text-destructive";
              const barColor =
                comp.score >= 70 ? "bg-sena-green" : comp.score >= 50 ? "bg-warning" : "bg-destructive";

              return (
                <div key={comp.name} className="p-4 rounded-xl border border-border bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CompIcon className="w-4 h-4 text-muted-foreground" strokeWidth={1.8} />
                    <span className="font-medium text-sm text-foreground">{comp.name}</span>
                  </div>
                  <p className={`text-2xl font-bold ${colorClass} mb-2`}>{comp.score}%</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${barColor}`} style={{ width: `${Math.min(comp.score, 100)}%` }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">{comp.count} evaluadas</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Tabs for Review Sections */}
        <div className="flex items-center gap-2 mb-6 border-b border-border pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "summary"
                ? "bg-sena-green text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            Confirmación y Estado
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-1.5 ${
              activeTab === "history"
                ? "bg-sena-green text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <History className="w-3.5 h-3.5" strokeWidth={1.8} />
            Historial de Pruebas ({pastTests.length})
          </button>
        </div>

        {/* Tab 1: Resumen y Feedback */}
        {activeTab === "summary" && (
          <div className="space-y-6">
            {/* Confirmación Oficial de Entrega */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-border shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-sena-green/10 flex items-center justify-center flex-shrink-0 text-sena-green">
                    <CheckCircle className="w-6 h-6" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-base mb-1">
                      Evaluación enviada con éxito
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tu prueba adaptativa ha sido completada y almacenada de forma segura. La auditoría completa de tus respuestas y el seguimiento pedagógico están disponibles en la sección <strong>Historial de Pruebas</strong> de tu Dashboard y para consulta de tu Instructor.
                    </p>
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard?tab=overview&sub=stats")}
                    className="px-4 py-2 bg-sena-green hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <History className="w-3.5 h-3.5" strokeWidth={1.8} />
                    <span>Ver en Historial</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Home className="w-3.5 h-3.5" strokeWidth={1.8} />
                    <span>Ir al Dashboard</span>
                  </button>
                </div>
              </div>
            </motion.div>
            {/* Feedback Automático */}
            {autoFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-sena-blue/5 border border-sena-blue/20 rounded-2xl p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-sena-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-6 h-6 text-sena-blue" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">
                      {passed ? "Resultado y Recomendaciones" : "Áreas de Mejora Identificadas"}
                    </h4>
                    <p className="text-muted-foreground text-sm" style={{ whiteSpace: "pre-line" }}>
                      {autoFeedback}
                    </p>
                    {typeof threshold === "number" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Puntaje mínimo de suficiencia: {threshold}%
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Retroalimentación del Instructor */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-border shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-sena-green/10 flex items-center justify-center text-sena-green">
                    <MessageSquare className="w-5 h-5" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm">
                      Retroalimentación del Instructor
                    </h4>
                    <p className="text-xs text-muted-foreground">Observaciones pedagógicas del docente</p>
                  </div>
                </div>
                {isInstructor && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sena-green/10 text-sena-green">
                    Rol Instructor
                  </span>
                )}
              </div>

              {isInstructor && lastTestResult?.id ? (
                <div className="space-y-3">
                  <textarea
                    value={instructorDraft}
                    onChange={(e) => setInstructorDraft(e.target.value)}
                    placeholder="Escribe tus observaciones y recomendaciones pedagógicas para el aprendiz..."
                    rows={3}
                    className="w-full text-xs p-3 bg-muted/30 rounded-xl border border-border focus:ring-2 focus:ring-sena-green/40 focus:outline-none resize-none transition-all placeholder:text-muted-foreground"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveInstructorFeedback}
                      disabled={isSavingFeedback}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sena-green hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{isSavingFeedback ? "Guardando..." : "Guardar Retroalimentación"}</span>
                    </button>
                  </div>
                </div>
              ) : currentInstructorFeedback ? (
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/20 p-3.5 rounded-xl border border-border/60">
                  {currentInstructorFeedback}
                </p>
              ) : (
                <div className="py-4 px-4 bg-muted/20 rounded-xl border border-dashed border-border/70 flex items-center gap-3 text-muted-foreground">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" strokeWidth={1.8} />
                  <p className="text-xs">
                    Pendiente de retroalimentación por parte del instructor asignado.
                  </p>
                </div>
              )}
            </motion.div>

            {/* Vocabulario Técnico ADSO: Términos Dominados y para Reforzar */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-border shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sena-green/10 flex items-center justify-center">
                    <BookMarked className="w-5 h-5 text-sena-green" strokeWidth={1.8} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-base">
                      Vocabulario Técnico ({activeProgram}) de la Evaluación
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Términos técnicos evaluados adaptativamente según el Diccionario Activo
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard?tab=study")}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sena-blue/10 text-sena-blue rounded-xl text-xs font-semibold hover:bg-sena-blue/20 transition-all self-start sm:self-center"
                >
                  <GraduationCap className="w-4 h-4" strokeWidth={1.8} />
                  Ir al Espacio de Estudio
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.8} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Términos Dominados */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-sena-green" strokeWidth={1.8} />
                      Términos Dominados ({masteredTerms.length})
                    </span>
                    <span className="text-xs bg-sena-green/10 text-sena-green font-medium px-2 py-0.5 rounded-full">
                      Aprobados
                    </span>
                  </div>

                  {masteredTerms.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-3.5 rounded-xl bg-sena-green/5 border border-sena-green/20">
                      {masteredTerms.map((term, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-sena-green/30 text-xs font-semibold text-foreground shadow-sm"
                        >
                          <span className="text-sena-green">✓</span>
                          <span>{term}</span>
                          <button
                            type="button"
                            onClick={() => handlePlayPronunciation(term)}
                            className="p-0.5 text-muted-foreground hover:text-sena-green transition-colors"
                            title={`Escuchar pronunciación de ${term}`}
                          >
                            <Volume2 className={`w-3.5 h-3.5 ${playingTerm === term ? "text-sena-green animate-pulse" : ""}`} strokeWidth={1.8} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground p-3 rounded-xl bg-muted/40">
                      No se registraron términos con respuesta correcta en esta sesión.
                    </p>
                  )}
                </div>

                {/* Términos Recomendados para Reforzar */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Target className="w-4 h-4 text-amber-600" strokeWidth={1.8} />
                      Términos Recomendados para Reforzar ({reinforceTerms.length})
                    </span>
                    <span className="text-xs bg-amber-500/10 text-amber-700 font-medium px-2 py-0.5 rounded-full">
                      Refuerzo Sugerido
                    </span>
                  </div>

                  {reinforceTerms.length > 0 ? (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                      {reinforceTerms.map((rf, i) => (
                        <div
                          key={i}
                          className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground text-sm flex items-center gap-1.5">
                              {rf.wordId}
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 font-medium">
                                Nivel {rf.level}
                              </span>
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handlePlayPronunciation(rf.wordId, rf.audioUrl)}
                                className="px-2 py-1 rounded-lg bg-white border border-amber-500/30 text-amber-800 hover:bg-amber-100/50 transition-colors inline-flex items-center gap-1"
                                title="Escuchar pronunciación"
                              >
                                <Volume2 className={`w-3 h-3 ${playingTerm === rf.wordId ? "text-amber-600 animate-pulse" : ""}`} strokeWidth={1.8} />
                                Audio
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/dashboard?tab=study&term=${encodeURIComponent(rf.wordId)}`)}
                                className="px-2 py-1 rounded-lg bg-sena-green text-white hover:bg-sena-green-dark transition-colors inline-flex items-center gap-1 font-medium"
                                title="Practicar en Espacio de Estudio"
                              >
                                Practicar
                              </button>
                            </div>
                          </div>
                          <p className="text-muted-foreground text-[11px] line-clamp-2">
                            {rf.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-sena-green/10 border border-sena-green/30 text-center">
                      <CheckCircle className="w-8 h-8 text-sena-green mx-auto mb-1" strokeWidth={1.8} />
                      <p className="text-xs font-semibold text-sena-green">
                        ¡Felicitaciones! Has dominado todos los términos evaluados.
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        No tienes términos pendientes por reforzar en esta prueba.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Banner al Espacio de Estudio */}
              <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-sena-blue/10 via-sena-blue/5 to-transparent border border-sena-blue/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-sena-blue" strokeWidth={1.8} />
                    Espacio de Estudio ({activeProgram}) Disponible
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Accede al glosario de 32 términos técnicos organizados por niveles A1-B2 con práctica de pronunciación por voz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard?tab=study")}
                  className="px-4 py-2 bg-sena-blue text-white rounded-xl text-xs font-semibold hover:bg-sena-blue/90 transition-all shadow-sm whitespace-nowrap self-start sm:self-center"
                >
                  Abrir Espacio de Estudio
                </button>
              </div>
            </motion.div>

            {/* Breakdown de fallos (si está disponible) */}
            {breakdown && breakdown.failed !== undefined && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-border shadow-lg"
              >
                <h3 className="font-semibold text-foreground mb-4">Desglose de Errores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Por Categoría</p>
                    {breakdown.by_category && Object.entries(breakdown.by_category).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(breakdown.by_category).map(([cat, data]: any, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                            <span className="text-foreground/90 font-medium">{cat}</span>
                            <span className="text-destructive font-semibold">
                              {data.failed} erradas / {data.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Sin incidencias registradas.</p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Por Dificultad</p>
                    {breakdown.by_difficulty && (
                      <div className="space-y-2">
                        {["Easy", "Medium", "Hard"].map((d) => (
                          <div key={d} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                            <span className="text-foreground/90 font-medium">{d}</span>
                            <span className="text-destructive font-semibold">
                              {breakdown.by_difficulty[d]?.failed || 0} erradas / {breakdown.by_difficulty[d]?.total || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Tab 2: Vocabulario Técnico ADSO Detallado */}
        {activeTab === "vocabulary" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="font-semibold text-foreground">
                  Glosario de {activeProgram} Evaluado en esta Prueba
                </h3>
                <p className="text-xs text-muted-foreground">
                  Revisa tu dominio del vocabulario y reproduce la pronunciación oficial de cada concepto
                </p>
              </div>
              <div className="inline-flex gap-1 bg-muted p-1 rounded-xl self-start sm:self-auto">
                {(["all", "mastered", "reinforce"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setVocabFilter(mode)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                      vocabFilter === mode ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {mode === "all" ? `Todos (${masteredTerms.length + reinforceTerms.length})` : mode === "mastered" ? `Dominados (${masteredTerms.length})` : `Por Reforzar (${reinforceTerms.length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista unificada de términos según filtro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Términos por Reforzar */}
              {(vocabFilter === "all" || vocabFilter === "reinforce") &&
                reinforceTerms.map((rf, idx) => (
                  <div
                    key={`rf-${idx}`}
                    className="p-4 bg-white rounded-2xl border border-amber-500/25 shadow-sm space-y-2 hover:border-amber-500/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-base">{rf.wordId}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-semibold border border-amber-500/20">
                          Nivel {rf.level}
                        </span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 font-medium">
                        Por Reforzar
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{rf.definition}</p>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => handlePlayPronunciation(rf.wordId, rf.audioUrl)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
                      >
                        <Volume2 className={`w-3.5 h-3.5 text-sena-blue ${playingTerm === rf.wordId ? "animate-pulse" : ""}`} strokeWidth={1.8} />
                        Pronunciación
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard?tab=study&term=${encodeURIComponent(rf.wordId)}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sena-green text-white text-xs font-semibold hover:bg-sena-green-dark transition-colors shadow-sm"
                      >
                        Estudiar en Vocabulario
                        <ArrowRight className="w-3 h-3" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                ))}

              {/* Términos Dominados */}
              {(vocabFilter === "all" || vocabFilter === "mastered") &&
                masteredTerms.map((term, idx) => (
                  <div
                    key={`mst-${idx}`}
                    className="p-4 bg-white rounded-2xl border border-sena-green/25 shadow-sm space-y-2 hover:border-sena-green/40 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-base">{term}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sena-green/10 text-sena-green font-semibold border border-sena-green/20">
                          {activeProgram}
                        </span>
                      </div>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-sena-green/10 text-sena-green font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" strokeWidth={1.8} />
                        Dominado
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Has respondido correctamente los retos relacionados con este concepto técnico.
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => handlePlayPronunciation(term)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-medium transition-colors"
                      >
                        <Volume2 className={`w-3.5 h-3.5 text-sena-green ${playingTerm === term ? "animate-pulse" : ""}`} strokeWidth={1.8} />
                        Pronunciación
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/dashboard?tab=study&term=${encodeURIComponent(term)}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                      >
                        Ver en glosario
                        <ArrowRight className="w-3 h-3" strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>

            {masteredTerms.length === 0 && reinforceTerms.length === 0 && (
              <div className="p-8 text-center bg-white rounded-2xl border border-border text-muted-foreground text-sm">
                No hay términos del diccionario registrados en esta prueba particular.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Revisión de Preguntas */}
        {activeTab === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Filtrar respuestas:</span>
              <div className="inline-flex gap-1 bg-muted p-1 rounded-xl">
                {(["all", "correct", "incorrect"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterReview(mode)}
                    className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                      filterReview === mode ? "bg-white text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {mode === "all" ? "Todas" : mode === "correct" ? "Correctas" : "Erradas"}
                  </button>
                ))}
              </div>
            </div>

            {filteredAnswers.length > 0 ? (
              <div className="space-y-3">
                {filteredAnswers.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      item.isCorrect
                        ? "bg-sena-green/5 border-sena-green/20"
                        : "bg-destructive/5 border-destructive/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {item.isCorrect ? (
                          <CheckCircle className="w-5 h-5 text-sena-green flex-shrink-0" strokeWidth={1.8} />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive flex-shrink-0" strokeWidth={1.8} />
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-border">
                          {item.level || "CEFR"} • {item.competency || item.category}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.isCorrect ? "+100 pts" : "0 pts"}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-foreground mb-2">{item.question}</p>

                    {/* Desglose de Opciones y Justificación Pedagógica para Selección Múltiple y Listening */}
                    {item.options && item.options.length > 0 && (
                      <div className="space-y-2 mt-2 mb-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {item.options.map((opt, optIdx) => {
                            const isChosen = item.userAnswer === optIdx;
                            const isAnswerCorrect = item.correctAnswer === optIdx;
                            let style = "bg-muted/40 border-border text-muted-foreground";
                            if (isAnswerCorrect) {
                              style = "bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold";
                            } else if (isChosen && !item.isCorrect) {
                              style = "bg-rose-50 border-rose-400 text-rose-900 font-semibold";
                            }
                            return (
                              <div
                                key={optIdx}
                                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${style}`}
                              >
                                <span className="truncate">
                                  <strong>{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                                </span>
                                {isAnswerCorrect && (
                                  <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                                    Respuesta Correcta
                                  </span>
                                )}
                                {isChosen && !isAnswerCorrect && (
                                  <span className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                                    Tu Selección
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Justificación pedagógica / Razón técnica */}
                        <div className="p-3 bg-white/90 rounded-xl border border-slate-200 text-xs mt-2">
                          <p className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-sena-blue" strokeWidth={1.8} />
                            <span>Justificación Pedagógica:</span>
                          </p>
                          <p className="text-slate-600 leading-relaxed">
                            {item.definition
                              ? `Concepto técnico evaluado: "${item.definition}". La opción correcta se ajusta con exactitud a esta definición técnica.`
                              : item.isCorrect
                              ? "¡Excelente! La opción que seleccionaste satisface las reglas morfosintácticas y la convención técnica esperada por el estándar internacional de inglés SENA."
                              : `La opción seleccionada no cumple con la regla o contexto requerido. La opción correcta es "${item.options[item.correctAnswer ?? 0]}" por precisión conceptual y coherencia gramatical.`}
                          </p>
                        </div>
                      </div>
                    )}

                    {item.writingAnswer && (
                      <div className="p-3 bg-white rounded-lg border border-border text-xs mb-2">
                        <span className="font-semibold text-muted-foreground">Tu respuesta escrita:</span>
                        <p className="mt-1 text-foreground">{item.writingAnswer}</p>
                        {item.rubricFeedback && (
                          <p className="mt-1 text-sena-blue font-medium">{item.rubricFeedback}</p>
                        )}
                      </div>
                    )}

                    {item.audioUrl && (
                      <div className="p-3 bg-white rounded-lg border border-border text-xs mb-2">
                        <span className="font-semibold text-muted-foreground">Audio grabado:</span>
                        <audio
                          controls
                          className="w-full mt-1.5 h-8"
                          src={resolveMediaUrl(item.audioUrl)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No hay preguntas en esta categoría.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Audios Speaking Grabados */}
        {activeTab === "speaking" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Grabaciones de audio procesadas y transmitidas mediante el proxy de almacenamiento seguro en Django.
            </p>
            {speakingAnswers.map((spk, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 border border-border shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sena-green/10 flex items-center justify-center">
                      <Mic className="w-4 h-4 text-sena-green" strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted">
                        Nivel {spk.level || "B1/B2"} Speaking
                      </span>
                      <p className="text-xs text-muted-foreground">{spk.category}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-sena-green bg-sena-green/10 px-2 py-1 rounded-full">
                    Grabado
                  </span>
                </div>

                <p className="text-sm font-medium text-foreground mb-3">{spk.question}</p>

                {spk.audioUrl ? (
                  <div className="bg-muted/40 p-3 rounded-xl">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-sena-green" strokeWidth={1.8} />
                      Reproductor de Audio (Proxy Django / MinIO):
                    </p>
                    <audio
                      controls
                      className="w-full h-9"
                      src={resolveMediaUrl(spk.audioUrl)}
                    >
                      Tu navegador no soporta el elemento de audio.
                    </audio>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Audio guardado localmente o pendiente de sincronización.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Escritura / Writing */}
        {activeTab === "writing" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Producción textual evaluada bajo rúbrica semántica de vocabulario técnico, longitud mínima y coherencia.
            </p>
            {writingAnswers.map((wrt, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 border border-border shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-sena-blue/10 flex items-center justify-center">
                      <PenTool className="w-4 h-4 text-sena-blue" strokeWidth={1.8} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted">
                        Nivel {wrt.level || "B1/B2"} Writing
                      </span>
                      <p className="text-xs text-muted-foreground">{wrt.category}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      wrt.isCorrect ? "bg-sena-green/10 text-sena-green" : "bg-warning/10 text-warning"
                    }`}
                  >
                    {wrt.scoreAwarded !== undefined ? `${wrt.scoreAwarded}%` : wrt.isCorrect ? "Aprobado" : "Revisar"}
                  </span>
                </div>

                <p className="text-sm font-semibold text-foreground mb-2">{wrt.question}</p>

                <div className="bg-muted/30 p-3 rounded-xl mb-3 border border-border text-sm">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Texto escrito por el aprendiz:</p>
                  <p className="text-foreground whitespace-pre-wrap">{wrt.writingAnswer || "Sin respuesta escrita."}</p>
                </div>

                {wrt.rubricFeedback && (
                  <div className="p-3 bg-sena-blue/5 rounded-xl border border-sena-blue/20 text-xs">
                    <span className="font-semibold text-sena-blue">Evaluación Semántica:</span>
                    <p className="text-foreground mt-0.5">{wrt.rubricFeedback}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 5: Historial Consolidado de Pruebas Anteriores */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-foreground text-base">Historial Consolidado de Evaluaciones</h3>
                <p className="text-xs text-muted-foreground">Registro de todas las pruebas de nivel y evolución de competencias</p>
              </div>
            </div>

            {pastTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastTests.map((test) => (
                  <div key={test.id} className="bg-white rounded-2xl border border-border p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        test.level.startsWith("B2")
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : test.level.startsWith("B1")
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : test.level.startsWith("A2")
                          ? "bg-teal-50 text-teal-700 border border-teal-200"
                          : test.level.includes("Sin Nivel")
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        Nivel: {test.level}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" strokeWidth={1.8} />
                        {new Date(test.completedAt).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-2xl font-black text-foreground">{test.score}%</p>
                        <p className="text-xs text-muted-foreground">
                          {test.correctAnswers}/{test.totalQuestions} respuestas correctas
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p className="flex items-center gap-1 justify-end">
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
                          <span>{test.duration || "N/A"}</span>
                        </p>
                        <p className={`mt-1 font-semibold ${test.passed ? "text-sena-green" : "text-amber-600"}`}>
                          {test.passed ? "✓ Suficiencia Aprobada" : "En Desarrollo"}
                        </p>
                      </div>
                    </div>

                    {test.feedback ? (
                      <div className="p-3 bg-muted/40 rounded-xl text-xs text-muted-foreground border border-border/50">
                        <p className="font-semibold text-slate-800 mb-0.5">Observación del instructor:</p>
                        <p className="line-clamp-2">{test.feedback}</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/20 rounded-xl text-xs text-muted-foreground border border-dashed border-border/50 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" strokeWidth={1.8} />
                        <span>Pendiente de retroalimentación por parte del instructor asignado.</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-border text-muted-foreground text-sm">
                No se registran otras pruebas históricas para este aprendiz en el sistema.
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="grid sm:grid-cols-3 gap-4 mt-8"
        >
          <motion.button
            onClick={handleDownloadCertificate}
            disabled
            className="flex items-center justify-center gap-2 bg-muted text-muted-foreground px-6 py-4 rounded-xl font-medium cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-5 h-5" strokeWidth={1.8} />
            Certificado no disponible
          </motion.button>
          <motion.button
            onClick={() => navigate("/quiz")}
            className="flex items-center justify-center gap-2 bg-sena-green text-white px-6 py-4 rounded-xl font-medium hover:bg-sena-green-dark transition-all shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw className="w-5 h-5" strokeWidth={1.8} />
            Hacer otra Prueba
          </motion.button>
          <motion.button
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-center gap-2 bg-muted text-muted-foreground px-6 py-4 rounded-xl font-medium hover:bg-muted/80 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Home className="w-5 h-5" strokeWidth={1.8} />
            Volver al Dashboard
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
}
