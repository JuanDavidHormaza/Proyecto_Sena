import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Check, Clock, Mic, Square, Star, Trophy, Zap, X, Volume2, Image as ImageIcon } from "lucide-react";
import * as api from "../services/api";
import * as dictionaryApi from "../services/dictionaryService";
import { BrandLogo } from "../components/BrandLogo";
import { IconBadge } from "../components/ui/icon-badge";
import { useAuth } from "../context/AuthContext";


type AnswerState = "idle" | "correct" | "incorrect" | "submitted";

type QuestionType = "multiple" | "writing" | "speaking" | "listening" | "grammar";
type Level = "A1" | "A2" | "B1" | "B2";
type QuizQuestion = {
  id: number;
  type: QuestionType | "listening";
  question: string;
  prompt?: string;
  options?: string[];
  correctAnswer?: number;
  difficulty?: number;
  category: string;
  imageUrl?: string;
  audioUrl?: string;
  wordId?: string;
  wordText?: string;
  level?: Level;
};

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

export function QuizPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // El quiz se adapta al programa del estudiante autenticado (sin importar
  // cuál sea, siempre usa su propio diccionario).
  const studentProgram = user?.program || localStorage.getItem("userProgram") || "";
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [currentLevel, setCurrentLevel] = useState<Level>("A1");
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [writingAnswer, setWritingAnswer] = useState<string>("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [pronunciationResult, setPronunciationResult] = useState<any>(null);
  const [quizFeedback, setQuizFeedback] = useState<{ percentage: number; passed: boolean; message: string } | null>(null);
  const [dictionaryContext, setDictionaryContext] = useState<any>(null);
  const [dictionaryWords, setDictionaryWords] = useState<any[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scoreRef = useRef(score);
  const userAnswersRef = useRef(userAnswers);
  const quizStartedAtRef = useRef(Date.now());

  const buildLevelQuestions = (level: Level): QuizQuestion[] => {
    return questions.filter((q) => q.level === level);
  };

  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.max(Math.round(milliseconds / 1000), 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const levelOrder: Level[] = ["A1", "A2", "B1", "B2"];
  const questionsByLevel: Record<Level, QuizQuestion[]> = {
    A1: buildLevelQuestions("A1"),
    A2: buildLevelQuestions("A2"),
    B1: buildLevelQuestions("B1"),
    B2: buildLevelQuestions("B2"),
  };
  const safeCurrentLevel = levelOrder.includes(currentLevel) ? currentLevel : "A1";
  const currentQuestions = questionsByLevel[safeCurrentLevel] || [];
  const safeQuestionIndex = currentQuestions.length > 0 ? Math.min(currentQuestion, currentQuestions.length - 1) : 0;
  const question = currentQuestions[safeQuestionIndex];
  const totalQuestions = levelOrder.reduce(
    (total, level) => total + questionsByLevel[level].length,
    0
  );

  const progress =
    ((currentQuestion + 1) / (currentQuestions?.length || 1)) * 100;

  const loadQuestionsForLevel = async (level: Level) => {
    setQuestionsLoading(true);
    try {
      const data = await api.fetchQuizQuestions(level, 5, studentProgram);
      const backendQuestions = (data as any).questions || [];
      const mapped: QuizQuestion[] = backendQuestions.map((q: any, idx: number) => ({
        id: q.id || idx + 1,
        type: q.type === "listening" ? "listening" : q.type === "speaking" ? "speaking" : q.type === "writing" ? "writing" : q.type === "grammar" ? "grammar" : "multiple",
        question: q.question,
        prompt: q.prompt,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty ?? 4,
        category: q.category || "Vocabulary",
        imageUrl: q.imageUrl,
        audioUrl: q.audioUrl,
        wordId: q.wordId,
        wordText: q.wordText,
        level: level,
      }));
      // Precargar las imágenes del nivel para que aparezcan al instante y no
      // se queden en blanco mientras el estudiante responde.
      mapped.forEach((q) => {
        if (q.imageUrl) {
          const preloadImg = new Image();
          preloadImg.src = q.imageUrl;
        }
      });

      setQuestions(mapped);
      setCurrentQuestion(0);
      setSelectedAnswer(null);
      setAnswerState("idle");
      setTimeLeft(30);
      setPronunciationResult(null);
    } catch (error) {
      console.error("No se pudieron cargar las preguntas.", error);
    } finally {
      setQuestionsLoading(false);
    }
  };

  useEffect(() => {
    loadQuestionsForLevel(currentLevel);
  }, [currentLevel]);

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        const words = await dictionaryApi.getDictionaryWords();
        setDictionaryWords(words);
      } catch (error) {
        console.error("Error loading dictionary for quiz context:", error);
      }
    };
    loadDictionary();
  }, []);

  useEffect(() => {
    const currentQ = currentQuestions[currentQuestion];
    if (currentQ?.wordId && dictionaryWords.length > 0) {
      const word = dictionaryWords.find((w) => w.word_id.toLowerCase() === (currentQ.wordId || "").toLowerCase());
      setDictionaryContext(word || null);
    } else {
      setDictionaryContext(null);
    }
  }, [currentQuestion, currentLevel, currentQuestions, dictionaryWords]);

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
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    userAnswersRef.current = userAnswers;
  }, [userAnswers]);

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

  useEffect(() => {
    if (timeLeft > 0 && answerState === "idle") {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && answerState === "idle") {
      handleNextQuestion();
    }
  }, [timeLeft, answerState]);

  const getCompletedQuestionCount = (completedLevels: Level[]) =>
    completedLevels.reduce((total, level) => total + questionsByLevel[level].length, 0);

  const getSerializableAnswers = (answers: UserAnswer[]) =>
    answers.map(({ audioBlob, ...answer }) => ({
      ...answer,
      audioBlob: undefined,
    }));

  const saveQuizResult = async (
    completedLevels: Level[]
  ): Promise<{
    score: number;
    correctAnswers: number;
    totalQuestions: number;
    answers: UserAnswer[];
    levelReached: Level;
    completedLevels: Level[];
    duration: string;
    passed?: boolean;
    threshold?: number;
    breakdown?: any;
    auto_feedback?: string;
  }> => {
    const completedAnswers = userAnswersRef.current;
    const correctAnswerCount = scoreRef.current;
    const completedQuestionCount = getCompletedQuestionCount(completedLevels);
    const finalScore = Math.round((correctAnswerCount / completedQuestionCount) * 100);
    const duration = formatDuration(Date.now() - quizStartedAtRef.current);
    const userId = Number(localStorage.getItem("userId"));
    const serializableAnswers = getSerializableAnswers(completedAnswers);

    try {
      const enrichedAnswers = await Promise.all(
        serializableAnswers.map(async (answer) => {
          if (answer.audioBlob) {
            try {
              const evaluation = await api.evaluatePronunciation(answer.audioBlob, answer.question);
              return { ...answer, pronunciationEvaluation: evaluation };
            } catch (error) {
              console.error("Error evaluating pronunciation:", error);
              return answer;
            }
          }
          return answer;
        })
      );

      const resultPayload: Record<string, unknown> = {
        score: finalScore,
        level: completedLevels[completedLevels.length - 1],
        correct_answers: correctAnswerCount,
        total_questions: completedQuestionCount,
        answers: enrichedAnswers.map((answer) => ({
          questionId: answer.questionId,
          difficulty: answer.difficulty,
          is_correct: answer.isCorrect,
          audioUrl: answer.audioUrl,
          pronunciationEvaluation: answer.pronunciationEvaluation,
        })),
        process: { userAnswers: enrichedAnswers },
        speaking_score: completedAnswers.filter((item) => item.audioUrl).length,
        writing_score: completedAnswers.filter((item) => item.writingAnswer).length,
        duration,
      };

      if (Number.isFinite(userId) && userId > 0) {
        resultPayload.user_id = userId;
      }

      const savedResult = await api.createTestResult(resultPayload);

      localStorage.setItem("lastTestResult", JSON.stringify(savedResult));

      return {
        score: finalScore,
        correctAnswers: correctAnswerCount,
        totalQuestions: completedQuestionCount,
        answers: completedAnswers,
        levelReached: completedLevels[completedLevels.length - 1],
        completedLevels,
        duration,
        passed: savedResult?.passed,
        threshold: savedResult?.threshold,
        breakdown: savedResult?.breakdown,
        auto_feedback: savedResult?.auto_feedback,
      };
    } catch (error) {
      console.error("No se pudo guardar el resultado del quiz.", error);
    }

    return {
      score: finalScore,
      correctAnswers: correctAnswerCount,
      totalQuestions: completedQuestionCount,
      answers: completedAnswers,
      levelReached: completedLevels[completedLevels.length - 1],
      completedLevels,
      duration,
      passed: undefined,
    };
  };


  const handleAnswerClick = (answerIndex: number) => {
    if (answerState !== "idle" || !question) return;
    if (!isMultipleQuestion) return;

    setSelectedAnswer(answerIndex);
    const isCorrect = answerIndex === question.correctAnswer;

    const answer: UserAnswer = {
      questionId: question.id,
      question: question.question,
      difficulty: getDifficultyLabelFromNumber(question.difficulty ?? 1),
      userAnswer: answerIndex,
      correctAnswer: question.correctAnswer ?? -1,
      isCorrect,
      category: question.category,
    };
    const nextUserAnswers = [...userAnswersRef.current, answer];
    userAnswersRef.current = nextUserAnswers;
    setUserAnswers(nextUserAnswers);

    if (isCorrect) {
      setAnswerState("correct");
      const nextScore = scoreRef.current + 1;
      scoreRef.current = nextScore;
      setScore(nextScore);
    } else {
      setAnswerState("incorrect");
    }

    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  // Función para normalizar texto: quita acentos, mayúsculas y signos
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quita acentos
      .replace(/[^a-z0-9\s]/g, "")    // quita signos de puntuación
      .replace(/\s+/g, " ")           // normaliza espacios
      .trim();
  };

  const handleWritingComplete = () => {
    if (answerState !== "idle" || !question) return;
    if (!writingAnswer.trim()) {
      setMediaError("Escribe tu respuesta antes de continuar.");
      return;
    }

    // Evaluar la respuesta escrita: comparar normalizada (sin acentos, mayúsculas, signos)
    const correctWord = normalizeText(question.wordText || question.wordId || "");
    const userWord = normalizeText(writingAnswer);
    const isCorrectWriting = correctWord !== "" && userWord === correctWord;

    const answer: UserAnswer = {
      questionId: question.id,
      question: question.question,
      difficulty: getDifficultyLabelFromNumber(question.difficulty ?? 1),
      userAnswer: -1,
      correctAnswer: -1,
      isCorrect: isCorrectWriting,
      category: question.category,
      writingAnswer: writingAnswer.trim(),
    };
    const nextUserAnswers = [...userAnswersRef.current, answer];
    userAnswersRef.current = nextUserAnswers;
    setUserAnswers(nextUserAnswers);
    setAnswerState("submitted");

    // Sumar puntaje si la escritura es correcta
    if (isCorrectWriting) {
      const nextScore = scoreRef.current + 1;
      scoreRef.current = nextScore;
      setScore(nextScore);
    }

    setTimeout(() => {
      handleNextQuestion();
    }, 2000);
  };

  const handleSpeakingComplete = async () => {
    if (answerState !== "idle") return;
    if (!recordedAudioUrl || !recordedAudioBlob) {
      setMediaError("Graba tu respuesta de audio antes de continuar.");
      return;
    }

    try {
      const expectedText = question.wordText || question.wordId || question.question;
      const evaluation = await api.evaluatePronunciation(recordedAudioBlob, expectedText, undefined, currentLevel);
      setPronunciationResult(evaluation);

      const pronunciationScore = (evaluation as any)?.evaluation?.pronunciation_score ?? 0;
      const isCorrectSpeaking = pronunciationScore >= 60;

      const answer: UserAnswer = {
        questionId: question.id,
        question: question.question,
        difficulty: getDifficultyLabelFromNumber(question.difficulty ?? 1),
        userAnswer: -1,
        correctAnswer: -1,
        isCorrect: isCorrectSpeaking,
        category: question.category,
        audioUrl: recordedAudioUrl,
        audioBlob: recordedAudioBlob ?? undefined,
      };
      const nextUserAnswers = [...userAnswersRef.current, answer];
      userAnswersRef.current = nextUserAnswers;
      setUserAnswers(nextUserAnswers);
      setAnswerState("submitted");

      // Sumar puntaje si la pronunciación es aceptable
      if (isCorrectSpeaking) {
        const nextScore = scoreRef.current + 1;
        scoreRef.current = nextScore;
        setScore(nextScore);
      }

      setTimeout(() => {
        handleNextQuestion();
      }, 2000);
    } catch (error) {
      console.error("Error evaluating pronunciation:", error);
      setMediaError("No se pudo evaluar la pronunciación. Intenta de nuevo.");
    }
  };

  const handleNextQuestion = async () => {
    cleanupRecording();
    setAnswerState("idle");
    setSelectedAnswer(null);
    setTimeLeft(30);
    setPronunciationResult(null);

    try {
      if (currentQuestion + 1 < currentQuestions.length) {
        setCurrentQuestion((prev) => prev + 1);
        return;
      }

      const completedLevels = levelOrder.slice(0, levelOrder.indexOf(currentLevel) + 1);
      const resultState = await saveQuizResult(completedLevels);
      setQuizFeedback({
        percentage: Math.round(((resultState?.correctAnswers ?? 0) / Math.max(resultState?.totalQuestions ?? 1, 1)) * 100),
        passed: resultState?.passed ?? false,
        message: resultState?.auto_feedback ?? (resultState?.passed ? "Aprobaste el nivel." : "No aprobaste el nivel."),
      });

      if (resultState?.passed && currentLevel !== "B2") {
        const currentLevelIdx = levelOrder.indexOf(currentLevel);
        const nextLevel = levelOrder[currentLevelIdx + 1];
        if (nextLevel) {
          setCurrentLevel(nextLevel);
          await loadQuestionsForLevel(nextLevel);
          return;
        }
      }

      setTimeout(() => {
        navigate("/results", {
          state: resultState,
        });
      }, 2500);
    } catch (error) {
      console.error("Error advancing to next question:", error);
      setAnswerState("idle");
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
    if (index === question?.correctAnswer) {
      return "bg-sena-green";
    }
    if (index === selectedAnswer && answerState === "incorrect") {
      return "bg-destructive";
    }
    return "bg-muted-foreground/30";
  };

  const getDifficultyStars = () => {
    const difficulty = question?.difficulty ?? 1;
    let stars = 1;
    if (difficulty >= 5) stars = 2;
    if (difficulty >= 8) stars = 3;
    return Array(stars).fill(0);
  };

  const getDifficultyLabel = () => {
    const difficulty = question?.difficulty ?? 1;
    if (difficulty <= 4) return "Basico";
    if (difficulty <= 7) return "Intermedio";
    return "Avanzado";
  };

  const getDifficultyLabelFromNumber = (difficulty: number): 'Easy' | 'Medium' | 'Hard' => {
    if (difficulty <= 4) return 'Easy';
    if (difficulty <= 7) return 'Medium';
    return 'Hard';
  };

  const isMultipleQuestion =
    question?.type === "multiple" || question?.type === "listening" || question?.type === "grammar";

  const isWritingQuestion =
    question?.type === "writing";

  const isSpeakingQuestion =
    question?.type === "speaking";

  if (!question && questionsLoading) {
    return (
      <div className="min-h-screen gradient-hero relative overflow-hidden flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl">Cargando preguntas...</p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen gradient-hero relative overflow-hidden flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl">No hay preguntas disponibles para este nivel.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 px-6 py-2 bg-white text-sena-blue rounded-full font-medium"
          >
            Volver al panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-hero relative overflow-hidden">
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
            <BrandLogo height="h-9" boxed />
            <span className="text-white font-medium hidden sm:block">English Level Test SENA</span>
          </div>
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
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
            <span>Nivel {currentLevel}: pregunta {currentQuestion + 1} de {currentQuestions.length}</span>
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
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full">
            <Clock className={`w-5 h-5 ${timeLeft <= 10 ? 'text-destructive animate-pulse' : 'text-white'}`} />
            <span className={`font-bold text-lg ${timeLeft <= 10 ? 'text-destructive' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full">
            <Trophy className="w-5 h-5 text-warning" />
            <span className="font-bold text-lg text-white">{score}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-full">
            <Zap className="w-5 h-5 text-sena-green" />
            <span className="font-bold text-lg text-white">{userAnswers.filter(a => a.isCorrect).length}</span>
          </div>
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentLevel}-${currentQuestion}`}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -50, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Question Header */}
            <div className="px-6 lg:px-8 pt-6 lg:pt-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-sena-blue/10 text-sena-blue rounded-full text-sm font-medium">
                    {question.category}
                  </span>
                  <span className="px-3 py-1 bg-worklex-orange/10 text-worklex-orange-dark rounded-full text-sm font-medium">
                    {question.type === "multiple" ? "Opción Múltiple" :
                     question.type === "listening" ? "Comprensión Auditiva (Escucha)" :
                     question.type === "writing" ? "Escritura" :
                     question.type === "grammar" ? "Gramática" :
                     question.type === "speaking" ? "Pronunciación (Habla)" : "General"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {getDifficultyStars().map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{getDifficultyLabel()}</span>
                </div>
              </div>
              
              {/* Media Display - Compact */}
              {(() => {
                const currentQ = question;
                const hasImage = currentQ?.imageUrl;
                const hasAudio = currentQ?.audioUrl;

                if (!hasImage && !hasAudio) return null;

                return (
                  <div className="mb-4 rounded-3xl border border-border bg-muted/40 p-4">
                    {hasImage && (
                      <div className="w-full flex justify-center rounded-2xl overflow-hidden border border-border bg-white mb-3">
                        <img
                          src={currentQ.imageUrl!}
                          alt={currentQ?.question}
                          className="max-h-72 sm:max-h-80 w-auto max-w-full object-contain"
                          loading="eager"
                          decoding="async"
                          // @ts-expect-error fetchpriority es válido en navegadores modernos
                          fetchpriority="high"
                        />
                      </div>
                    )}
                    {hasAudio && (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Volume2 className="w-4 h-4 text-worklex-orange" />
                          <span className="text-xs font-medium text-worklex-orange-dark">Escucha el audio:</span>
                        </div>
                        <audio controls src={currentQ.audioUrl} className="w-full h-9" preload="auto">
                          Tu navegador no soporta audio.
                        </audio>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Question text */}
              <h2 className="text-xl font-bold text-foreground mb-2">{question.question}</h2>
              {question.prompt && (
                <p className="text-sm text-muted-foreground mb-4 italic">
                  {question.prompt}
                </p>
              )}
            </div>

            {/* Answer Options or Speaking/Writing Task */}
            {isSpeakingQuestion ? (
              <div className="px-6 lg:px-8 pb-6 lg:pb-8">
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
                    {isRecording ? <Square className="w-7 h-7 fill-current" /> : <Mic className="w-8 h-8" />}
                  </motion.button>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">
                      {isRecording ? "Grabando respuesta" : recordedAudioUrl ? "Audio listo para enviar" : "Pulsa para grabar"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Pronuncia la palabra claramente en inglés
                    </p>
                  </div>
                </div>
                {recordedAudioUrl && (
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-700 mb-2">Vista previa del audio:</p>
                    <audio controls src={recordedAudioUrl} className="w-full" />
                  </div>
                )}
                <button
                  onClick={handleSpeakingComplete}
                  disabled={answerState !== "idle" || !recordedAudioUrl}
                  className="w-full bg-sena-blue text-white p-5 rounded-2xl text-base font-medium transition hover:bg-sena-blue/90 disabled:cursor-not-allowed disabled:bg-muted"
                >
                  Enviar respuesta oral
                </button>
              </div>
            ) : isWritingQuestion ? (
              <div className="px-6 lg:px-8 pb-6 lg:pb-8">
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
                    rows={5}
                    className="w-full resize-none rounded-2xl border border-border bg-white p-4 text-slate-900 placeholder:text-slate-400 focus:border-sena-blue focus:outline-none focus:ring-2 focus:ring-sena-blue/20"
                    placeholder="Escribe tu respuesta en inglés aquí..."
                  />
                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <span>{writingAnswer.trim().split(/\s+/).filter(Boolean).length} palabras</span>
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
                  disabled={answerState !== "idle" || !writingAnswer.trim()}
                  className="mt-4 w-full bg-sena-blue text-white p-5 rounded-2xl text-base font-medium transition hover:bg-sena-blue/90 disabled:cursor-not-allowed disabled:bg-muted"
                >
                  Enviar respuesta escrita
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
                    answerState === "correct" || answerState === "submitted" ? "bg-sena-green" : "bg-destructive"
                  }`}
                >
                  {answerState === "correct" ? (
                    <div className="flex items-center justify-center gap-3">
                      <Trophy className="w-6 h-6" />
                      <span className="text-lg font-bold">¡Correcto! +1 punto</span>
                    </div>
                  ) : answerState === "submitted" && question.type === "writing" ? (
                    <div className="flex items-center justify-center gap-3 bg-sena-green">
                      <Trophy className="w-6 h-6" />
                      <span className="text-lg font-bold">
                        {userAnswers[userAnswers.length - 1]?.isCorrect 
                          ? "¡Palabra correcta! +1 punto" 
                          : `La palabra correcta es: ${question.wordText || question.wordId}`
                        }
                      </span>
                    </div>
                  ) : answerState === "submitted" && question.type === "speaking" ? (
                    <div className="flex items-center justify-center gap-3 bg-sena-green">
                      <Trophy className="w-6 h-6" />
                      <span className="text-lg font-bold">
                        {userAnswers[userAnswers.length - 1]?.isCorrect 
                          ? "¡Buena pronunciación! +1 punto" 
                          : "Pronunciación registrada para revisión"
                        }
                      </span>
                    </div>
                  ) : answerState === "submitted" ? (
                    <div className="flex items-center justify-center gap-3 bg-sena-green">
                      <Trophy className="w-6 h-6" />
                      <span className="text-lg font-bold">Respuesta guardada</span>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold mb-1">Incorrecto</p>
                      <p className="text-white/90 text-sm">
                        La respuesta correcta es: {question.options?.[question.correctAnswer ?? 0]}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pronunciation Feedback */}
            <AnimatePresence>
              {pronunciationResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 lg:px-8 py-5 bg-sena-blue/5 border-t border-sena-blue/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-sena-blue mb-1">Evaluacion de pronunciacion</p>
                      <p className="text-xs text-muted-foreground">
                        Precision: {pronunciationResult?.evaluation?.pronunciation_score ?? 0}% | Exactitud: {pronunciationResult?.evaluation?.accuracy ?? 0}% | Fluidez: {pronunciationResult?.evaluation?.fluency ?? 0}%
                      </p>
                      {pronunciationResult?.evaluation?.transcript && (
                        <p className="text-xs text-muted-foreground mt-1">Transcripcion: {pronunciationResult.evaluation.transcript}</p>
                      )}
                    </div>
                    <button onClick={() => setPronunciationResult(null)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                      <X size={16} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quiz Completion Feedback */}
            <AnimatePresence>
              {quizFeedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`px-6 lg:px-8 py-5 text-center text-white ${quizFeedback.passed ? "bg-sena-green" : "bg-destructive"}`}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Trophy className="w-6 h-6" />
                    <div>
                      <p className="text-lg font-bold">{quizFeedback.message}</p>
                      <p className="text-sm text-white/90">Porcentaje: {quizFeedback.percentage}%</p>
                    </div>
                  </div>
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
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="flex justify-center mb-4">
                <IconBadge tone="yellow" size="xl">
                  <X size={28} />
                </IconBadge>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Salir de la prueba?</h3>
              <p className="text-muted-foreground mb-6">
                Perderas todo tu progreso actual. Esta accion no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitConfirm(false)}
                  className="flex-1 py-3 bg-muted text-muted-foreground rounded-full font-medium hover:bg-muted/80 transition-colors"
                >
                  Continuar
                </button>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="flex-1 py-3 bg-destructive text-white rounded-full font-medium hover:bg-destructive/90 transition-colors"
                >
                  Salir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
}