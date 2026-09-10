import * as api from "./api";

/**
 * PREPARADO PARA MAS ADELANTE — todavia no esta conectado a QuizPage.tsx.
 *
 * Este archivo arma un banco de preguntas de opcion multiple a partir de las
 * palabras reales del Diccionario Digital (tabla DigitalDictionary /
 * buckets de Supabase), para el dia que se decida como integrarlo al quiz:
 * como modo nuevo "Quiz de Vocabulario" o mezclado con questionsA1..B2.
 *
 * Tipos de pregunta que arma:
 *  - "image": se muestra la imagen de la palabra, el estudiante elige el
 *    texto correcto entre 4 opciones.
 *  - "audio": se reproduce el audio de la palabra, el estudiante elige el
 *    texto correcto entre 4 opciones.
 *
 * Solo usa palabras que sí tengan imagen o audio cargado en Supabase.
 */

export interface VocabularyQuizQuestion {
  id: string;
  type: "image" | "audio";
  mediaUrl: string;
  correctAnswer: string;
  options: string[];
  definition?: string;
  subjectName?: string;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildOptions(correct: string, pool: string[], count = 4): string[] {
  const distractors = shuffle(pool.filter((word) => word !== correct)).slice(0, count - 1);
  return shuffle([correct, ...distractors]);
}

/**
 * Trae las palabras del diccionario y arma un banco de preguntas listo
 * para renderizar en un futuro componente de quiz de vocabulario.
 */
export async function getVocabularyQuizPool(): Promise<VocabularyQuizQuestion[]> {
  const words = await api.getDocuments();
  const allNames = words.map((w) => w.wordId || w.name).filter(Boolean) as string[];

  const questions: VocabularyQuizQuestion[] = [];

  words.forEach((word) => {
    const correct = word.wordId || word.name;
    if (!correct) return;

    if (word.imageUrl) {
      questions.push({
        id: `${word.id}-image`,
        type: "image",
        mediaUrl: word.imageUrl,
        correctAnswer: correct,
        options: buildOptions(correct, allNames),
        definition: word.definition,
        subjectName: word.subjectName,
      });
    }

    if (word.audioUrl) {
      questions.push({
        id: `${word.id}-audio`,
        type: "audio",
        mediaUrl: word.audioUrl,
        correctAnswer: correct,
        options: buildOptions(correct, allNames),
        definition: word.definition,
        subjectName: word.subjectName,
      });
    }
  });

  return shuffle(questions);
}