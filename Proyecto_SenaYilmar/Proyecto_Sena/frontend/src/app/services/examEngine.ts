/**
 * ExamEngine / ProgressionService - Motor adaptativo unificado CEFR (A1 -> B2)
 *
 * Características:
 * 1. Un solo flujo adaptativo continuo: unifica A1, A2, B1 y B2 (tipo Duolingo).
 * 2. Evalúa las 4 competencias: Grammar, Reading, Writing (rúbrica semántica) y Speaking.
 * 3. Progresión basada en precisión, consistencia y dificultad (Fácil 1-3, Medio 4-6, Difícil 7-10).
 * 4. Desbloqueo progresivo: A1 -> A2 -> B1 -> B2.
 * 5. Genera métricas compatibles con TestResult (level_scores, speaking_score, writing_score, CEFR final).
 */

import { questionsA1 } from "../data/questionsA1";
import { questionsA2 } from "../data/questionsA2";
import { questionsB1 } from "../data/questionsB1";
import { questionsB2 } from "../data/questionsB2";

export type CEFRLevel = "A1" | "A2" | "B1" | "B2";
export type Competency = "Reading" | "Writing" | "Speaking" | "Listening";
export type DifficultyTier = "Easy" | "Medium" | "Hard";
export type QuestionType = "multiple" | "writing" | "speaking" | "listening";

export interface WritingRubric {
  minWords: number;
  keywords: string[];
  expectedTopics?: string[];
}

export interface UnifiedQuestion {
  id: number;
  uniqueKey: string;
  level: CEFRLevel;
  competency: Competency;
  type: QuestionType;
  question: string;
  prompt?: string;
  audio?: string;
  options?: string[];
  correctAnswer?: number;
  difficulty: number; // 1 a 10
  difficultyTier: DifficultyTier;
  category: string;
  rubric?: WritingRubric;
  wordId?: string;
  definition?: string;
  image?: string;
  isDictionaryTerm?: boolean;
}

export interface UserAnswerRecord {
  questionId: number;
  uniqueKey: string;
  question: string;
  level: CEFRLevel;
  competency: Competency;
  difficultyTier: DifficultyTier;
  difficultyNumber: number;
  type: QuestionType;
  userAnswer?: number;
  correctAnswer?: number;
  isCorrect: boolean;
  scoreAwarded: number; // 0 - 100
  writingAnswer?: string;
  audioUrl?: string;
  audioBlob?: Blob;
  rubricFeedback?: string;
  category: string;
  timestamp: number;
  wordId?: string;
  definition?: string;
  image?: string;
  isDictionaryTerm?: boolean;
  options?: string[];
}

export interface LevelStats {
  answered: number;
  correct: number;
  percentage: number;
  passed: boolean;
}

export interface ExamSessionState {
  currentLevel: CEFRLevel;
  unlockedLevels: CEFRLevel[];
  currentQuestion: UnifiedQuestion;
  currentQuestionIndexInLevel: number;
  totalQuestionsAnswered: number;
  streak: number;
  answers: UserAnswerRecord[];
  isCompleted: boolean;
  canAdvanceLevel: boolean;
}

export interface ExamFinalSummary {
  finalScore: number;
  finalLevel: string;
  character: string;
  correctAnswers: number;
  totalQuestions: number;
  speakingScore: number;
  writingScore: number;
  levelScores: Record<CEFRLevel, number>;
  competencyScores: Record<Competency, number>;
  answers: UserAnswerRecord[];
  masteredTerms: string[];
  reinforceTerms: Array<{ wordId: string; level: string; definition: string; audioUrl?: string }>;
  passed: boolean;
  duration: string;
  autoFeedback: string;
}

// Umbrales CEFR europeos para avanzar o certificar
export const LEVEL_PASS_THRESHOLDS: Record<CEFRLevel, number> = {
  A1: 60,
  A2: 60,
  B1: 65,
  B2: 70,
};

// Mapeo de dificultad 1-10 a tier
export function getDifficultyTier(diff: number): DifficultyTier {
  if (diff <= 3) return "Easy";
  if (diff <= 6) return "Medium";
  return "Hard";
}

