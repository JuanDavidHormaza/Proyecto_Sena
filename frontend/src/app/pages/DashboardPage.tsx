import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";

import { 
  Target, Flame, BarChart3, 
  Clock, ChevronRight, Play, History, MessageSquare,
  Calendar, X
} from "lucide-react";
import { getLevelFromScore } from "../data/questionsA1";
// Imagen de marca (worklex.png) en /public y logs/
import { UserAccountMenu } from "../components/UserAccountMenu";
import { useAuth } from "../context/AuthContext";
import * as api from "../services/api";

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userName = user?.name || localStorage.getItem("userName") || "Usuario";
  const [testResults, setTestResults] = useState<api.ApiTestResult[]>([]);
  const [selectedTest, setSelectedTest] = useState<{
    id: string;
    date: string;
    score: number;
    level: string;
    duration: string;
    correctAnswers: number;
    totalQuestions: number;
    feedback?: string;
  } | null>(null);

  const lastScore = Number(localStorage.getItem("quizScore") || "0");
  const lastCorrectAnswers = Number(localStorage.getItem("correctAnswers") || "0");
  const lastTotalQuestions = Number(localStorage.getItem("totalQuestions") || "0");
  const lastDuration = localStorage.getItem("quizDuration") || "00:00";

  const userId = user?.id || localStorage.getItem("userId") || undefined;

  useEffect(() => {
    const fetchResults = async () => {
      if (!userId) return;

      try {
        const results = await api.getTestResults(userId);
        const sortedResults = Array.isArray(results)
          ? results.sort(
              (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            )
          : [];
        setTestResults(sortedResults);
      } catch (error) {
        console.error("No se pudieron cargar los resultados desde la base de datos:", error);
      }
    };

    fetchResults();
  }, [userId]);

  const latestResult = testResults[0];
  const hasQuizResult = Boolean(latestResult) || lastTotalQuestions > 0;
  const displayScore = latestResult?.score ?? lastScore;
  const displayCorrectAnswers = latestResult?.correctAnswers ?? lastCorrectAnswers;
  const displayTotalQuestions = latestResult?.totalQuestions ?? lastTotalQuestions;
  const displayDuration = latestResult?.duration ?? lastDuration;
  const currentLevel = latestResult?.level ?? (hasQuizResult ? getLevelFromScore(displayScore).level : "Sin nivel");

  const stats = {
    testsCompleted: testResults.length > 0 ? testResults.length : (hasQuizResult ? 1 : 0),
    averageScore:
      testResults.length > 0
        ? Math.round(testResults.reduce((sum: number, result: api.ApiTestResult) => sum + result.score, 0) / testResults.length)
        : (hasQuizResult ? displayScore : 0),
    currentLevel,
    currentStreak: 0,
    quizDuration: displayDuration,
  };

  const recentTests = testResults.length > 0
    ? testResults.slice(0, 3).map((test) => ({
        id: test.id,
        date: new Date(test.completedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
        score: test.score,
        level: test.level,
        duration: test.duration || displayDuration,
        correctAnswers: test.correctAnswers,
        totalQuestions: test.totalQuestions,
        feedback: test.feedback,
      }))
    : hasQuizResult
    ? [
        {
          id: "fallback",
          date: "Ultima prueba",
          score: displayScore,
          level: currentLevel,
          duration: displayDuration,
          correctAnswers: displayCorrectAnswers,
          totalQuestions: displayTotalQuestions,
          feedback: latestResult?.feedback,
        },
      ]
    : [];

  const feedbacks: Array<{ id: string; teacher: string; date: string; message: string }> = latestResult?.feedback
    ? [
        {
          id: latestResult.id,
          teacher: "Docente",
          date: new Date(latestResult.completedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
          message: latestResult.feedback,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-lg border-b border-border z-40">
        <div className="container mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg shadow-slate-900/15 border border-border">
                <img src="/worklex.png" alt="WorkLex" className="w-full h-full object-cover" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-semibold text-foreground">English Level Test</h1>
                <p className="text-xs text-muted-foreground">Panel de Estudiante</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-sena-green/10 text-sena-green rounded-xl">
                <Flame className="w-4 h-4" />
                <span className="font-medium text-sm">{stats.currentStreak} dias de racha</span>
              </div>
              
              <UserAccountMenu accent="green" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
            Hola, {userName.split(' ')[0]}
          </h2>
          <p className="text-muted-foreground">
            Continua mejorando tu nivel de ingles. Tu siguiente meta esta cerca.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pruebas Realizadas", value: stats.testsCompleted, icon: BarChart3, color: "sena-blue" },
            { label: "Promedio", value: `${stats.averageScore}%`, icon: Target, color: "sena-green" },
            { label: "Tiempo Quiz", value: stats.quizDuration, icon: Clock, color: "sena-blue" },
            { label: "Racha", value: `${stats.currentStreak} dias`, icon: Flame, color: "destructive" },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl p-5 border border-border shadow-sm"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-11 h-11 bg-${stat.color}/10 rounded-xl flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Start Quiz & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Start Quiz Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-sena-green to-sena-green-dark rounded-2xl p-6 lg:p-8 text-white shadow-xl"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      Por niveles
                    </span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                      Tiempo real
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Iniciar Nueva Prueba</h3>
                  <p className="text-white/80 max-w-md">
                    Evalua tu nivel de ingles con preguntas de gramatica, vocabulario, lectura y pronunciacion.
                  </p>
                </div>
                <motion.button
                  onClick={() => navigate("/quiz")}
                  className="flex items-center justify-center gap-2 bg-white text-sena-green px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-5 h-5" />
                  Comenzar Ahora
                </motion.button>
              </div>
            </motion.div>

            {/* Recent Tests */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl border border-border shadow-sm"
            >
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                    <History className="w-5 h-5 text-sena-blue" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Historial de Pruebas</h3>
                    <p className="text-sm text-muted-foreground">Tus ultimas evaluaciones</p>
                  </div>
                </div>
                <button className="text-sm text-sena-green font-medium hover:text-sena-green-dark transition-colors flex items-center gap-1">
                  Ver todo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="divide-y divide-border">
                {recentTests.length > 0 ? recentTests.map((test, index) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className="p-5 flex items-center justify-between hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                        test.score >= 80 ? 'bg-sena-green/10 text-sena-green' :
                        test.score >= 60 ? 'bg-warning/10 text-warning' :
                        'bg-destructive/10 text-destructive'
                      }`}>
                        {test.score}%
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            test.level.startsWith('C') ? 'bg-sena-green/10 text-sena-green' :
                            test.level.startsWith('B') ? 'bg-sena-blue/10 text-sena-blue' :
                            'bg-warning/10 text-warning'
                          }`}>
                            {test.level}
                          </span>
                          <span className="text-sm text-muted-foreground">{test.correctAnswers}/{test.totalQuestions} correctas</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          {test.date}
                          <span className="text-muted-foreground/50">-</span>
                          <Clock className="w-3.5 h-3.5" />
                          {test.duration}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTest(test)}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      aria-label={`Ver detalles de la prueba del ${test.date}`}
                    >
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </motion.div>
                )) : (
                  <div className="p-6 text-sm text-muted-foreground">
                    Aun no hay pruebas registradas.
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Level & Feedback */}
          <div className="space-y-6">
            {/* Current Level Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-2xl p-6 border border-border shadow-sm"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                  <img src="/worklex.png" alt="WorkLex" className="h-8 w-8 object-cover" />
                </div>
                <h3 className="font-semibold text-foreground">Tu Nivel Actual</h3>
              </div>
              
              <div className="text-center py-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-sena-green to-sena-green-dark rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg shadow-sena-green/30 mb-4">
                  {stats.currentLevel}
                </div>
                <p className="text-foreground font-medium">{hasQuizResult ? "Resultado de la ultima prueba" : "Sin prueba registrada"}</p>
                <p className="text-sm text-muted-foreground">{hasQuizResult ? `${displayCorrectAnswers}/${displayTotalQuestions} correctas` : "Completa un quiz para ver tu nivel"}</p>
              </div>
              
              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Puntuacion</span>
                  <span className="font-medium text-foreground">{stats.averageScore}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-sena-green rounded-full" style={{ width: `${stats.averageScore}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Tiempo del quiz: {stats.quizDuration}
                </p>
              </div>
            </motion.div>

            {/* Teacher Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-2xl p-6 border border-border shadow-sm"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-sena-blue/10 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-sena-blue" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Retroalimentacion</h3>
                  <p className="text-sm text-muted-foreground">Comentarios del docente</p>
                </div>
              </div>
              
              {feedbacks.length > 0 ? (
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <div key={feedback.id} className="p-4 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-sena-blue rounded-lg flex items-center justify-center text-white text-xs font-medium">
                          {feedback.teacher.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{feedback.teacher}</p>
                          <p className="text-xs text-muted-foreground">{feedback.date}</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{feedback.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No hay retroalimentacion aun</p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      {selectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="relative w-full max-w-xl rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setSelectedTest(null)}
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cerrar detalle de prueba"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 pr-10">
              <h3 className="text-lg font-semibold leading-none text-foreground">Detalle de la prueba</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Informacion del resultado y retroalimentacion del docente.
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Nivel</p>
                  <p className="text-2xl font-bold text-sena-green">{selectedTest.level}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Puntuacion</p>
                  <p className="text-2xl font-bold text-foreground">{selectedTest.score}%</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Correctas</p>
                  <p className="font-semibold text-foreground">
                    {selectedTest.correctAnswers}/{selectedTest.totalQuestions}
                  </p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs text-muted-foreground">Tiempo</p>
                  <p className="font-semibold text-foreground">{selectedTest.duration}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-sena-blue" />
                  <p className="text-sm font-medium text-foreground">Fecha de presentacion</p>
                </div>
                <p className="text-sm text-muted-foreground">{selectedTest.date}</p>
              </div>

              <div className="rounded-xl bg-muted/50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sena-blue" />
                  <p className="text-sm font-medium text-foreground">Retroalimentacion del docente</p>
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">
                  {selectedTest.feedback || "No hay retroalimentacion para esta prueba aun."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
