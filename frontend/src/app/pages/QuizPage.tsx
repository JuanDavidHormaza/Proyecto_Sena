import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Star, Clock, Trophy, Zap, X, GraduationCap } from "lucide-react";
import { questions } from "../data/questions";
import * as api from "../services/api";

type AnswerState = "idle" | "correct" | "incorrect" | "submitted";

type QuestionType = "multiple" | "writing" | "speaking";

interface UserAnswer {
  questionId: number;
  question: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  category: string;
  audioUrl?: string;
  audioBlob?: Blob;
  writingAnswer?: string;
}

// ── Umbrales de corte ────────────────────────────────────────────────────────
// >= PASS_THRESHOLD  → pasa al siguiente nivel
// >= STAY_THRESHOLD  → este es su nivel, termina la prueba
// <  STAY_THRESHOLD  → no alcanzó el nivel, se asigna el nivel anterior
const PASS_THRESHOLD = 0.90;
const STAY_THRESHOLD = 0.60;

export function QuizPage() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [writingAnswer, setWritingAnswer] = useState<string>("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  // Porcentaje del nivel recién completado (para mostrarlo en el modal)
  const [lastLevelPct, setLastLevelPct] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const cleanupRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      setRecordedAudioUrl(null);
    }
    setRecordedAudioBlob(null);
    setWritingAnswer("");
    setMediaError(null);
  };

  useEffect(() => {
    return () => cleanupRecording();
  }, []);

  useEffect(() => {
    cleanupRecording();
  }, [currentQuestion]);

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
        const url = URL.createObjectURL(blob);
        setRecordedAudioBlob(blob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setMediaError(null);
    } catch (error) {
      setMediaError("No se ha podido acceder al micrófono.");
      console.error(error);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && answerState === "idle") {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && answerState === "idle") {
      handleNextQuestion();
    }
  }, [timeLeft, answerState]);

  const levelOrder: Level[] = ["A1", "A2", "B1", "B2"];
  const questionsByLevel: Record<Level, QuizQuestion[]> = {
    A1: buildLevelQuestions("A1"),
    A2: buildLevelQuestions("A2"),
    B1: buildLevelQuestions("B1"),
    B2: buildLevelQuestions("B2"),
  };
  const currentQuestions = questionsByLevel[currentLevel];
  const question = currentQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / currentQuestions.length) * 100;

  const isMultipleQuestion = question.type === "multiple";
  const isWritingQuestion = question.type === "writing";
  const isSpeakingQuestion = question.type === "speaking";

  const getCompletedQuestionCount = (completedLevels: Level[]) =>
    completedLevels.reduce((total, level) => total + questionsByLevel[level].length, 0);

  const getSerializableAnswers = (answers: UserAnswer[]) =>
    answers.map(({ audioBlob, ...answer }) => ({
      ...answer,
      audioBlob: undefined,
    }));

  // ── Calcular porcentaje de aciertos SOLO en el nivel indicado ────────────
  const calcLevelPct = (level: Level): number => {
    const levelQs = questionsByLevel[level];
    // Solo preguntas de opción múltiple tienen correctAnswer definido
    const multipleQs = levelQs.filter((q) => q.type === "multiple");
    const multipleIds = new Set(multipleQs.map((q) => q.id));
    const levelAnswers = userAnswersRef.current.filter((a) => multipleIds.has(a.questionId));
    const correct = levelAnswers.filter((a) => a.isCorrect).length;
    const total = multipleQs.length;
    return total > 0 ? correct / total : 0;
  };

  // ── Guardar resultado y construir state para ResultsPage ─────────────────
  const saveQuizResult = async (
    completedLevels: Level[],
    stoppedReason: "passed_all" | "level_assigned" | "below_minimum" = "passed_all"
  ) => {
    const completedAnswers = userAnswersRef.current;
    const correctAnswerCount = scoreRef.current;
    const completedQuestionCount = getCompletedQuestionCount(completedLevels);
    const finalScore = Math.round(
      completedQuestionCount > 0 ? (correctAnswerCount / completedQuestionCount) * 100 : 0
    );
    const duration = formatDuration(Date.now() - quizStartedAtRef.current);
    const userId = Number(localStorage.getItem("userId"));
    const serializableAnswers = getSerializableAnswers(completedAnswers);

    // Nivel asignado: el último de los niveles completados
    const assignedLevel = completedLevels[completedLevels.length - 1];

    localStorage.setItem("quizScore", String(finalScore));
    localStorage.setItem("correctAnswers", String(correctAnswerCount));
    localStorage.setItem("totalQuestions", String(completedQuestionCount));
    localStorage.setItem("quizDuration", duration);

    try {
      const resultPayload: Record<string, unknown> = {
        score: finalScore,
        level: assignedLevel,
        correct_answers: correctAnswerCount,
        total_questions: completedQuestionCount,
        answers: serializableAnswers.map((answer) => ({
          questionId: answer.questionId,
          difficulty: answer.difficulty,
          is_correct: answer.isCorrect,
        })),
        process: { userAnswers: serializableAnswers },
        speaking_score: completedAnswers.filter((item) => item.audioUrl).length,
        writing_score: completedAnswers.filter((item) => item.writingAnswer).length,
        duration,
      };

      if (Number.isFinite(userId) && userId > 0) {
        resultPayload.user_id = userId;
      }

      const savedResult = await api.createTestResult(resultPayload);
      localStorage.setItem("lastTestResult", JSON.stringify(savedResult));
    } catch (error) {
      console.error("No se pudo guardar el resultado del quiz.", error);
    }

    return {
      score: finalScore,
      correctAnswers: correctAnswerCount,
      totalQuestions: completedQuestionCount,
      answers: completedAnswers,
      levelReached: assignedLevel,
      completedLevels,
      duration,
      stoppedReason,
    };
  };

  // ── Avanzar pregunta / evaluar nivel al terminarlo ───────────────────────
  const handleNextQuestion = async () => {
    // Aún quedan preguntas en el nivel actual → avanza normalmente
    if (currentQuestion + 1 < currentQuestions.length) {
      cleanupRecording();
      setCurrentQuestion((prev) => prev + 1);
      setTimeLeft(30);
      setSelectedAnswer(null);
      setAnswerState("idle");
      return;
    }

    // Fin del nivel: calcular rendimiento en preguntas de opción múltiple
    const levelPct = calcLevelPct(currentLevel);
    setLastLevelPct(levelPct);

    const currentLevelIndex = levelOrder.indexOf(currentLevel);
    const completedLevels = levelOrder.slice(0, currentLevelIndex + 1) as Level[];

    if (levelPct < STAY_THRESHOLD) {
      // < 60 % → no alcanzó este nivel; se asigna el nivel anterior (o A1)
      const assignedLevels: Level[] =
        currentLevelIndex === 0
          ? ["A1"]
          : (levelOrder.slice(0, currentLevelIndex) as Level[]);
      const resultState = await saveQuizResult(
        assignedLevels.length > 0 ? assignedLevels : ["A1"],
        "below_minimum"
      );
      navigate("/results", { state: resultState });
      return;
    }

    if (levelPct < PASS_THRESHOLD) {
      // 60 %–89 % → este es su nivel, termina la prueba
      const resultState = await saveQuizResult(completedLevels, "level_assigned");
      navigate("/results", { state: resultState });
      return;
    }

    // >= 90 % → puede subir de nivel
    if (currentLevel !== "B2") {
      setShowLevelModal(true);
      return;
    }

    // Completó B2 con >= 90 %
    const resultState = await saveQuizResult(levelOrder, "passed_all");
    navigate("/results", { state: resultState });
  };

  // Terminar manualmente desde el modal de nivel completado
  const finishCurrentQuiz = async () => {
    const completedLevels = levelOrder.slice(
      0,
      levelOrder.indexOf(currentLevel) + 1
    ) as Level[];
    const resultState = await saveQuizResult(completedLevels, "level_assigned");
    navigate("/results", { state: resultState });
  };

  const continueNextLevel = () => {
    const nextLevel = levelOrder[levelOrder.indexOf(currentLevel) + 1];
    if (nextLevel) {
      setCurrentLevel(nextLevel as Level);
    }
    setCurrentQuestion(0);
    setTimeLeft(30);
    setSelectedAnswer(null);
    setAnswerState("idle");
    setShowLevelModal(false);
  };

  // ── Respuestas ────────────────────────────────────────────────────────────
  const handleAnswerClick = (answerIndex: number) => {
    if (answerState !== "idle" || !isMultipleQuestion) return;

    setSelectedAnswer(answerIndex);
    const isCorrect = answerIndex === question.correctAnswer;

    const answer: UserAnswer = {
      questionId: question.id,
      question: question.question,
      difficulty: question.difficulty,
      userAnswer: answerIndex,
      correctAnswer: question.correctAnswer ?? -1,
      isCorrect,
      category: question.category,
    };
    setUserAnswers([...userAnswers, answer]);

    if (isCorrect) {
      setAnswerState("correct");
      setScore(score + 1);
    } else {
      setAnswerState("incorrect");
    }

    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleWritingComplete = () => {
    if (answerState !== "idle") return;
    if (!writingAnswer.trim()) {
      setMediaError("Escribe tu respuesta antes de continuar.");
      return;
    }
    const answer: UserAnswer = {
      questionId: question.id,
      question: question.question,
      difficulty: question.difficulty,
      userAnswer: -1,
      correctAnswer: -1,
      isCorrect: false,
      category: question.category,
      writingAnswer: writingAnswer.trim(),
    };
    setUserAnswers([...userAnswers, answer]);
    setAnswerState("submitted");
    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleSpeakingComplete = () => {
    if (answerState !== "idle") return;
    if (!recordedAudioUrl) {
      setMediaError("Graba tu respuesta de audio antes de continuar.");
      return;
    }
    const answer: UserAnswer = {
      questionId: question.id,
      question: question.question,
      difficulty: question.difficulty,
      userAnswer: -1,
      correctAnswer: -1,
      isCorrect: false,
      category: question.category,
      audioUrl: recordedAudioUrl,
      audioBlob: recordedAudioBlob ?? undefined,
    };
    setUserAnswers([...userAnswers, answer]);
    setAnswerState("submitted");
    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleNextQuestion = async () => {
    if (currentQuestion + 1 < questions.length) {
      cleanupRecording();
      setCurrentQuestion(currentQuestion + 1);
      setTimeLeft(30);
      setSelectedAnswer(null);
      setAnswerState("idle");
    } else {
      const finalScore = Math.round((score / questions.length) * 100);
      let level = "A1";
      let character = "Beginner";

      if (finalScore >= 90) {
        level = "C2";
        character = "Master";
      } else if (finalScore >= 80) {
        level = "C1";
        character = "Expert";
      } else if (finalScore >= 70) {
        level = "B2";
        character = "Advanced";
      } else if (finalScore >= 60) {
        level = "B1";
        character = "Intermediate";
      } else if (finalScore >= 40) {
        level = "A2";
        character = "Explorer";
      }

      const process = {
        answers: userAnswers
          .filter((item) => item.userAnswer !== -1)
          .map(({ questionId, question, userAnswer, correctAnswer, isCorrect, category }) => ({
            questionId,
            question,
            userAnswer,
            correctAnswer,
            isCorrect,
            category,
          })),
        writingAnswers: userAnswers
          .filter((item) => item.writingAnswer)
          .map(({ questionId, question, writingAnswer, category }) => ({
            questionId,
            question,
            writingAnswer,
            category,
          })),
        speakingAnswers: userAnswers
          .filter((item) => item.audioUrl)
          .map(({ questionId, question, audioUrl, category }) => ({
            questionId,
            question,
            audioUrl,
            category,
          })),
      };

      const answersPayload = userAnswers.map((answer) => ({
        questionId: answer.questionId,
        difficulty: answer.difficulty,
        is_correct: answer.isCorrect,
      }));

      const speakingScore = userAnswers.filter((item) => item.audioUrl).length;
      const writingScore = userAnswers.filter((item) => item.writingAnswer).length;

      await api.createTestResult({
        user_id: Number(localStorage.getItem("userId")),
        answers: answersPayload,
        speaking_score: speakingScore,
        writing_score: writingScore,
        correct_answers: score,
        total_questions: questions.length,
        process,
        duration: "00:10:00",
      });

      navigate("/results");
    }
  };

  const answerColors = [
    { bg: "bg-answer-red", hover: "hover:bg-answer-red/90" },
    { bg: "bg-answer-blue", hover: "hover:bg-answer-blue/90" },
    { bg: "bg-answer-yellow", hover: "hover:bg-answer-yellow/90" },
    { bg: "bg-answer-green", hover: "hover:bg-answer-green/90" },
  ];

  const getButtonStyle = (index: number) => {
    if (answerState === "idle") {
      return `${answerColors[index].bg} ${answerColors[index].hover}`;
    }
    if (index === question.correctAnswer) return "bg-sena-green";
    if (index === selectedAnswer && answerState === "incorrect") return "bg-destructive";
    return "bg-muted-foreground/30";
  };

  const getDifficultyStars = () => {
    const difficulty = question.difficulty ?? 1;
    let stars = 1;
    if (difficulty >= 5) stars = 2;
    if (difficulty >= 8) stars = 3;
    return Array(stars).fill(0);
  };

  const getDifficultyLabel = () => {
    const difficulty = question.difficulty ?? 1;
    if (difficulty <= 4) return "Basico";
    if (difficulty <= 7) return "Intermedio";
    return "Avanzado";
  };

  const getDifficultyLabelFromNumber = (difficulty: number): "Easy" | "Medium" | "Hard" => {
    if (difficulty <= 4) return "Easy";
    if (difficulty <= 7) return "Medium";
    return "Hard";
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
            <div className="w-10 h-10 bg-white/10 backdrop-blur-lg rounded-xl flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-medium hidden sm:block">English Level Test</span>
          </div>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between text-white/80 text-sm mb-2">
            <span>
              Nivel {currentLevel}: pregunta {currentQuestion + 1} de {currentQuestions.length}
            </span>
            <span>{Math.round(progress)}% completado</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-lg">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-xl">
            <Clock
              className={`w-5 h-5 ${timeLeft <= 10 ? "text-destructive animate-pulse" : "text-white"}`}
            />
            <span
              className={`font-bold text-lg ${timeLeft <= 10 ? "text-destructive" : "text-white"}`}
            >
              {timeLeft}s
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-xl">
            <Trophy className="w-5 h-5 text-warning" />
            <span className="font-bold text-lg text-white">{score}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-xl">
            <Zap className="w-5 h-5 text-sena-green" />
            <span className="font-bold text-lg text-white">
              {userAnswers.filter((a) => a.isCorrect).length}
            </span>
          </div>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Question Header */}
            <div className="px-6 lg:px-8 pt-6 lg:pt-8">
              <div className="flex items-center justify-between mb-4">
                <span className="px-3 py-1 bg-sena-blue/10 text-sena-blue rounded-lg text-sm font-medium">
                  {question.category}
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {getDifficultyStars().map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{getDifficultyLabel()}</span>
                </div>
              </div>

              <h2 className="text-xl lg:text-2xl font-bold text-foreground leading-relaxed mb-6">
                {question.prompt ?? question.question}
              </h2>
              {(isSpeakingQuestion || isWritingQuestion) && question.prompt && (
                <p className="text-sm text-muted-foreground mb-6">{question.prompt}</p>
              )}
            </div>

            {/* Answer Options or Speaking/Writing Task */}
            {isSpeakingQuestion ? (
              <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                <p className="mb-6 text-base text-foreground/80">
                  This prompt is a speaking task. Grant microphone access to record your response, then press the button below to continue.
                </p>
                {mediaError && (
                  <div className="mb-4 rounded-2xl bg-destructive/10 border border-destructive text-destructive px-4 py-3 text-sm">
                    {mediaError}
                  </div>
                )}
                <div className="flex flex-col items-center gap-5 rounded-3xl border border-sena-blue/15 bg-slate-50 px-5 py-7 mb-5">
                  <motion.button
                    type="button"
                    onClick={isRecording ? handleStopRecording : handleStartRecording}
                    disabled={answerState !== "idle"}
                    className={`relative h-20 w-20 rounded-full flex items-center justify-center text-white shadow-xl transition disabled:cursor-not-allowed disabled:bg-muted ${
                      isRecording ? "bg-destructive" : "bg-sena-blue hover:bg-sena-blue/90"
                    }`}
                    animate={isRecording ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                    transition={isRecording ? { duration: 0.9, repeat: Infinity } : undefined}
                    aria-label={isRecording ? "Detener grabacion" : "Grabar audio"}
                  >
                    {isRecording && (
                      <motion.span
                        className="absolute inset-0 rounded-full border-4 border-destructive/30"
                        animate={{ scale: [1, 1.45], opacity: [0.6, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                    {isRecording ? (
                      <Square className="w-7 h-7 fill-current" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </motion.button>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      {isRecording
                        ? "Grabando respuesta"
                        : recordedAudioUrl
                        ? "Audio listo para enviar"
                        : "Pulsa para grabar"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      No se requiere audio externo; se guarda la respuesta del estudiante.
                    </p>
                  </div>
                </div>
                {recordedAudioUrl && (
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Recorded audio preview:</p>
                    <audio controls src={recordedAudioUrl} className="w-full" />
                  </div>
                )}
                <button
                  onClick={handleSpeakingComplete}
                  disabled={answerState !== "idle" || !recordedAudioUrl}
                  className="w-full bg-sena-blue text-white p-5 rounded-2xl text-base font-medium transition hover:bg-sena-blue/90 disabled:cursor-not-allowed disabled:bg-muted"
                >
                  Complete speaking task
                </button>
              </div>
            ) : isWritingQuestion ? (
              <div className="px-6 lg:px-8 pb-6 lg:pb-8">
                <p className="mb-6 text-base text-foreground/80">
                  This prompt is a writing task. Write your answer below, then press continue when finished.
                </p>
                {mediaError && (
                  <div className="mb-4 rounded-2xl bg-destructive/10 border border-destructive text-destructive px-4 py-3 text-sm">
                    {mediaError}
                  </div>
                )}
                <div className="rounded-3xl border border-sena-blue/15 bg-slate-50 p-4">
                  <textarea
                    value={writingAnswer}
                    onChange={(event) => {
                      setWritingAnswer(event.target.value);
                      setMediaError(null);
                    }}
                    rows={7}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 placeholder:text-slate-400 focus:border-sena-blue focus:outline-none focus:ring-2 focus:ring-sena-blue/20"
                    placeholder="Escribe tu respuesta aqui..."
                  />
                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {writingAnswer.trim().split(/\s+/).filter(Boolean).length} palabras
                    </span>
                    {writingAnswer.trim() && (
                      <span className="inline-flex items-center gap-1 text-sena-green font-medium">
                        <Check className="w-4 h-4" />
                        Respuesta capturada
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleWritingComplete}
                  disabled={answerState !== "idle"}
                  className="mt-4 w-full bg-sena-blue text-white p-5 rounded-2xl text-base font-medium transition hover:bg-sena-blue/90 disabled:cursor-not-allowed disabled:bg-muted"
                >
                  Complete writing task
                </button>
              </div>
            ) : (
              <div className="px-6 lg:px-8 pb-6 lg:pb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {question.options?.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleAnswerClick(index)}
                    disabled={answerState !== "idle"}
                    className={`${getButtonStyle(index)} text-white p-5 lg:p-6 rounded-2xl text-left transition-all disabled:cursor-not-allowed shadow-lg`}
                    whileHover={answerState === "idle" ? { scale: 1.02, y: -2 } : {}}
                    whileTap={answerState === "idle" ? { scale: 0.98 } : {}}
                    animate={
                      selectedAnswer === index && answerState === "incorrect"
                        ? { x: [0, -8, 8, -8, 8, 0], transition: { duration: 0.4 } }
                        : selectedAnswer === index && answerState === "correct"
                        ? { scale: [1, 1.05, 1], transition: { duration: 0.3 } }
                        : {}
                    }
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="font-medium text-base lg:text-lg leading-snug">{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Feedback */}
            <AnimatePresence>
              {answerState !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`px-6 lg:px-8 py-5 text-center text-white ${
                    answerState === "correct" || answerState === "submitted"
                      ? "bg-sena-green"
                      : "bg-destructive"
                  }`}
                >
                  {answerState === "correct" ? (
                    <div className="flex items-center justify-center gap-3">
                      <Trophy className="w-6 h-6" />
                      <span className="text-lg font-bold">Correcto! +1 punto</span>
                    </div>
                  ) : answerState === "submitted" ? (
                    <div className="flex items-center justify-center gap-3">
                      <Trophy className="w-6 h-6" />
                      <span className="text-lg font-bold">Speaking task recorded. Continuando...</span>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold mb-1">Incorrecto</p>
                      <p className="text-white/90 text-sm">
                        La respuesta correcta es:{" "}
                        {question.options?.[question.correctAnswer ?? 0]}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Exit Confirmation Modal */}
      <AnimatePresence>
        {showExitConfirm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-warning/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-warning" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Salir de la prueba?</h3>
              <p className="text-muted-foreground mb-6">
                Perderas todo tu progreso actual. Esta accion no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 bg-muted text-muted-foreground rounded-xl font-medium hover:bg-muted/80 transition-colors"
                >
                  Continuar
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex-1 py-3 bg-destructive text-white rounded-xl font-medium hover:bg-destructive/90 transition-colors"
                >
                  Salir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Level Completion Modal — aparece solo cuando >= 90 % */}
      <AnimatePresence>
        {showLevelModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full mx-4 text-center"
            >
              {/* Indicador de puntaje */}
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-sena-green/10 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-sena-green" />
              </div>

              <h2 className="text-2xl font-bold mb-2">
                ¡Nivel {currentLevel} superado!
              </h2>

              <p className="text-sena-green font-semibold text-lg mb-1">
                {Math.round(lastLevelPct * 100)}% de aciertos
              </p>

              <p className="text-gray-500 text-sm mb-6">
                Excelente rendimiento. Puedes continuar al siguiente nivel o finalizar aquí.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={finishCurrentQuiz}
                  className="flex-1 bg-gray-200 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
                >
                  Finalizar
                </button>
                <button
                  onClick={continueNextLevel}
                  className="flex-1 bg-sena-blue text-white py-3 rounded-xl font-medium hover:bg-sena-blue/90 transition-colors"
                >
                  Siguiente nivel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}