// Función utilitaria para barajar arrays (Fisher-Yates)
export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function buildUnifiedQuestionBank(dictionaryQuestions?: any[]): UnifiedQuestion[] {
  const bank: UnifiedQuestion[] = [];

  // 0. Preguntas generadas dinámicamente desde DigitalDictionary (ADSO) con orden aleatorio
  if (dictionaryQuestions && Array.isArray(dictionaryQuestions)) {
    const shuffledDict = shuffleArray(dictionaryQuestions);
    shuffledDict.forEach((dq, idx) => {
      const diff = dq.difficulty || (dq.level === 'A1' ? 2 : dq.level === 'A2' ? 4 : dq.level === 'B1' ? 6 : 8);
      bank.push({
        id: dq.id || 9000 + idx,
        uniqueKey: dq.uniqueKey || `DICT-${dq.level || 'A1'}-${dq.id || idx}`,
        level: (dq.level || 'A1') as CEFRLevel,
        competency: (dq.competency && dq.competency !== 'Grammar' ? dq.competency : 'Reading') as Competency,
        type: (dq.type || 'multiple') as QuestionType,
        question: dq.question,
        prompt: dq.prompt,
        audio: dq.audio,
        options: dq.options,
        correctAnswer: dq.correctAnswer,
        difficulty: diff,
        difficultyTier: dq.difficultyTier || getDifficultyTier(diff),
        category: dq.category || `ADSO Vocabulario - ${dq.wordId || 'Técnico'}`,
        rubric: dq.rubric,
        wordId: dq.wordId,
        definition: dq.definition,
        image: dq.image,
        isDictionaryTerm: true,
      });
    });
  }

  // 1. Preguntas A1 (Fundamentos y ADSO) con orden aleatorio
  shuffleArray(questionsA1).forEach((q, idx) => {
    const diff = q.difficulty || 2;
    bank.push({
      id: q.id,
      uniqueKey: `A1-${q.id}-${idx}`,
      level: "A1",
      competency: "Reading",
      type: "multiple",
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer ?? 0,
      difficulty: diff,
      difficultyTier: getDifficultyTier(diff),
      category: q.category,
    });
  });

  // 2. Preguntas A2 (Gramática, Vocabulario y ADSO Workflow) con orden aleatorio
  shuffleArray(questionsA2).forEach((q, idx) => {
    const diff = (q as any).points ? 4 : 3;
    const cat = q.category || "General";
    let comp: Competency = "Reading";
    if (q.skill === "reading" || cat.includes("Reading")) comp = "Reading";

    bank.push({
      id: q.id,
      uniqueKey: `A2-${q.id}-${idx}`,
      level: "A2",
      competency: comp,
      type: "multiple",
      question: q.question,
      options: q.options || [],
      correctAnswer: q.correctAnswer ?? 0,
      difficulty: diff,
      difficultyTier: getDifficultyTier(diff),
      category: cat,
    });
  });

  // 3. Preguntas B1 con orden aleatorio
  shuffleArray(questionsB1).forEach((q, idx) => {
    const diff = q.difficulty || 5;
    let comp: Competency = "Reading";
    if (q.skill === "reading" || q.category.includes("Reading")) comp = "Reading";
    if (q.type === "writing") comp = "Writing";
    if (q.type === "speaking") comp = "Speaking";
    if (q.type === "listening") comp = "Listening";

    const rubric: WritingRubric | undefined = q.type === "writing" ? {
      minWords: 25,
      keywords: ["daily", "work", "routine", "usually", "always", "code", "study", "project"],
    } : undefined;

    bank.push({
      id: q.id,
      uniqueKey: `B1-${q.id}-${idx}`,
      level: "B1",
      competency: comp,
      type: q.type as QuestionType,
      question: q.question,
      prompt: q.prompt,
      audio: q.audio,
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: diff,
      difficultyTier: getDifficultyTier(diff),
      category: q.category,
      rubric,
    });
  });

  // Agregar pregunta Speaking B1 dedicada si no existe
  if (!bank.some((q) => q.level === "B1" && q.type === "speaking")) {
    bank.push({
      id: 102,
      uniqueKey: "B1-speaking-102",
      level: "B1",
      competency: "Speaking",
      type: "speaking",
      question: "Explain how you solved a technical problem recently.",
      prompt: "Record a short spoken answer (15-45 seconds) describing a problem and your solution in English.",
      difficulty: 6,
      difficultyTier: "Medium",
      category: "ADSO - Technical Speaking",
    });
  }

  // 4. Preguntas B2 (Avanzado, Arquitectura, Writing Incident Report y Speaking Cybersecurity)
  questionsB2.forEach((q, idx) => {
    const diff = q.difficulty || 8;
    let comp: Competency = "Reading";
    if (q.skill === "reading" || q.category.includes("Cybersecurity") || q.category.includes("Architecture")) {
      comp = "Reading";
    }
    if (q.type === "writing") comp = "Writing";
    if (q.type === "speaking") comp = "Speaking";
    if (q.type === "listening") comp = "Listening";

    bank.push({
      id: q.id,
      uniqueKey: `B2-${q.id}-${idx}`,
      level: "B2",
      competency: comp,
      type: q.type as QuestionType,
      question: q.question,
      prompt: q.prompt,
      audio: q.audio,
      options: q.options,
      correctAnswer: q.correctAnswer,
      difficulty: diff,
      difficultyTier: getDifficultyTier(diff),
      category: q.category,
    });
  });

  // Agregar Writing B2 profesional (Incident Report)
  if (!bank.some((q) => q.level === "B2" && q.type === "writing")) {
    bank.push({
      id: 41,
      uniqueKey: "B2-writing-41",
      level: "B2",
      competency: "Writing",
      type: "writing",
      question: "Write an Incident Report for a software defect in production.",
      prompt: "Describe the root cause, immediate impact on users, and the resolution plan (at least 35 words).",
      difficulty: 8,
      difficultyTier: "Hard",
      category: "ADSO - Incident Management",
      rubric: {
        minWords: 35,
        keywords: ["incident", "server", "error", "bug", "impact", "solution", "patch", "users", "database", "fix"],
      },
    });
  }

  // Agregar Speaking B2 profesional (Cybersecurity Recommendation)
  if (!bank.some((q) => q.level === "B2" && q.type === "speaking")) {
    bank.push({
      id: 42,
      uniqueKey: "B2-speaking-42",
      level: "B2",
      competency: "Speaking",
      type: "speaking",
      question: "Present a security recommendation for software deployment.",
      prompt: "Record a spoken recommendation for your team about secure coding and password policy (20-60 seconds).",
      difficulty: 8,
      difficultyTier: "Hard",
      category: "ADSO - Cybersecurity Recommendation",
    });
  }

  return bank;
}

