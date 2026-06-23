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
import senaLogo from "../../asset/logo.png";

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
  
  const lastTestResultStr = localStorage.getItem("lastTestResult");
  const lastTestResult = lastTestResultStr ? JSON.parse(lastTestResultStr) : null;
  const teacherFeedback = lastTestResult?.feedback || null;

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
              <img src={senaLogo} alt="SENA" className="h-5 w-5 rounded bg-white object-contain" />
              Prueba Completada
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
                <Award className="w-6 h-6" />
                <span className="text-2xl lg:text-3xl font-bold">Nivel {levelInfo.level}</span>
              </div>
              
              <p className="text-lg text-white/90 mb-2">{levelInfo.description}</p>
              <p className="text-white/80 max-w-md mx-auto">{levelInfo.message}</p>
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
            { label: "Correctas", value: `${correctAnswers}/${totalQuestions}`, icon: CheckCircle, color: "sena-green" },
            { label: "Incorrectas", value: `${Math.max(totalQuestions - correctAnswers, 0)}/${totalQuestions}`, icon: XCircle, color: "destructive" },
            { label: "Tiempo Total", value: duration, icon: Clock, color: "sena-blue" },
            { label: "Puntuacion", value: `${finalScore}%`, icon: Target, color: "warning" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="bg-white rounded-2xl p-5 border border-border shadow-lg"
            >
              <div className={`w-10 h-10 bg-${stat.color}/10 rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Category Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-lg mb-8"
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
                <div className="rounded-xl border border-sena-blue/20 bg-sena-blue/5 p-4">
                  <p className="text-sm text-muted-foreground">Respuestas escritas</p>
                  <p className="text-2xl font-bold text-sena-blue">{writingAnswers}</p>
                </div>
              )}
              {speakingAnswers > 0 && (
                <div className="rounded-xl border border-sena-green/20 bg-sena-green/5 p-4">
                  <p className="text-sm text-muted-foreground">Audios grabados</p>
                  <p className="text-2xl font-bold text-sena-green">{speakingAnswers}</p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Teacher Feedback */}
        {teacherFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="bg-sena-blue/5 border border-sena-blue/20 rounded-2xl p-6 mb-8"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-sena-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-6 h-6 text-sena-blue" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">Retroalimentacion del Docente</h4>
                <p className="text-muted-foreground">{teacherFeedback}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Level Scale */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="bg-white rounded-2xl p-6 border border-border shadow-lg mb-8"
        >
          <h3 className="font-semibold text-foreground mb-6">Escala de Niveles</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { level: "Basico", range: "A1 - A2", percentage: "0% - 40%", color: "#E21B3C", active: finalScore <= 40 },
              { level: "Intermedio", range: "B1 - B2", percentage: "41% - 70%", color: "#D89E00", active: finalScore > 40 && finalScore <= 70 },
              { level: "Avanzado", range: "C1 - C2", percentage: "71% - 100%", color: "#39A900", active: finalScore > 70 },
            ].map((item, index) => (
              <div 
                key={index} 
                className={`relative p-4 rounded-xl text-center transition-all ${
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
            className="flex items-center justify-center gap-2 bg-muted text-muted-foreground px-6 py-4 rounded-xl font-medium cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-5 h-5" />
            Certificado no disponible
          </motion.button>
          <motion.button
            onClick={() => navigate("/quiz")}
            className="flex items-center justify-center gap-2 bg-sena-green text-white px-6 py-4 rounded-xl font-medium hover:bg-sena-green-dark transition-all shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <RotateCcw className="w-5 h-5" />
            Hacer otra Prueba
          </motion.button>
          <motion.button
            onClick={() => navigate("/dashboard")}
            className="flex items-center justify-center gap-2 bg-muted text-muted-foreground px-6 py-4 rounded-xl font-medium hover:bg-muted/80 transition-all"
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
