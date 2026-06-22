import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { Trophy, Download, RotateCcw, Home, Clock, Target, MessageSquare, Award, CheckCircle, XCircle, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { getLevelFromScore, questions } from "../data/questionsA1";

export function ResultsPage() {
  const navigate = useNavigate();
  const [animatedScore, setAnimatedScore] = useState(0);

  const finalScore = parseInt(localStorage.getItem("quizScore") || "0");
  const correctAnswers = parseInt(localStorage.getItem("correctAnswers") || "0");
  const levelInfo = getLevelFromScore(finalScore);
  useEffect(() => {
    if (levelInfo.canAdvance) {
      localStorage.setItem("A2Unlocked", "true");
    }
  }, [levelInfo.canAdvance]);

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
    alert("Funcionalidad de descarga de certificado - En desarrollo");
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

  // Mock category performance
  const categoryPerformance = [
    { name: "Gramatica", score: 85, total: 6, correct: 5 },
    { name: "Vocabulario", score: 70, total: 8, correct: 5 },
    { name: "Lectura", score: 75, total: 4, correct: 3 },
    { name: "Pronunciacion", score: 50, total: 2, correct: 1 },
  ];

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
              <Sparkles className="w-4 h-4" />
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
              {levelInfo.canAdvance && (
                <p className="mt-3 text-lg font-bold text-green-100">
                  ¡Felicidades! Has dominado A1 y puedes continuar con A2.
                </p>
              )}
              <div className="mt-4 flex flex-col items-center gap-2">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${levelInfo.status === "Mastered"
                    ? "bg-green-500/20 text-green-100"
                    : levelInfo.status === "Competent"
                      ? "bg-blue-500/20 text-blue-100"
                      : levelInfo.status === "Developing"
                        ? "bg-yellow-500/20 text-yellow-100"
                        : "bg-red-500/20 text-red-100"
                    }`}
                >
                  Status: {levelInfo.status}
                </span>

                {levelInfo.canAdvance && (
                  <span className="px-4 py-2 rounded-full bg-white/20 text-white text-sm font-semibold">
                    🎉 A2 Unlocked
                  </span>
                )}
              </div>
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
            { label: "Correctas", value: `${correctAnswers}/${questions.length}`, icon: CheckCircle, color: "sena-green" },
            { label: "Incorrectas", value: `${questions.length - correctAnswers}/${questions.length}`, icon: XCircle, color: "destructive" },
            { label: "Tiempo Total", value: "~8:30", icon: Clock, color: "sena-blue" },
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
          <div className="space-y-4">
            {categoryPerformance.map((category, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-foreground">{category.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {category.correct}/{category.total}
                    </span>
                    <span className={`font-semibold ${category.score >= 80 ? 'text-sena-green' :
                      category.score >= 60 ? 'text-warning' : 'text-destructive'
                      }`}>{category.score}%</span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${category.score}%` }}
                    transition={{ delay: 0.9 + index * 0.1, duration: 0.5 }}
                    className={`h-full rounded-full ${category.score >= 80 ? 'bg-sena-green' :
                      category.score >= 60 ? 'bg-warning' : 'bg-destructive'
                      }`}
                  />
                </div>
              </div>
            ))}
          </div>
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
                className={`relative p-4 rounded-xl text-center transition-all ${item.active ? 'ring-2 ring-offset-2' : 'opacity-60'
                  }`}
                style={{
                  backgroundColor: `${item.color}10`,
                  ['--tw-ring-color' as any]: item.active ? item.color : 'transparent'
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
            className="flex items-center justify-center gap-2 bg-sena-blue text-white px-6 py-4 rounded-xl font-medium hover:bg-sena-blue-light transition-all shadow-lg"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-5 h-5" />
            Descargar Certificado
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