/**
 * Evaluación semántica basada en rúbrica para respuestas abiertas de Writing.
 */
export function evaluateWritingSubmission(
  answerText: string,
  rubric?: WritingRubric,
  targetWord?: string
): { score: number; isCorrect: boolean; feedback: string } {
  const text = (answerText || "").trim();
  if (!text) {
    return { score: 0, isCorrect: false, feedback: "No se proporcionó respuesta escrita." };
  }

  const lower = text.toLowerCase();
  const cleanedTarget = (targetWord || "").toLowerCase().trim();

  // 1. Coincidencia léxica exacta o frase directa (100% de puntaje)
  if (cleanedTarget && (lower === cleanedTarget || lower === `the ${cleanedTarget}` || lower === `a ${cleanedTarget}` || lower === `an ${cleanedTarget}`)) {
    return {
      score: 100,
      isCorrect: true,
      feedback: `¡Excelente! Coincidencia léxica exacta con el término técnico "${targetWord}".`,
    };
  }

  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const minRequired = rubric?.minWords || 15;

  // 2. Coincidencia de palabras clave y término objetivo (hasta 50%)
  let keywordPoints = 0;
  const allKeywords = [...(rubric?.keywords || [])];
  if (cleanedTarget && !allKeywords.some((k) => k.toLowerCase() === cleanedTarget)) {
    allKeywords.push(cleanedTarget);
  }

  if (allKeywords.length > 0) {
    const matched = allKeywords.filter((kw) => lower.includes(kw.toLowerCase()));
    const matchRatio = Math.min(matched.length / Math.max(allKeywords.length * 0.4, 1), 1.0);
    keywordPoints = Math.round(matchRatio * 50);
  } else {
    keywordPoints = 30;
  }

  // 3. Longitud de la redacción técnica (hasta 35%)
  const lengthRatio = Math.min(wordCount / minRequired, 1.0);
  const lengthPoints = Math.round(lengthRatio * 35);

  // 4. Estructura y signos básicos (hasta 15%)
  const hasCapital = /^[A-Z]/.test(text);
  const hasPunctuation = /[.!?]$/.test(text);
  const structurePoints = (hasCapital ? 8 : 0) + (hasPunctuation ? 7 : 0);

  const totalScore = Math.min(lengthPoints + keywordPoints + structurePoints, 100);
  const isCorrect = totalScore >= 55;

  let feedback = `Palabras ingresadas: ${wordCount}/${minRequired}. `;
  if (isCorrect) {
    feedback += `Buen uso de vocabulario y estructura técnica (${totalScore}%).`;
  } else {
    feedback += `Se recomienda incluir el término "${targetWord || 'técnico'}" y ampliar la explicación técnica en inglés (${totalScore}%).`;
  }

  return { score: totalScore, isCorrect, feedback };
}

