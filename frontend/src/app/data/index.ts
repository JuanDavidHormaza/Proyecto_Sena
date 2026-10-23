import { questionsA1, getLevelFromScore, getDifficultyLevel } from "./questionsA1";
import { questionsA2 } from "./questionsA2";
import { questionsB1 } from "./questionsB1";
import { questionsB2 } from "./questionsB2";

export const questions = [
  ...questionsA1,
  ...questionsA2,
  ...questionsB1,
  ...questionsB2,
];

export {
  questionsA1,
  questionsA2,
  questionsB1,
  questionsB2,
  getLevelFromScore,
  getDifficultyLevel,
};