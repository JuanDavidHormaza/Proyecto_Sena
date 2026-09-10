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
  Sparkles
} from "lucide-react";

import confetti from "canvas-confetti";

import { getLevelFromScore } from "../data/questionsA1";
import { StatCard } from "../components/ui/stat-card";
import { IconBadge } from "../components/ui/icon-badge";


type ResultAnswer = {
  questionId: number;
  question: string;
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  category: string;
  audioUrl?: string;
  writingAnswer?: string;
};

export function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [animatedScore, setAnimatedScore] = useState(0);

  const resultsState = location.state as
    | {
        score?: number;
        correctAnswers?: number;
        totalQuestions?: number;
        levelReached?: string;
        answers?: ResultAnswer[];
        duration?: string;
      }
    | null;

  const finalScore = resultsState?.score ?? parseInt(localStorage.getItem("quizScore") || "0");
  const correctAnswers =
    resultsState?.correctAnswers ?? parseInt(localStorage.getItem("correctAnswers") || "0");
  const totalQuestions =
    resultsState?.totalQuestions ?? parseInt(localStorage.getItem("totalQuestions") || "0");
  const answers = resultsState?.answers ?? [];
  const duration = resultsState?.duration ?? localStorage.getItem("quizDuration") ?? "00:00";
  const levelInfo = getLevelFromScore(finalScore);
  // El nivel alcanzado real proviene del quiz (A1-B2). La escala NO llega a C1/C2.
  const levelReached = (resultsState?.levelReached as string) || levelInfo.level;
  // Preguntas falladas (opción múltiple / listening) para mostrar los errores.
  const failedAnswers = answers.filter((answer) => !answer.isCorrect && !answer.writingAnswer && !answer.audioUrl);
  
  const lastTestResultStr = localStorage.getItem("lastTestResult");
  const lastTestResult = lastTestResultStr ? JSON.parse(lastTestResultStr) : null;
  const passed = (resultsState as any)?.passed as boolean | undefined;
  const threshold = (resultsState as any)?.threshold as number | undefined;
  const breakdown = (resultsState as any)?.breakdown as any | undefined;
  const autoFeedback = (resultsState as any)?.auto_feedback as string | undefined;


  // Confetti effect
  useEffect(() => {
    if (finalScore >= 60) {
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#39A900', '#1F4E78', '#D89E00', '#ffffff'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
    }

    // Animate score counter
    let current = 0;
    const increment = finalScore / 50;
    const interval = setInterval(() => {
      current += increment;
      if (current >= finalScore) {
        setAnimatedScore(finalScore);
        clearInterval(interval);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, 30);

    return () => clearInterval(interval);
  }, [finalScore]);

  const handleDownloadCertificate = () => {
    return;
  };

  const getScoreColor = () => {
    if (finalScore >= 80) return "text-sena-green";
    if (finalScore >= 60) return "text-warning";
    return "text-destructive";
  };

  const getGradientColors = () => {
    if (finalScore >= 80) return "from-sena-green to-sena-green-dark";
    if (finalScore >= 60) return "from-warning to-amber-600";
    return "from-destructive to-red-700";
  };

  const categoryPerformance = Object.values(
    answers.reduce<Record<string, { name: string; total: number; correct: number; score: number }>>(
      (categories, answer) => {
        const categoryName = answer.category || "General";
        const current = categories[categoryName] ?? {
          name: categoryName,
          total: 0,
          correct: 0,
          score: 0,
        };

        current.total += 1;
        current.correct += answer.isCorrect ? 1 : 0;
        current.score = Math.round((current.correct / current.total) * 100);
        categories[categoryName] = current;
        return categories;
      },
      {}
    )
  );

  const writingAnswers = answers.filter((answer) => answer.writingAnswer).length;
  const speakingAnswers = answers.filter((answer) => answer.audioUrl).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className={`relative overflow-hidden bg-gradient-to-br ${getGradientColors()} py-16 lg:py-24`}>
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
              <CheckCircle className="w-4 h-4" />
              Prueba Completada
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-32 h-32 lg:w-40 lg:h-40 mx-auto bg-white/10 backdrop-blur-lg rounded-full flex items-center justify-center mb-6 shadow-2xl">
                <span className="text-5xl lg:text-6xl font-bold">{animatedScore}%</span>
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-3">
                <Award className="w-6 h-6" />
                <span className="text-2xl lg:text-3xl font-bold">Nivel {levelReached}</span>
              </div>

              <p className="text-lg text-white/90 mb-2">
                {passed === false
                  ? `No alcanzaste el puntaje mínimo del nivel ${levelReached}`
                  : `Completaste el nivel ${levelReached}`}
              </p>
              <p className="text-white/80 max-w-md mx-auto">
                {passed === false
                  ? "Repasa el diccionario multimedia y vuelve a intentarlo."
                  : "¡Buen trabajo! Sigue así."}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="container mx-auto max-w-4xl px-4 -mt-8 pb-12 relative z-10">
        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "Correctas", value: `${correctAnswers}/${totalQuestions}`, icon: CheckCircle, tone: "green" as const },
            { label: "Incorrectas", value: `${Math.max(totalQuestions - correctAnswers, 0)}/${totalQuestions}`, icon: XCircle, tone: "red" as const },
            { label: "Tiempo Total", value: duration, icon: Clock, tone: "blue" as const },
            { label: "Puntuacion", value: `${finalScore}%`, icon: Target, tone: "yellow" as const },
          ].map((stat, index) => (
            <StatCard key={index} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} delay={0.6 + index * 0.1} className="shadow-soft-lg" />
          ))}
        </motion.div>

        {/* Category Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="surface-card shadow-soft-lg p-6 mb-8"
        >
          <h3 className="font-semibold text-foreground mb-6">Desempeno por Categoria</h3>
          {categoryPerformance.length > 0 ? (
            <div className="space-y-4">
              {categoryPerformance.map((category, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {category.correct}/{category.total}
                    </span>
                    <span className={`font-semibold ${
                      category.score >= 80 ? 'text-sena-green' :
                      category.score >= 60 ? 'text-warning' : 'text-destructive'
                    }`}>{category.score}%</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${category.score}%` }}
                    transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                    className={`h-full rounded-full ${
                      category.score >= 80 ? 'bg-sena-green' :
                      category.score >= 60 ? 'bg-warning' : 'bg-destructive'
                    }`}
                  />
                </div>
              </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hay respuestas registradas para calcular categorias.</p>
          )}
          {(writingAnswers > 0 || speakingAnswers > 0) && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {writingAnswers > 0 && (
                <div className="rounded-2xl border border-sena-blue/20 bg-sena-blue/5 p-4">
                  <p className="text-sm text-muted-foreground">Respuestas escritas</p>
                  <p className="text-2xl font-bold text-sena-blue">{writingAnswers}</p>
                </div>
              )}
              {speakingAnswers > 0 && (
                <div className="rounded-2xl border border-sena-green/20 bg-sena-green/5 p-4">
                  <p className="text-sm text-muted-foreground">Audios grabados</p>
                  <p className="text-2xl font-bold text-sena-green">{speakingAnswers}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Feedback automático del sistema */}
        {autoFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-sena-blue/5 border border-sena-blue/20 rounded-3xl p-6 mb-8"
          >
            <div className="flex items-start gap-4">
              <IconBadge tone="blue-soft" size="lg" className="flex-shrink-0">
                <MessageSquare />
              </IconBadge>
              <div>
                <h4 className="font-semibold text-foreground mb-1">
                  {passed ? "Resultado del nivel" : "En qué fallaste"}
                </h4>
                <p className="text-muted-foreground" style={{ whiteSpace: 'pre-line' }}>{autoFeedback}</p>
                {typeof threshold === 'number' && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Puntaje mínimo requerido: {threshold}%
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Breakdown para fallos (categoría/dificultad) */}
        {breakdown && breakdown.failed !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1 }}
            className="surface-card shadow-soft-lg p-6 mb-8"
          >
            <h3 className="font-semibold text-foreground mb-4">Desglose de fallos</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Por categoría</p>
                {breakdown.by_category && Object.entries(breakdown.by_category).length > 0 ? (
                  <div className="space-y-2">
                    {Object.entries(breakdown.by_category).map(([cat, data]: any, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-foreground/90">{cat}</span>
                        <span className="text-muted-foreground">
                          {data.failed}/{data.total}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin información.</p>
                )}
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Por dificultad</p>
                {breakdown.by_difficulty && (
                  <div className="space-y-2">
                    {['Easy','Medium','Hard'].map((d) => (
                      <div key={d} className="flex items-center justify-between text-sm">
                        <span className="text-foreground/90">{d}</span>
                        <span className="text-muted-foreground">
                          {breakdown.by_difficulty[d]?.failed}/{breakdown.by_difficulty[d]?.total}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {Array.isArray(breakdown.multiple_choice_failed) && breakdown.multiple_choice_failed.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-2">Preguntas falladas (opción múltiple)</p>
                <div className="space-y-2">
                  {breakdown.multiple_choice_failed.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/50 rounded-2xl">
                      <p className="text-sm font-medium text-foreground">{item.category} • {item.difficulty}</p>
                      <p className="text-xs text-muted-foreground">{item.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}


        {/* Tus errores (preguntas falladas) */}
        {failedAnswers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05 }}
            className="surface-card shadow-soft-lg p-6 mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5 text-destructive" />
              <h3 className="font-semibold text-foreground">Tus errores ({failedAnswers.length})</h3>
            </div>
            <div className="space-y-3">
              {failedAnswers.map((answer, index) => (
                <div key={index} className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-xs font-medium text-destructive mb-1">{answer.category}</p>
                  <p className="text-sm text-foreground">{answer.question}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Repasa estas palabras en el Diccionario Multimedia para mejorar en tu proximo intento.
            </p>
          </motion.div>
        )}

        {/* Level Scale */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="surface-card shadow-soft-lg p-6 mb-8"
        >
          <h3 className="font-semibold text-foreground mb-6">Escala de Niveles</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { level: "Basico", range: "A1 - A2", percentage: "0% - 59%", color: "#E21B3C", active: levelReached === "A1" || levelReached === "A2" },
              { level: "Intermedio", range: "B1", percentage: "60% - 74%", color: "#D89E00", active: levelReached === "B1" },
              { level: "Avanzado", range: "B2", percentage: "75% - 100%", color: "#39A900", active: levelReached === "B2" },
            ].map((item, index) => (
              <div 
                key={index} 
                className={`relative p-4 rounded-2xl text-center transition-all ${
                  item.active ? 'ring-2 ring-offset-2' : 'opacity-60'
                }`}
                style={{
  backgroundColor: `${item.color}10`,
  borderColor: item.active ? item.color : 'transparent'
}}
              >
                <span 
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: `${item.color}20`, color: item.color }}
                >
                  {item.range}
                </span>
                <p className="font-bold text-foreground mt-2">{item.level}</p>
                <p className="text-xs text-muted-foreground">{item.percentage}</p>
                {item.active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: item.color }}
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          <motion.button
            onClick={handleDownloadCertificate}
            disabled
            className="flex items-center justify-center gap-2 bg-muted text-muted-foreground px-6 py-4 rounded-full font-medium cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-5 h-5" />
            Certificado no disponible
          </motion.button>
          <motion.button
            onClick={() => navigate("/quiz")}
            className="flex items-center justify-center gap-2 bg-sena-green text-white px-6 py-4 rounded-full font-medium hover:bg-sena-green-dark transition-all shadow-brand"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw className="w-5 h-5" />
            Hacer otra Prueba
          </motion.button>
          <motion.button
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-center gap-2 bg-muted text-muted-foreground px-6 py-4 rounded-full font-medium hover:bg-muted/80 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Home className="w-5 h-5" />
            Volver al Dashboard
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
}