/**
 * Motor de Examen Adaptativo Unificado WorkLex
 */
export class ExamEngine {
  private allQuestions: UnifiedQuestion[];
  private answers: UserAnswerRecord[] = [];
  private currentLevel: CEFRLevel = "A1";
  private unlockedLevels: CEFRLevel[] = ["A1"];
  private currentQuestionIndex = 0;
  private currentLevelQuestionList: UnifiedQuestion[] = [];
  private streak = 0;
  private isFinished = false;

  private readonly QUESTIONS_PER_LEVEL = 6; // Cantidad adaptativa óptima por nivel

  constructor(customBank?: UnifiedQuestion[]) {
    this.allQuestions = customBank || buildUnifiedQuestionBank();
    this.prepareLevelQuestions("A1");
  }

  /**
   * Carga o actualiza preguntas dinámicas desde el backend de DigitalDictionary
   */
  public loadDictionaryQuestions(dictQuestions: any[]) {
    if (!dictQuestions || !Array.isArray(dictQuestions) || dictQuestions.length === 0) return;
    this.allQuestions = buildUnifiedQuestionBank(dictQuestions);
    this.prepareLevelQuestions(this.currentLevel);
  }

  private prepareLevelQuestions(level: CEFRLevel) {
    this.currentLevel = level;
    if (!this.unlockedLevels.includes(level)) {
      this.unlockedLevels.push(level);
    }

    // Filtrar preguntas del nivel y dar prioridad activa a los términos del Diccionario ADSO de forma aleatoria
    const levelPool = this.allQuestions.filter((q) => q.level === level);
    const dictPool = shuffleArray(levelPool.filter((q) => q.isDictionaryTerm));
    const basePool = shuffleArray(levelPool.filter((q) => !q.isDictionaryTerm));

    const selected: UnifiedQuestion[] = [];

    // Priorizar variedad de competencias desde el Diccionario ADSO de forma aleatoria
    const dictListening = shuffleArray(dictPool.filter((q) => q.competency === "Listening"));
    const dictSpeaking = shuffleArray(dictPool.filter((q) => q.type === "speaking" || q.competency === "Speaking"));
    const dictWriting = shuffleArray(dictPool.filter((q) => q.type === "writing" || q.competency === "Writing"));
    const dictReading = shuffleArray(dictPool.filter((q) => q.competency === "Reading"));

    if (dictListening.length > 0) selected.push(dictListening[0]);
    if (dictSpeaking.length > 0) selected.push(dictSpeaking[0]);
    if (dictWriting.length > 0) selected.push(dictWriting[0]);
    if (dictReading.length > 0 && !selected.some((s) => s.uniqueKey === dictReading[0].uniqueKey)) {
      selected.push(dictReading[0]);
    }

    // Si aún faltan preguntas para el cupo del nivel, completar con el pool combinado barajado
    const combinedFallback = shuffleArray([...dictPool, ...basePool]);
    for (const q of combinedFallback) {
      if (selected.length >= this.QUESTIONS_PER_LEVEL) break;
      if (!selected.some((s) => s.uniqueKey === q.uniqueKey)) {
        selected.push(q);
      }
    }

    // Barajar aleatoriamente la lista de preguntas para que cada sesión y nivel comience con una pregunta distinta
    const randomizedQuestions = shuffleArray(selected);
    randomizedQuestions.sort(() => Math.random() - 0.5);

    this.currentLevelQuestionList = randomizedQuestions;
    this.currentQuestionIndex = 0;
  }

