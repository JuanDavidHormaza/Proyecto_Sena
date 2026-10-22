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
  userAnswerText?: string;
  correctAnswerText?: string;
  isUnanswered?: boolean;
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

  // 0. Preguntas generadas dinámicamente desde DigitalDictionary con orden aleatorio (restringido a A1-B2)
  if (dictionaryQuestions && Array.isArray(dictionaryQuestions)) {
    const validDict = dictionaryQuestions.filter((dq) => {
      const lvl = String(dq?.level || "").toUpperCase();
      return lvl !== "C1" && lvl !== "C2";
    });
    const shuffledDict = shuffleArray(validDict);
    shuffledDict.forEach((dq, idx) => {
      const diff = dq.difficulty || (dq.level === 'A1' ? 2 : dq.level === 'A2' ? 4 : dq.level === 'B1' ? 6 : 8);

      let comp: Competency = "Reading";
      const cat = (dq.category || "").toLowerCase();
      const rawComp = (dq.competency || dq.competence || "").toLowerCase();
      const qText = (dq.question || "").toLowerCase();

      // FASE 1: Reclasificación pedagógica oficial SENA
      // READING = Vocabulario técnico, definiciones conceptuales ("What technical term..."), comprensión lectora
      // WRITING = Gramática, sintaxis (Sentence Ordering), morfología en contexto, sinónimos técnicos
      if (
        dq.type === "writing" ||
        rawComp === "writing" ||
        cat.includes("writing") ||
        cat.includes("sintaxis") ||
        cat.includes("morfología") ||
        cat.includes("morfol") ||
        cat.includes("sinónimo") ||
        cat.includes("synonym") ||
        qText.includes("order the sentence") ||
        qText.includes("correct grammatical form") ||
        qText.includes("which technical synonym")
      ) {
        comp = "Writing";
      } else if (dq.type === "speaking" || rawComp.includes("speak") || cat.includes("speaking")) {
        comp = "Speaking";
      } else if (dq.type === "listening" || rawComp.includes("listen") || cat.includes("listening")) {
        comp = "Listening";
      } else {
        comp = "Reading";
      }

      bank.push({
        id: dq.id || 9000 + idx,
        uniqueKey: dq.uniqueKey || `DICT-${dq.level || 'A1'}-${dq.id || idx}`,
        level: (dq.level || 'A1') as CEFRLevel,
        competency: comp,
        type: (dq.type || 'multiple') as QuestionType,
        question: dq.question,
        prompt: dq.prompt,
        audio: dq.audio,
        options: dq.options,
        correctAnswer: dq.correctAnswer,
        difficulty: diff,
        difficultyTier: dq.difficultyTier || getDifficultyTier(diff),
        category: dq.category || `${comp} - Vocabulario Técnico`,
        rubric: dq.rubric,
        wordId: dq.wordId || dq.word,
        definition: dq.definition,
        image: dq.image,
        isDictionaryTerm: true,
      });
    });

    if (bank.length > 0) {
      return bank;
    }
  }

  // 1. Preguntas A1 (Fundamentos y Vocabulario Técnico -> Reading) con orden aleatorio
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
      category: `${q.category || "ADSO"} Reading - Vocabulario`,
    });
  });

  // 2. Preguntas A2 (Gramática/Sintaxis -> Writing, Vocabulario -> Reading) con orden aleatorio
  shuffleArray(questionsA2).forEach((q, idx) => {
    const diff = (q as any).points ? 4 : 3;
    const cat = q.category || "General";
    let comp: Competency = "Reading";
    if ((q as any).skill === "grammar" || cat.toLowerCase().includes("grammar") || cat.toLowerCase().includes("workflow")) {
      comp = "Writing";
    } else {
      comp = "Reading";
    }

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
      category: `${cat} ${comp === "Writing" ? "Writing - Gramática" : "Reading - Vocabulario"}`,
    });
  });

  // 3. Preguntas B1 con orden aleatorio
  shuffleArray(questionsB1).forEach((q, idx) => {
    const diff = q.difficulty || 5;
    let comp: Competency = "Reading";
    if (q.skill === "grammar" || q.type === "writing" || q.category.toLowerCase().includes("grammar")) {
      comp = "Writing";
    } else if (q.type === "speaking" || q.skill === "speaking") {
      comp = "Speaking";
    } else if (q.type === "listening" || q.skill === "listening") {
      comp = "Listening";
    } else {
      comp = "Reading";
    }

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
    if (q.type === "writing" || q.skill === "grammar" || q.category.toLowerCase().includes("grammar")) {
      comp = "Writing";
    } else if (q.type === "speaking") {
      comp = "Speaking";
    } else if (q.type === "listening") {
      comp = "Listening";
    } else {
      comp = "Reading";
    }

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

  return bank.filter((q) => {
    const lvl = String(q.level || "").toUpperCase();
    return lvl !== "C1" && lvl !== "C2";
  });
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
 * Evalúa con precisión y tolerancia a formato si la opción seleccionada es la correcta:
 * - Soporta índices numéricos o representados como string ("0", "1").
 * - Soporta comparación de texto de la opción con normalización de mayúsculas,
 *   espacios en blanco múltiples y signos de puntuación terminales.
 * - Soporta ordenamiento de oraciones (Sentence Ordering).
 * - Soporta cotejo contra correctAnswer, correctAnswerText y wordId.
 */
export function isOptionAnswerCorrect(
  optionIndex: number,
  question: UnifiedQuestion
): boolean {
  const opts = question.options || [];
  if (optionIndex < 0 || optionIndex >= opts.length) {
    return false;
  }

  // 1. Comparación por índice numérico o string numérico ("0", "1")
  if (typeof question.correctAnswer === "number" && optionIndex === question.correctAnswer) {
    return true;
  }
  if (
    typeof question.correctAnswer === "string" &&
    !isNaN(Number(question.correctAnswer)) &&
    optionIndex === Number(question.correctAnswer)
  ) {
    return true;
  }

  // 2. Normalización de cadenas para comparación flexible (espacios, mayúsculas, puntuación)
  const norm = (s: any): string =>
    String(s ?? "")
      .trim()
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .replace(/\s+/g, " ");

  const selectedText = norm(opts[optionIndex]);

  // Si correctAnswer es el texto de la opción (ej. en Sentence Ordering)
  if (typeof question.correctAnswer === "string") {
    const expected = norm(question.correctAnswer);
    if (selectedText === expected && selectedText.length > 0) {
      return true;
    }
  }

  // Si existe correctAnswerText
  if (question.correctAnswerText) {
    const expected = norm(question.correctAnswerText);
    if (selectedText === expected && selectedText.length > 0) {
      return true;
    }
  }

  // Si coincide con wordId
  if (question.wordId) {
    const expected = norm(question.wordId);
    if (selectedText === expected && selectedText.length > 0) {
      return true;
    }
  }

  return false;
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
  private isInitialized = false;

  private readonly QUESTIONS_PER_LEVEL = 6; // Cantidad adaptativa óptima por nivel

  constructor(customBank?: UnifiedQuestion[]) {
    this.allQuestions = customBank || buildUnifiedQuestionBank();
    this.prepareLevelQuestions("A1");
  }

  /**
   * Inicializa o fija el banco adaptativo de manera inmutable para la sesión actual
   */
  public initialize(dictQuestions?: any[]) {
    if (this.isInitialized) return;
    this.allQuestions = buildUnifiedQuestionBank(dictQuestions);
    this.prepareLevelQuestions("A1");
    this.isInitialized = true;
  }

  /**
   * Carga o actualiza preguntas dinámicas desde el backend de DigitalDictionary
   */
  public loadDictionaryQuestions(dictQuestions: any[]) {
    if (!dictQuestions || !Array.isArray(dictQuestions) || dictQuestions.length === 0) return;
    if (this.isInitialized) return;
    this.allQuestions = buildUnifiedQuestionBank(dictQuestions);
    this.prepareLevelQuestions(this.currentLevel);
    this.isInitialized = true;
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

    if (selected.length < this.QUESTIONS_PER_LEVEL && dictPool.length > 0) {
      let cycleIdx = 0;
      while (selected.length < this.QUESTIONS_PER_LEVEL && cycleIdx < dictPool.length * 3) {
        const item = dictPool[cycleIdx % dictPool.length];
        selected.push({ ...item, uniqueKey: `${item.uniqueKey}-rep-${selected.length}` });
        cycleIdx++;
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

    const opts = q.options || [];
    const isAnswered = optionIndex >= 0 && optionIndex < opts.length;
    const isCorrect = isAnswered && isOptionAnswerCorrect(optionIndex, q);
    if (isCorrect) {
      this.streak += 1;
    } else {
      this.streak = 0;
    }

    const userAnsText = isAnswered ? opts[optionIndex] : "INCORRECTO / SIN RESPONDER";
    const correctAnsText = (q.correctAnswer !== undefined && typeof q.correctAnswer === "number" && q.correctAnswer >= 0 && q.correctAnswer < opts.length)
      ? opts[q.correctAnswer]
      : (q.correctAnswerText || q.wordId || (typeof q.correctAnswer === "string" ? q.correctAnswer : "Respuesta correcta"));

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
      userAnswerText: userAnsText,
      correctAnswerText: correctAnsText,
      isUnanswered: !isAnswered,
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

    const userText = text && text.trim() ? text.trim() : "INCORRECTO / SIN RESPONDER";
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
      userAnswerText: userText,
      correctAnswerText: q.prompt || q.wordId || "Rúbrica de redacción técnica",
      isUnanswered: !text || !text.trim(),
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

    const userText = evaluation?.transcription || (audioUrl ? "Audio grabado por el aprendiz" : "INCORRECTO / SIN RESPONDER");
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
      userAnswerText: userText,
      correctAnswerText: q.wordId || q.question || "Término en inglés",
      isUnanswered: !audioUrl && !evaluation?.transcription,
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

    // Ponderación por macro-habilidades activas en este nivel
    const levelComps = (["Reading", "Writing", "Speaking", "Listening"] as Competency[]).filter(
      (c) => levelAnswers.some((a) => a.competency === c)
    );

    let percentage = 0;
    if (levelComps.length > 0) {
      const compPercentages = levelComps.map((c) => {
        const answersInComp = levelAnswers.filter((a) => a.competency === c);
        const sumScores = answersInComp.reduce((acc, curr) => acc + curr.scoreAwarded, 0);
        return sumScores / answersInComp.length;
      });
      percentage = Math.round(compPercentages.reduce((a, b) => a + b, 0) / levelComps.length);
    } else {
      percentage = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    }

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
  public generateFinalSummary(elapsedSeconds = 0, isAbandoned = false): ExamFinalSummary {
    const totalAnswered = this.answers.length;
    const correctCount = this.answers.filter((a) => a.isCorrect).length;
    const plannedLevelQuestions = Math.max(this.currentLevelQuestionList.length, this.QUESTIONS_PER_LEVEL);
    const effectiveTotalQuestions = isAbandoned ? Math.max(plannedLevelQuestions, totalAnswered) : Math.max(totalAnswered, 1);

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

    // Ponderación global por HABILIDAD (Listening, Speaking, Reading, Writing):
    // Evita que un solo fallo en una categoría suelta de 1 pregunta hunda el resultado (ej. 58%),
    // el puntaje global es la media ponderada de las macro-habilidades evaluadas.
    const activeCompetencies = (["Reading", "Writing", "Speaking", "Listening"] as Competency[]).filter(
      (c) => this.answers.some((a) => a.competency === c)
    );

    let overallScore = 0;
    if (activeCompetencies.length > 0) {
      const sumComp = activeCompetencies.reduce((acc, c) => acc + compScores[c], 0);
      overallScore = Math.round(sumComp / activeCompetencies.length);
    } else {
      overallScore = effectiveTotalQuestions > 0 ? Math.round((correctCount / effectiveTotalQuestions) * 100) : 0;
    }

    if (isAbandoned) {
      const completionRatio = Math.min(totalAnswered / Math.max(effectiveTotalQuestions, 1), 1);
      overallScore = Math.round(overallScore * completionRatio);
    }

    // Calcular puntajes por nivel CEFR ponderando también por macro-habilidades
    const levelScores: Record<CEFRLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0 };
    (["A1", "A2", "B1", "B2"] as CEFRLevel[]).forEach((lvl) => {
      const lvlAnswers = this.answers.filter((a) => a.level === lvl);
      if (lvlAnswers.length > 0) {
        const lvlComps = (["Reading", "Writing", "Speaking", "Listening"] as Competency[]).filter(
          (c) => lvlAnswers.some((a) => a.competency === c)
        );
        if (lvlComps.length > 0) {
          const compScoresLvl = lvlComps.map((c) => {
            const ansInComp = lvlAnswers.filter((a) => a.competency === c);
            const sumScores = ansInComp.reduce((acc, curr) => acc + curr.scoreAwarded, 0);
            return sumScores / ansInComp.length;
          });
          levelScores[lvl] = Math.round(compScoresLvl.reduce((a, b) => a + b, 0) / lvlComps.length);
        } else {
          const correct = lvlAnswers.filter((a) => a.isCorrect).length;
          const denominator = isAbandoned && lvl === this.currentLevel ? Math.max(lvlAnswers.length, plannedLevelQuestions) : lvlAnswers.length;
          levelScores[lvl] = Math.round((correct / denominator) * 100);
        }
      }
    });

    // Nivel final alcanzado (si aprueba el umbral del nivel, un fallo aislado no lo reprueba)
    let finalLevel: string = "Sin Nivel";
    let passed = false;
    let character = "No Presentado";

    if (isAbandoned) {
      finalLevel = "Incompleto";
      character = "Incompleto";
      passed = false;
    } else if (totalAnswered === 0 || (correctCount === 0 && overallScore === 0)) {
      finalLevel = "Sin Nivel";
      character = "No Presentado";
      passed = false;
    } else if (levelScores.B2 >= LEVEL_PASS_THRESHOLDS.B2) {
      finalLevel = "B2";
      character = "Experto";
      passed = true;
    } else if (levelScores.B1 >= LEVEL_PASS_THRESHOLDS.B1) {
      finalLevel = "B1";
      character = "Avanzado";
      passed = true;
    } else if (levelScores.A2 >= LEVEL_PASS_THRESHOLDS.A2) {
      finalLevel = "A2";
      character = "Intermedio";
      passed = true;
    } else if (overallScore >= (LEVEL_PASS_THRESHOLDS.A1 || 60)) {
      finalLevel = "A1";
      character = "Principiante";
      passed = true;
    } else if (overallScore >= 20 || correctCount > 0) {
      finalLevel = "A1";
      character = "Principiante";
      passed = false;
    } else {
      finalLevel = "Sin Nivel";
      character = "No Presentado";
      passed = false;
    }

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
      totalQuestions: isAbandoned ? effectiveTotalQuestions : totalAnswered,
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
