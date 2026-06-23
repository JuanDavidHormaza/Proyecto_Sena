import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { Star, Clock, Trophy, Zap, X, GraduationCap } from "lucide-react";
import { questions, getDifficultyLevel, getLevelFromScore, getRandomQuestions, type Question } from "../data/questionsA1";
import * as api from "../services/api";

type AnswerState = "idle" | "correct" | "incorrect" | "submitted";

type QuestionType = "multiple" | "writing" | "speaking";

interface UserAnswer {
  questionId: number;
  question: string;
  difficulty: number;
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
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [selectedQuestions] = useState<Question[]>(() =>
    getRandomQuestions(9)
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [writingAnswer, setWritingAnswer] = useState<string>("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const progress = ((currentQuestion + 1) / selectedQuestions.length) * 100;
  const question = selectedQuestions[currentQuestion];
  const isSpeakingQuestion = question.type === "speaking";
  const isWritingQuestion = question.type === "writing";
  const isMultipleQuestion = question.type === "multiple";

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
      const finalScore = Math.round((score / selectedQuestions.length) * 100);
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
        total_questions: selectedQuestions.length,
        process,
        duration: "00:10:00",
      });
      const levelResult = getLevelFromScore(finalScore);
      localStorage.setItem("quizScore", finalScore.toString());
      localStorage.setItem("correctAnswers", score.toString());

      localStorage.setItem(
        "levelResult",
        JSON.stringify(levelResult)
      );

      if (levelResult.canAdvance) {
        localStorage.setItem("A2Unlocked", "true");
      }
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
    if (index === question.correctAnswer) {
      return "bg-sena-green";
    }
    if (index === selectedAnswer && answerState === "incorrect") {
      return "bg-destructive";
    }
    return "bg-muted-foreground/30";
  };

  const getDifficultyStars = () => {
    const level = getDifficultyLevel(question.difficulty);
    const count = level === "Easy" ? 1 : level === "Medium" ? 2 : 3;
    return Array(count).fill(0);
  };

  const getDifficultyLabel = () => {
    switch (getDifficultyLevel(question.difficulty)) {
      case "Easy": return "Basico";
      case "Medium": return "Intermedio";
      case "Hard": return "Avanzado";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-sena-blue via-sena-blue-light to-sena-green relative overflow-hidden">
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
            <span>Pregunta {currentQuestion + 1} de {selectedQuestions.length}</span>
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
            <Clock className={`w-5 h-5 ${timeLeft <= 10 ? 'text-destructive animate-pulse' : 'text-white'}`} />
            <span className={`font-bold text-lg ${timeLeft <= 10 ? 'text-destructive' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-xl">
            <Trophy className="w-5 h-5 text-warning" />
            <span className="font-bold text-lg text-white">{score}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-lg rounded-xl">
            <Zap className="w-5 h-5 text-sena-green" />
            <span className="font-bold text-lg text-white">{userAnswers.filter(a => a.isCorrect).length}</span>
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
              {isSpeakingQuestion && (
                <p className="text-sm text-muted-foreground mb-6">
                  Speak for 30 seconds out loud, then mark this task complete.
                </p>
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
                <div className="grid gap-3 mb-4 sm:grid-cols-2">
                  <button
                    onClick={handleStartRecording}
                    disabled={isRecording || answerState !== "idle"}
                    className="w-full bg-sena-blue text-white p-4 rounded-2xl font-medium transition hover:bg-sena-blue/90 disabled:cursor-not-allowed disabled:bg-muted"
                  >
                    {isRecording ? "Grabando..." : "Grabar audio"}
                  </button>
                  <button
                    onClick={handleStopRecording}
                    disabled={!isRecording}
                    className="w-full bg-sena-green text-white p-4 rounded-2xl font-medium transition hover:bg-sena-green/90 disabled:cursor-not-allowed disabled:bg-muted"
                  >
                    Detener grabación
                  </button>
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
                <textarea
                  value={writingAnswer}
                  onChange={(event) => setWritingAnswer(event.target.value)}
                  rows={6}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-slate-900 placeholder:text-slate-400 focus:border-sena-blue focus:ring-2 focus:ring-sena-blue/20"
                  placeholder="Write your response here..."
                />
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
                {question.options?.map((option: string, index: number) => (
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
                      <span className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
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
                  className={`px-6 lg:px-8 py-5 text-center text-white ${answerState === "correct" || answerState === "submitted" ? "bg-sena-green" : "bg-destructive"
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
                        La respuesta correcta es: {question.options?.[question.correctAnswer ?? 0]}
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
    </div>
  );
}