  public getCurrentQuestion(): UnifiedQuestion | null {
    if (this.isFinished) return null;
    return this.currentLevelQuestionList[this.currentQuestionIndex] || null;
  }

  public getSessionState(): ExamSessionState {
    const q = this.getCurrentQuestion();
    return {
      currentLevel: this.currentLevel,
      unlockedLevels: [...this.unlockedLevels],
      currentQuestion: q || this.currentLevelQuestionList[0],
      currentQuestionIndexInLevel: this.currentQuestionIndex,
      totalQuestionsAnswered: this.answers.length,
      streak: this.streak,
      answers: [...this.answers],
      isCompleted: this.isFinished,
      canAdvanceLevel: this.checkCanAdvanceCurrentLevel(),
    };
  }

  /**
   * Registra una respuesta de opción múltiple o listening
   */
  public submitMultipleChoiceAnswer(optionIndex: number): UserAnswerRecord {
    const q = this.getCurrentQuestion();
    if (!q) throw new Error("No hay pregunta activa.");

    const isCorrect = optionIndex === q.correctAnswer;
    if (isCorrect) {
      this.streak += 1;
    } else {
      this.streak = 0;
    }

    const record: UserAnswerRecord = {
      questionId: q.id,
      uniqueKey: q.uniqueKey,
      question: q.question,
      level: q.level,
      competency: q.competency,
      difficultyTier: q.difficultyTier,
      difficultyNumber: q.difficulty,
      type: q.type,
      userAnswer: optionIndex,
      correctAnswer: q.correctAnswer,
      isCorrect,
      scoreAwarded: isCorrect ? 100 : 0,
      category: q.category,
      timestamp: Date.now(),
      wordId: q.wordId,
      definition: q.definition,
      image: q.image,
      isDictionaryTerm: q.isDictionaryTerm,
      options: q.options,
    };

    this.answers.push(record);
    return record;
  }

  /**
   * Registra una respuesta de escritura con rúbrica semántica
   */
  public submitWritingAnswer(text: string): UserAnswerRecord {
    const q = this.getCurrentQuestion();
    if (!q) throw new Error("No hay pregunta activa.");

    const evalResult = evaluateWritingSubmission(text, q.rubric, q.wordId);
    if (evalResult.isCorrect) {
      this.streak += 1;
    } else {
      this.streak = 0;
    }

    const record: UserAnswerRecord = {
      questionId: q.id,
      uniqueKey: q.uniqueKey,
      question: q.question,
      level: q.level,
      competency: "Writing",
      difficultyTier: q.difficultyTier,
      difficultyNumber: q.difficulty,
      type: "writing",
      isCorrect: evalResult.isCorrect,
      scoreAwarded: evalResult.score,
      writingAnswer: text,
      rubricFeedback: evalResult.feedback,
      category: q.category,
      timestamp: Date.now(),
      wordId: q.wordId,
      definition: q.definition,
      image: q.image,
      isDictionaryTerm: q.isDictionaryTerm,
    };

    this.answers.push(record);
    return record;
  }

