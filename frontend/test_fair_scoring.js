// frontend/test_fair_scoring.js
// Script de prueba unitaria para verificación de FASE 1 y FASE 2

import assert from "node:assert";

// Normalizador idéntico al de isOptionAnswerCorrect
function normalize(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
    .replace(/\s+/g, " ");
}

function isOptionAnswerCorrect(optionIndex, question) {
  const opts = question.options || [];
  if (optionIndex < 0 || optionIndex >= opts.length) return false;

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

  const selectedText = normalize(opts[optionIndex]);

  if (typeof question.correctAnswer === "string") {
    const expected = normalize(question.correctAnswer);
    if (selectedText === expected && selectedText.length > 0) return true;
  }

  if (question.correctAnswerText) {
    const expected = normalize(question.correctAnswerText);
    if (selectedText === expected && selectedText.length > 0) return true;
  }

  if (question.wordId) {
    const expected = normalize(question.wordId);
    if (selectedText === expected && selectedText.length > 0) return true;
  }

  return false;
}

function calculateWeightedScore(answers) {
  const compScores = { Reading: 0, Writing: 0, Speaking: 0, Listening: 0 };
  const competencies = ["Reading", "Writing", "Speaking", "Listening"];

  competencies.forEach((c) => {
    const cAnswers = answers.filter((a) => a.competency === c);
    if (cAnswers.length > 0) {
      const sum = cAnswers.reduce((acc, curr) => acc + (curr.isCorrect ? 100 : 0), 0);
      compScores[c] = Math.round(sum / cAnswers.length);
    }
  });

  const active = competencies.filter((c) => answers.some((a) => a.competency === c));
  if (active.length === 0) return 0;
  return Math.round(active.reduce((acc, c) => acc + compScores[c], 0) / active.length);
}

// ── Test 1: Cotejo flexible de respuestas ────────────────────────────────────
console.log("-> Ejecutando Test 1: Comparación de respuesta correcta (índices, mayúsculas, espacios, sintaxis)...");
const qSentence = {
  options: [
    "The middleware validates the authentication token before the request.",
    "The authentication validates the request middleware before token the.",
    "Before validates the middleware request token the authentication.",
  ],
  correctAnswer: "The middleware validates the authentication token before the request.",
  correctAnswerText: "The middleware validates the authentication token before the request",
};

assert.strictEqual(isOptionAnswerCorrect(0, qSentence), true, "Debe coincidir por texto normalizado");
assert.strictEqual(isOptionAnswerCorrect(1, qSentence), false, "Opción incorrecta no debe aprobar");

const qNumericString = {
  options: ["Option A", "Option B", "Option C"],
  correctAnswer: "1",
};
assert.strictEqual(isOptionAnswerCorrect(1, qNumericString), true, "Debe soportar string numérico '1'");

// ── Test 2: Ponderación justa y fallo aislado no reprueba ───────────────────
console.log("-> Ejecutando Test 2: Fallo aislado no debe reprobar...");
const answersWithIsolatedFail = [
  // Reading: 2 de 2 correctas = 100%
  { competency: "Reading", isCorrect: true },
  { competency: "Reading", isCorrect: true },
  // Writing: 1 correcta y 1 fallada = 50%
  { competency: "Writing", isCorrect: true },
  { competency: "Writing", isCorrect: false },
  // Listening: 1 de 1 correcta = 100%
  { competency: "Listening", isCorrect: true },
  // Speaking: 1 de 1 correcta = 100%
  { competency: "Speaking", isCorrect: true },
];

const weightedScore = calculateWeightedScore(answersWithIsolatedFail);
console.log(`   Puntaje ponderado por macro-habilidades: ${weightedScore}% (esperado: 88%)`);
assert.strictEqual(weightedScore, 88, "La media ponderada de (100+50+100+100)/4 debe ser 88%");
assert.ok(weightedScore >= 60, "El aprendiz aprueba con holgura frente al umbral del 60%");

// ── Test 3: Todas correctas -> 100% ─────────────────────────────────────────
console.log("-> Ejecutando Test 3: Respuestas perfectas -> 100%...");
const answersAllCorrect = [
  { competency: "Reading", isCorrect: true },
  { competency: "Writing", isCorrect: true },
  { competency: "Listening", isCorrect: true },
  { competency: "Speaking", isCorrect: true },
];
const perfectScore = calculateWeightedScore(answersAllCorrect);
assert.strictEqual(perfectScore, 100, "Debe dar 100% con respuestas correctas");

console.log("\n✅ Todas las pruebas de calificación justa pasaron satisfactoriamente (3/3).");