  /**
   * Registra una respuesta de speaking con audio URL / Blob y evaluación pedagógica
   */
  public submitSpeakingAnswer(
    audioUrl: string,
    audioBlob?: Blob,
    evaluation?: { score?: number; isCorrect?: boolean; feedback?: string; transcription?: string }
  ): UserAnswerRecord {
    const q = this.getCurrentQuestion();
    if (!q) throw new Error("No hay pregunta activa.");

    const score = evaluation?.score !== undefined ? evaluation.score : 100;
    const isCorrect = evaluation?.isCorrect !== undefined ? evaluation.isCorrect : score >= 70;

    if (isCorrect) {
      this.streak += 1;
    } else {
      this.streak = 0;
    }

    const record: UserAnswerRecord = {
      questionId: q.id,
      uniqueKey: q.uniqueKey,
      question: q.question,
      level: q.level,
      competency: "Speaking",
      difficultyTier: q.difficultyTier,
      difficultyNumber: q.difficulty,
      type: "speaking",
      isCorrect,
      scoreAwarded: score,
      audioUrl,
      audioBlob,
      rubricFeedback: evaluation?.feedback || (isCorrect ? "Pronunciación correcta superó el umbral requerido." : "Pronunciación requiere mayor claridad."),
      category: q.category,
      timestamp: Date.now(),
      wordId: q.wordId,
      definition: q.definition,
      image: q.image,
      isDictionaryTerm: q.isDictionaryTerm,
    };

    this.answers.push(record);
    return record;
  }

  /**
   * Calcula estadísticas del nivel actual
   */
  public getCurrentLevelStats(): LevelStats {
    const levelAnswers = this.answers.filter((a) => a.level === this.currentLevel);
    const answered = levelAnswers.length;
    const correct = levelAnswers.filter((a) => a.isCorrect).length;
    const percentage = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const threshold = LEVEL_PASS_THRESHOLDS[this.currentLevel] || 60;
    const passed = percentage >= threshold;

    return { answered, correct, percentage, passed };
  }

  private checkCanAdvanceCurrentLevel(): boolean {
    const stats = this.getCurrentLevelStats();
    return stats.answered >= this.currentLevelQuestionList.length && stats.passed;
  }

  /**
   * Avanza a la siguiente pregunta o nivel adaptativamente.
   * Retorna 'next_question' | 'level_up' | 'exam_completed'.
   */
  public nextStep(): "next_question" | "level_up" | "exam_completed" {
    // Si aún hay preguntas dentro del nivel actual
    if (this.currentQuestionIndex + 1 < this.currentLevelQuestionList.length) {
      this.currentQuestionIndex += 1;
      return "next_question";
    }

    // Fin de preguntas del nivel actual -> evaluar si aprueba y avanza de nivel
    const stats = this.getCurrentLevelStats();
    const levelsOrder: CEFRLevel[] = ["A1", "A2", "B1", "B2"];
    const currentIdx = levelsOrder.indexOf(this.currentLevel);

    // Si aprobó y aún hay niveles superiores disponibles
    if (stats.passed && currentIdx < levelsOrder.length - 1) {
      const nextLevel = levelsOrder[currentIdx + 1];
      this.prepareLevelQuestions(nextLevel);
      return "level_up";
    }

    // Si reprobó o terminó B2 -> examen finalizado
    this.isFinished = true;
    return "exam_completed";
  }

  /**
   * Genera el resumen final del examen compatible con TestResult
   */
  public generateFinalSummary(elapsedSeconds = 0): ExamFinalSummary {
    const totalAnswered = this.answers.length;
    const correctCount = this.answers.filter((a) => a.isCorrect).length;

    // Calcular puntajes por nivel CEFR
    const levelScores: Record<CEFRLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0 };
    (["A1", "A2", "B1", "B2"] as CEFRLevel[]).forEach((lvl) => {
      const lvlAnswers = this.answers.filter((a) => a.level === lvl);
      if (lvlAnswers.length > 0) {
        const correct = lvlAnswers.filter((a) => a.isCorrect).length;
        levelScores[lvl] = Math.round((correct / lvlAnswers.length) * 100);
      }
    });

    // Calcular puntajes por competencia (4 macro-habilidades oficiales)
    const compScores: Record<Competency, number> = {
      Reading: 0,
      Writing: 0,
      Speaking: 0,
      Listening: 0,
    };
    (["Reading", "Writing", "Speaking", "Listening"] as Competency[]).forEach((c) => {
      const cAnswers = this.answers.filter((a) => a.competency === c);
      if (cAnswers.length > 0) {
        const sum = cAnswers.reduce((acc, curr) => acc + curr.scoreAwarded, 0);
        compScores[c] = Math.round(sum / cAnswers.length);
      }
    });

    // Ponderación global (0-100)
    const overallScore = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    // Nivel final alcanzado (no asignar A1 por defecto si no respondió o abandonó)
    let finalLevel: string = "Sin Nivel";
    if (totalAnswered === 0 || (correctCount === 0 && overallScore === 0)) {
      finalLevel = "Sin Nivel";
    } else if (levelScores.B2 >= LEVEL_PASS_THRESHOLDS.B2) {
      finalLevel = "B2";
    } else if (levelScores.B1 >= LEVEL_PASS_THRESHOLDS.B1) {
      finalLevel = "B1";
    } else if (levelScores.A2 >= LEVEL_PASS_THRESHOLDS.A2) {
      finalLevel = "A2";
    } else if (overallScore >= 20 || correctCount > 0) {
      finalLevel = "A1";
    } else {
      finalLevel = "Sin Nivel";
    }

    const passed = finalLevel !== "Sin Nivel" && overallScore >= (LEVEL_PASS_THRESHOLDS[finalLevel as CEFRLevel] || 60);

    // Character descriptivo
    let character = "No Presentado";
    if (finalLevel === "B2") character = "Experto";
    else if (finalLevel === "B1") character = "Avanzado";
    else if (finalLevel === "A2") character = "Intermedio";
    else if (finalLevel === "A1") character = "Principiante";

    // Duración formateada MM:SS
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    const duration = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    // Speaking y writing scores específicos
    const speakingAnswers = this.answers.filter((a) => a.type === "speaking");
    const speakingScore = speakingAnswers.length > 0 ? compScores.Speaking : 0;

    const writingAnswers = this.answers.filter((a) => a.type === "writing");
    const writingScore = writingAnswers.length > 0 ? compScores.Writing : 0;

    // Términos del Diccionario ADSO dominados y recomendados para reforzar
    const masteredTermsSet = new Set<string>();
    const reinforceTermsMap = new Map<string, { wordId: string; level: string; definition: string; audioUrl?: string }>();

    this.answers.forEach((ans) => {
      const q = this.allQuestions.find((item) => item.uniqueKey === ans.uniqueKey);
      const wId = ans.wordId || q?.wordId;
      if (wId) {
        if (ans.isCorrect) {
          masteredTermsSet.add(wId);
        } else {
          reinforceTermsMap.set(wId, {
            wordId: wId,
            level: ans.level,
            definition: ans.definition || q?.definition || ans.question,
            audioUrl: q?.audio,
          });
        }
      }
    });

    const masteredTerms = Array.from(masteredTermsSet);
    const reinforceTerms = Array.from(reinforceTermsMap.values()).filter((t) => !masteredTermsSet.has(t.wordId));

    // Feedback automático
    const feedbackLines = [
      `Resultado global: ${overallScore}% en nivel CEFR ${finalLevel} (${character}).`,
      `Competencias: Lectura ${compScores.Reading}%, Escritura ${compScores.Writing}%, Habla ${compScores.Speaking}%, Escucha ${compScores.Listening}%.`,
      `Términos técnicos ADSO dominados: ${masteredTerms.length}.`,
    ];
    if (reinforceTerms.length > 0) {
      feedbackLines.push(`Términos a reforzar: ${reinforceTerms.map(t => t.wordId).join(", ")}.`);
    }
    if (passed) {
      feedbackLines.push(`¡Felicitaciones! Has demostrado dominio satisfactorio en el nivel ${finalLevel}.`);
    } else {
      feedbackLines.push(`Continúa practicando los conceptos técnicos ADSO y vocabulario en el Espacio de Estudio para consolidar el nivel ${finalLevel}.`);
    }

    return {
      finalScore: overallScore,
      finalLevel,
      character,
      correctAnswers: correctCount,
      totalQuestions: totalAnswered,
      speakingScore,
      writingScore,
      levelScores,
      competencyScores: compScores,
      answers: this.answers,
      masteredTerms,
      reinforceTerms,
      passed,
      duration,
      autoFeedback: feedbackLines.join(" "),
    };
  }
}
